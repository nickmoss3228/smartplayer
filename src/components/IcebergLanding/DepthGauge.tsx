import { useEffect, useState, type RefObject } from 'react';

/**
 * Where you are: a rail on the left edge (a bar at the bottom on phones) with
 * numbered stops, the current one lit and a rope filled down to it. It shows
 * only while the middle of the screen is between the first stop's top and the
 * last stop's bottom, so two gauges (the four layers going down, the five
 * steps coming up) never show at once. A press scrolls to that stop.
 *
 * `end` adds a mark after the last stop: "surface" for the way up.
 */

interface Stop {
  ref: RefObject<HTMLElement | null>;
  label: string;
}

export default function DepthGauge({ stops, label, end }: { stops: Stop[]; label: string; end?: 'surface' }) {
  const [active, setActive] = useState(-1);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const els = stops.map((s) => s.ref.current);
      if (els.some((el) => !el)) return;
      const mid = window.innerHeight / 2;
      const rects = (els as HTMLElement[]).map((el) => el.getBoundingClientRect());
      if (rects[0].top > mid || rects[rects.length - 1].bottom < mid) {
        setActive(-1);
        return;
      }
      let i = 0;
      rects.forEach((r, k) => { if (r.top <= mid) i = k; });
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
    const top = el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.18;
    window.scrollTo({ top, behavior: still ? 'auto' : 'smooth' });
  };

  const shown = active >= 0;
  return (
    <nav className={`dv-gauge${shown ? ' on' : ''}`} aria-label={label} aria-hidden={!shown}>
      {/* the rope down the rail fills to the current stop */}
      <ol className="dv-gauge-list" style={{ ['--p' as string]: Math.max(active, 0) / Math.max(stops.length - 1, 1) }}>
        {stops.map((s, i) => (
          <li key={i}>
            <button
              type="button"
              className={`dv-gauge-item${i === active ? ' on' : ''}${i < active ? ' past' : ''}`}
              onClick={() => go(i)}
              aria-current={i === active ? 'step' : undefined}
              tabIndex={shown ? 0 : -1}
            >
              <span className="dv-gauge-n">{i + 1}</span>
              <span className="dv-gauge-label">{s.label}</span>
            </button>
          </li>
        ))}
      </ol>
      {end === 'surface' && (
        <svg className="dv-gauge-end" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="8" r="3.5" />
          <path d="M3 17c3 0 3-2 6-2s3 2 6 2 3-2 6-2" />
        </svg>
      )}
      {/* phones: the numbers only, and the current stop's name beside them */}
      <span className="dv-gauge-now">{shown ? stops[active].label : ''}</span>
    </nav>
  );
}
