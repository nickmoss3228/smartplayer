import { useEffect, useRef, useState } from 'react';
import { canSpeak, hush, say } from './speech';

/**
 * The first fix as a picture: four words that are hard to read and to spell
 * turn, one after another, into what they really are to the ear. The written
 * word dissolves into atoms, its pixels blowing outward and drifting off
 * (turning green as they go), and a waveform is born where it stood; then the
 * atoms fly back, the word re-forms and the loop starts over. Slow on purpose,
 * so the blast can be watched.
 *
 * Drawn on one canvas per tile: the word is rasterised once and every couple of
 * pixels of ink become an atom with its own seeded direction, speed and start
 * time (the blast sweeps left to right). Each word has its own waveform, built
 * from rough segments of its real sound (General American): vowels swell,
 * fricatives and bursts are low noise, stops are short gaps, so no two look
 * alike. The loop runs only while the tiles are on screen; with reduced motion
 * each tile shows the word over its waveform, still. Each tile says its word
 * when pressed. The words are language data, so they stay in code.
 */

/** A piece of a word's sound: a vowel or sonorant (swells), noise (fricative/burst), or a gap (stop closure). */
type Seg = [kind: 'v' | 'n' | 'g', len: number, amp: number];
const WORDS: { w: string; segs: Seg[] }[] = [
  // θ ɔ t
  { w: 'thought', segs: [['n', 0.22, 0.28], ['v', 0.5, 1], ['g', 0.1, 0], ['n', 0.1, 0.42]] },
  // k j u k ʌ m b ɚ
  { w: 'cucumber', segs: [['n', 0.05, 0.45], ['v', 0.24, 1], ['g', 0.05, 0], ['n', 0.04, 0.4], ['v', 0.17, 0.62], ['v', 0.1, 0.38], ['g', 0.04, 0], ['v', 0.24, 0.5]] },
  // k ɝ n ə l
  { w: 'colonel', segs: [['n', 0.06, 0.4], ['v', 0.42, 0.95], ['v', 0.14, 0.42], ['v', 0.3, 0.58]] },
  // k w aɪ ɚ
  { w: 'choir', segs: [['n', 0.07, 0.5], ['v', 0.12, 0.5], ['v', 0.46, 1], ['v', 0.35, 0.55]] },
];

/** One loop, in ms, and how far each tile's loop is shifted from the one before. */
const LOOP = 11000;
const STAGGER = 700;
/** The loop's timeline, as fractions of LOOP. */
const T = { blast: 0.14, blastLen: 0.34, waveIn: 0.36, waveFull: 0.5, waveOut: 0.8, back: 0.8, backLen: 0.18 };

/** A steady pseudo-random 0–1 sequence. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1103515245 + 12345) >>> 0;
    return (s >>> 8) / 0xffffff;
  };
}
const hash = (w: string) => [...w].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Bar heights (0–1) for a word's waveform, `n` bars wide. */
function waveBars(word: string, segs: Seg[], n: number): number[] {
  const rnd = seeded(hash(word) ^ 0x9e37);
  const total = segs.reduce((s, x) => s + x[1], 0);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const x = ((i + 0.5) / n) * total;
    let acc = 0;
    let h = 0.04;
    for (const [kind, len, amp] of segs) {
      if (x < acc + len) {
        const local = (x - acc) / len;
        if (kind === 'v') h = amp * (0.2 + 0.8 * Math.sin(Math.PI * local) ** 0.7) * (0.82 + 0.18 * rnd());
        else if (kind === 'n') h = amp * (0.35 + 0.65 * rnd());
        break;
      }
      acc += len;
    }
    out.push(Math.max(0.04, h));
  }
  return out;
}

interface Atom { x: number; y: number; vx: number; vy: number; delay: number; tint: number; size: number }

