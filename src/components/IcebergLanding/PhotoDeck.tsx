import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { SLIDES, SlideFrame, useOnScreen, useSlideText } from './FeatureCarousel';

/**
 * The feature slides as photographs in one 3D space, swiped through by hand:
 * a row, the print in the middle facing you, its neighbours turned away and set
 * back on either side (chosen 2026-11-15 over a pile and a fly-through).
 *
 * One swipe position (a float: 1.4 is 40% of the way from print 2 to 3) places
 * every print; dragging moves it, letting go settles it on a whole number. The
 * space tilts a little under the mouse, so prints at different depths shift
 * against each other. Only the print in the middle plays its scene.
 */

const mod = (a: number, n: number) => ((a % n) + n) % n;

interface Pose { x: number; z: number; ry: number; dim: number; o: number }

/** Where print `i` is when the swipe is at `pos`; `w` is a print's width, the unit of the sideways moves. */
function place(i: number, pos: number, w: number): Pose {
  const d = i - pos;
  const a = Math.abs(d);
  const near = Math.min(a, 1);
  const far = Math.max(a - 1, 0);
  return { x: Math.sign(d) * (near * w * 0.78 + far * w * 0.32), z: -near * 190 - far * 70, ry: -Math.sign(d) * near * 46, dim: Math.min(0.55, a * 0.3), o: Math.max(0, Math.min(1, (2.6 - a) / 0.6)) };
}

