import { useEffect, useState, type RefObject } from 'react';

/**
 * A run of numbered stops as a bar pinned under the navbar: the four layers of
 * the iceberg on the way down, the five steps on the way up. It slides in when
 * the first stop (or the element named by `from`) reaches the top of the screen
 * and stays, until the element
 * named by `until` (the next bar's section) reaches the top, so the steps' bar
 * takes over from the layers' one. The stop being read is lit (green number,
 * dark name), the ones above it are marked passed, and once the reader is below
 * the last stop all show as passed. A press scrolls to that stop.
 *
 * Each stop is painted in its own water (`colors`, one per stop): light to deep
 * on the way down, deep to light on the way up. A light patch takes dark text.
 * The stop being read also grows: a wider patch and a larger name, the others
 * shrink to make room.
 */

/** Dark text on light water, white on dark (by perceived brightness). */
function inkOn(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? 'var(--sea)' : '#fff';
}

interface Stop {
  ref: RefObject<HTMLElement | null>;
  label: string;
}

/** Where on the screen a layer counts as "being read": this far down from the top. */
const READ_LINE = 0.4;

export default function LayerBar({ stops, colors, label, from, until }: { stops: Stop[]; colors: readonly string[]; label: string; from?: string; until?: string }) {
  const [shown, setShown] = useState(false);
  /** The layer being read, or `stops.length` once the reader is past them all. */
  const [active, setActive] = useState(0);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const els = stops.map((s) => s.ref.current);
      if (els.some((el) => !el)) return;
      const rects = (els as HTMLElement[]).map((el) => el.getBoundingClientRect());
      const line = window.innerHeight * READ_LINE;
      const next = until ? document.querySelector(until) : null;
      const start = from ? document.querySelector(from) : null;
      const startTop = start ? start.getBoundingClientRect().top : rects[0].top;
      setShown(startTop <= 140 && !(next && next.getBoundingClientRect().top <= 140));
      let i = 0;
      rects.forEach((r, k) => { if (r.top <= line) i = k; });
      if (rects[rects.length - 1].bottom < line) i = stops.length;
      setActive(i);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(measure); };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
    // The refs are stable for the life of the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = (i: number) => {
    const el = stops[i].ref.current;
    if (!el) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const top = el.getBoundingClientRect().top + window.scrollY - 110;
    window.scrollTo({ top, behavior: still ? 'auto' : 'smooth' });
  };

  return (
    <nav className={`dv-layers${shown ? ' on' : ''}`} aria-label={label} aria-hidden={!shown}>
      <ol className="dv-layers-list" style={{ ['--n' as string]: stops.length }}>
        {stops.map((s, i) => (
          <li key={i} className={i === active ? 'on' : undefined} style={{ background: colors[i], color: inkOn(colors[i]) }}>
            <button
              type="button"
              className={`dv-layers-item${i === active ? ' on' : ''}${i < active ? ' past' : ''}`}
              onClick={() => go(i)}
              aria-current={i === active ? 'step' : undefined}
              tabIndex={shown ? 0 : -1}
            >
              <span className="dv-layers-label">{s.label}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