/** Atoms of a word: every `step` css px of ink becomes one, set to fly away from the word's middle. */
function atomise(word: string, font: string, w: number, h: number, step: number, scale: number): Atom[] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  if (!g) return [];
  g.font = font;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#000';
  g.fillText(word, w / 2, h / 2);
  const data = g.getImageData(0, 0, w, h).data;
  const rnd = seeded(hash(word));
  const atoms: Atom[] = [];
  let minX = w;
  let maxX = 0;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      if (data[(Math.floor(y) * w + Math.floor(x)) * 4 + 3] > 110) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        atoms.push({ x, y, vx: 0, vy: 0, delay: 0, tint: 0, size: step });
      }
    }
  }
  const span = Math.max(1, maxX - minX);
  for (const a of atoms) {
    const angle = Math.atan2((a.y - h / 2) * 2.2 + (rnd() - 0.5) * 30 * scale, a.x - w / 2 + (rnd() - 0.5) * 40 * scale);
    const speed = (26 + rnd() * 70) * scale;
    a.vx = Math.cos(angle) * speed;
    a.vy = Math.sin(angle) * speed - (10 + rnd() * 18) * scale; // a little lift, like smoke
    a.delay = ((a.x - minX) / span) * 0.55 + rnd() * 0.3; // the blast sweeps left to right
    a.tint = rnd();
  }
  return atoms;
}

type Tile = { ctx: CanvasRenderingContext2D; w: number; h: number; dpr: number; word: string; atoms: Atom[]; bars: number[]; font: string; ink: string; green: string };

function drawWord(t: Tile, cy = t.h / 2) {
  const { ctx } = t;
  ctx.font = t.font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = t.ink;
  ctx.fillText(t.word, t.w / 2, cy, t.w * 0.9); // never wider than the tile, whatever the font did
}

function drawWave(t: Tile, grow: number, wobble: number, cy = t.h / 2, scale = 1) {
  const { ctx, w, h, bars } = t;
  const width = w * 0.8;
  const bw = width / bars.length;
  const x0 = (w - width) / 2;
  ctx.fillStyle = t.green;
  bars.forEach((b, k) => {
    const bh = Math.max(1.5, b * h * 0.72 * scale * grow * (1 + 0.08 * Math.sin(wobble + k * 0.7)));
    ctx.beginPath();
    ctx.roundRect(x0 + k * bw + bw * 0.2, cy - bh / 2, bw * 0.6, bh, Math.min(1.5, bw * 0.3));
    ctx.fill();
  });
}

/** The atoms at blast progress `p` (0 = the word whole, 1 = all flown). */
function drawAtoms(t: Tile, p: number) {
  const { ctx } = t;
  for (const a of t.atoms) {
    const local = clamp((p - a.delay * 0.55) / 0.45);
    if (local >= 1) continue;
    if (local <= 0) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = t.ink;
      ctx.fillRect(a.x, a.y, a.size * 0.95, a.size * 0.95);
      continue;
    }
    const e = easeOut(local);
    const size = a.size * (1.05 * (1 - local * 0.6) + a.tint * 0.35);
    ctx.globalAlpha = (1 - local) ** 1.3;
    ctx.fillStyle = local > 0.25 + a.tint * 0.3 ? t.green : t.ink;
    ctx.fillRect(a.x + a.vx * e, a.y + a.vy * e + 0.7 * a.size * 10 * local * local, size, size);
  }
  ctx.globalAlpha = 1;
}