const still = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function PhotoDeck() {
  const { t } = useTranslation();
  const textOf = useSlideText();
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLUListElement>(null);
  const cards = useRef<(HTMLLIElement | null)[]>([]);
  const pos = useRef(0);
  const anim = useRef(0);
  const drag = useRef<{ id: number; x: number; y: number; from: number; on: boolean; lastX: number; lastT: number; v: number } | null>(null);
  const dragged = useRef(false);
  const [active, setActive] = useState(0);
  const onScreen = useOnScreen(rootRef);
  const n = SLIDES.length;
  const pad = (v: number) => String(v).padStart(2, '0');

  const unit = () => Math.min(300, (stageRef.current?.clientWidth ?? 300) * 0.62);

  const render = useCallback(() => {
    const w = unit();
    cards.current.forEach((el, i) => {
      if (!el) return;
      const p = place(i, pos.current, w);
      el.style.transform = `translate(-50%, -50%) translate3d(${p.x.toFixed(1)}px, 0, ${p.z.toFixed(1)}px) rotateY(${p.ry.toFixed(2)}deg)`;
      el.style.opacity = p.o.toFixed(3);
      el.style.pointerEvents = p.o < 0.5 ? 'none' : '';
      el.style.setProperty('--dim', p.dim.toFixed(3));
    });
    const a = mod(Math.round(pos.current), n);
    setActive((prev) => (prev === a ? prev : a));
  }, [n]);

  const settle = useCallback((target: number) => {
    cancelAnimationFrame(anim.current);
    if (still()) { pos.current = target; render(); return; }
    const from = pos.current;
    const start = performance.now();
    const step = (now: number) => {
      const u = Math.min(1, (now - start) / 520);
      pos.current = from + (target - from) * (1 - (1 - u) ** 3);
      render();
      if (u < 1) anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);
  }, [render]);

  // Lay the prints out, and again whenever the stage changes width.
  useEffect(() => {
    render();
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(render);
    ro.observe(stage);
    return () => { ro.disconnect(); cancelAnimationFrame(anim.current); };
  }, [render]);

  const goTo = (i: number) => settle(mod(i, n));
  /** The next or the previous print; past either end it goes round to the other. */
  const step = (by: number) => goTo(Math.round(pos.current) + by);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button) return;
    cancelAnimationFrame(anim.current);
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, from: pos.current, on: false, lastX: e.clientX, lastT: e.timeStamp, v: 0 };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const stage = stageRef.current;
    const d = drag.current;
    if (!stage) return;
    if (!d) {
      // not dragging: the space leans towards the mouse
      if (e.pointerType !== 'mouse' || still()) return;
      const r = stage.getBoundingClientRect();
      worldRef.current?.style.setProperty('--ry', `${(((e.clientX - r.left) / r.width - 0.5) * 12).toFixed(2)}deg`);
      worldRef.current?.style.setProperty('--rx', `${((0.5 - (e.clientY - r.top) / r.height) * 9).toFixed(2)}deg`);
      return;
    }
    const dx = e.clientX - d.x;
    if (!d.on) {
      if (Math.abs(dx) < 8) return;
      // a vertical move is the page scrolling, not a swipe
      if (Math.abs(e.clientY - d.y) > Math.abs(dx)) { drag.current = null; return; }
      d.on = true;
      dragged.current = true;
      stage.setPointerCapture(d.id);
      stage.classList.add('is-drag');
    }
    const dt = Math.max(1, e.timeStamp - d.lastT);
    d.v = 0.7 * ((e.clientX - d.lastX) / dt) + 0.3 * d.v;
    d.lastX = e.clientX;
    d.lastT = e.timeStamp;
    let p = d.from - dx / unit();
    // past either end of the row the prints resist
    p = p < 0 ? p * 0.3 : p > n - 1 ? n - 1 + (p - n + 1) * 0.3 : p;
    pos.current = p;
    render();
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    stageRef.current?.classList.remove('is-drag');
    if (!d?.on) { if (d) settle(Math.round(pos.current)); return; }
    // a flick carries on; one swipe moves one print at most
    const home = Math.round(d.from);
    let target = Math.round(pos.current - (d.v * 180) / unit());
    target = Math.max(home - 1, Math.min(home + 1, target));
    settle(Math.max(0, Math.min(n - 1, target)));
    setTimeout(() => { dragged.current = false; }, 0);
  };
  const onPointerLeave = () => {
    worldRef.current?.style.setProperty('--ry', '0deg');
    worldRef.current?.style.setProperty('--rx', '0deg');
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
  };

  return (
    <div ref={rootRef} className={`pd${onScreen ? ' fc-run' : ''}`} role="region" aria-roledescription="carousel"
      aria-label={t('iceberg.steps.more.label')} tabIndex={0} onKeyDown={onKeyDown}>
      <div className="pd-copy" aria-live="polite">
        {SLIDES.map((s, i) => {
          const text = textOf(s);
          return (
            <div key={s.kind} className={i === active ? 'is-on' : undefined} aria-hidden={i !== active}>
              <p className="fc-count">{`${pad(i + 1)} / ${pad(n)}`}</p>
              <h4 className="fc-title">{text.title}</h4>
              <p className="fc-text">{text.text}</p>
            </div>
          );
        })}
      </div>
      <div ref={stageRef} className="pd-stage" onPointerDown={onPointerDown} onPointerMove={onPointerMove}
        onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onPointerLeave={onPointerLeave}>
        <ul ref={worldRef} className="pd-world">
          {SLIDES.map((s, i) => (
            <li key={s.kind} ref={(el) => { cards.current[i] = el; }} className={`fc-photo${i === active ? ' is-on' : ''}`}
              aria-hidden={i !== active} onClick={() => { if (!dragged.current && i !== active) goTo(i); }}>
              <SlideFrame s={s} alt={textOf(s).title} />
            </li>
          ))}
        </ul>
      </div>
      <div className="fc-nav">
        <button type="button" className="fc-arrow" onClick={() => step(-1)} aria-label={t('iceberg.steps.more.prev')}>
          <ChevronLeftIcon aria-hidden="true" />
        </button>
        <div className="fc-dots">
          {SLIDES.map((s, i) => (
            <button key={s.kind} type="button" className={`fc-dot${i === active ? ' is-on' : ''}`} onClick={() => goTo(i)}
              aria-label={`${i + 1} / ${n}`} aria-current={i === active ? 'true' : undefined} />
          ))}
        </div>
        <button type="button" className="fc-arrow" onClick={() => step(1)} aria-label={t('iceberg.steps.more.next')}>
          <ChevronRightIcon aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