export default function AudioWords() {
  const [playing, setPlaying] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => () => hush(), []);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    let visible = false;
    const start = performance.now();
    let tiles: Tile[] = [];

    const setup = () => {
      tiles = [];
      canvasRefs.current.forEach((cv, i) => {
        if (!cv) return;
        const r = cv.getBoundingClientRect();
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = Math.max(1, Math.round(r.width));
        const h = Math.max(1, Math.round(r.height));
        cv.width = w * dpr;
        cv.height = h * dpr;
        const ctx = cv.getContext('2d');
        if (!ctx) return;
        const cs = getComputedStyle(cv);
        // the CSS size is the most we want; shrink (all tiles alike) only if the longest word would not fit
        ctx.font = `800 100px ${cs.fontFamily}`;
        const widest = Math.max(...WORDS.map((x) => ctx.measureText(x.w).width)) / 100;
        const fit = Math.min(parseFloat(cs.fontSize), (w * 0.8) / widest, h * 0.56);
        const px = Math.floor(still ? fit * 0.6 : fit) - 2; // still: the word shares the tile with its waveform
        const font = `800 ${px}px ${cs.fontFamily}`;
        const { w: word, segs } = WORDS[i];
        tiles[i] = {
          ctx, w, h, dpr, word, font,
          ink: cs.color,
          green: cs.getPropertyValue('--green').trim() || '#00c951',
          atoms: atomise(word, font, w, h, Math.max(1.5, px / 17), px / 20),
          bars: waveBars(word, segs, Math.max(14, Math.floor((w * 0.8) / 5))),
        };
      });
    };

    const render = (now: number) => {
      frame = 0;
      tiles.forEach((t, i) => {
        if (!t) return;
        const { ctx, w, h, dpr } = t;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        if (still) {
          drawWord(t, h * 0.32);
          drawWave(t, 1, 0, h * 0.74, 0.5);
          return;
        }
        const ph = ((((now - start - i * STAGGER) % LOOP) + LOOP) % LOOP) / LOOP;
        if (ph < T.blast || ph >= T.back + T.backLen) drawWord(t);
        else if (ph < T.blast + T.blastLen) drawAtoms(t, (ph - T.blast) / T.blastLen);
        else if (ph >= T.back) drawAtoms(t, 1 - easeInOut((ph - T.back) / T.backLen));
        if (ph > T.waveIn && ph < T.waveOut + 0.06) {
          const grow = ph < T.waveFull ? easeOut((ph - T.waveIn) / (T.waveFull - T.waveIn)) : ph > T.waveOut ? 1 - clamp((ph - T.waveOut) / 0.06) : 1;
          drawWave(t, grow, now / 260 + i);
        }
      });
      if (visible && !still) frame = requestAnimationFrame(render);
    };

    const redo = () => { setup(); render(performance.now()); };
    redo();

    const io = new IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting);
      if (visible && !frame && !still) frame = requestAnimationFrame(render);
    });
    io.observe(list);
    const ro = new ResizeObserver(redo);
    ro.observe(list);
    // the canvas measures the word to fit it; a heavy face that loads later is wider than the fallback
    // it was measured in, so wait for that exact face (nothing else on the page may have asked for it)
    let alive = true;
    const whenFont = async () => {
      const cv = canvasRefs.current.find(Boolean);
      if (!cv || !document.fonts) return;
      const cs = getComputedStyle(cv);
      await document.fonts.load(`800 ${cs.fontSize} ${cs.fontFamily}`, WORDS.map((x) => x.w).join(''));
      await document.fonts.ready;
      if (alive) redo();
    };
    whenFont().catch(() => {});

    return () => {
      alive = false;
      io.disconnect();
      ro.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <ul ref={listRef} className="dv-aw" aria-label={WORDS.map((x) => x.w).join(', ')}>
      {WORDS.map(({ w }, i) => {
        const canvas = <canvas ref={(el) => { canvasRefs.current[i] = el; }} className="dv-aw-canvas" aria-hidden="true" />;
        return (
          <li key={w} className="dv-aw-tile">
            {canSpeak ? (
              <button type="button" className={`dv-aw-btn${playing === w ? ' ib-playing' : ''}`} aria-label={w}
                onClick={() => { setPlaying(w); say(w, 'en-US', () => setPlaying((p) => (p === w ? null : p))); }}>
                {canvas}
              </button>
            ) : (
              <span className="dv-aw-btn" role="img" aria-label={w}>{canvas}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
