import { useEffect, useId, useRef } from 'react';
import { prefersStill } from './Lazy3D';

/**
 * The mark above «малако» in the hero: one 8-second loop (the berg holds 2 s, then 6 s of movement), no letters.
 *
 * 1. A whole circle: a third of sky above, two thirds of sea below. The
 *    iceberg spans almost its full height: a white tip in the air and, under
 *    the water, a body already shaped like an upside-down glass (narrow at
 *    the waterline, widening as it goes down), in one solid dark blue that runs on past the
 *    bottom of the circle, so it reads deeper than it looks.
 * 2. The berg turns half a circle about (50, 55), just below the centre, so
 *    the glass it becomes lands in the middle; the water stays level.
 * 3. While it turns, the tip melts away as it goes under and the body's few
 *    ice corners slide straight: the same ice becomes a dark-blue glass whose
 *    inside lightens to pale blue, open at the top. The glass lands in place,
 *    standing in the water; it is drawn
 *    over the sea so nothing covers it.
 *    As it turns, the sea and its wave fade away: the glass ends up alone, still.
 * 4. Milk pours in (a borderless, swaying stream) and fills it: the dark part brightens.
 * 5. Everything fades, snaps back upright while unseen, and the berg returns.
 *
 * SMIL (<animate> inside the SVG), not CSS: the reshape animates the paths
 * themselves, which CSS cannot do in Safari, and one clock keeps the steps in
 * sync. Drawn in a 100×100 box, turning about (50, 55), waterline y = 34; the
 * berg is drawn in its own (turning) frame, so "deep" (y 90) becomes the rim.
 * With reduced motion it stays on step 1.
 */
/** The berg holds still for HOLD seconds, then the movement takes PLAY seconds. */
const HOLD = 2;
const PLAY = 6;
const DUR = `${HOLD + PLAY}s`;
/** Timeline stops are written as fractions of PLAY; this moves them after the opening hold. */
const at = (t: number) => (t === 0 || t === 1 ? t : (HOLD + t * PLAY) / (HOLD + PLAY));

// Berg (jagged ice) and glass (straight edges), corner for corner, in the turning frame.
const BERG_OUT = 'M40 34 L60 34 L66 52 L71 80 L64 104 L38 104 L29 82 L34 56 Z';
const GLASS_OUT = 'M40 34 L60 34 L62.9 52 L69 90 L56 90 L44 90 L31 90 L36.5 56 Z';
const BERG_IN = 'M44 40 L56 40 L62 54 L66 80 L60 100 L40 100 L34 81 L39 58 Z';
const GLASS_IN = 'M43 41 L57 41 L59.3 54 L65.5 90 L56 90 L44 90 L34.5 90 L40.1 58 Z';
const TIP = '41,34 47,20 51,10 56,22 60,34';
const TIP_SHADE = '51,10 56,22 60,34 54,34';
/** Upright, once the turn is done: the inside of the glass (for the milk). */
const GLASS_INSIDE_UP = 'M57 69 L43 69 L40.7 56 L34.5 20 L44 20 L56 20 L65.5 20 L59.9 52 Z';

const EASE = '.45 0 .55 1';

/** <animate> props from [time 0..1, value] stops; each step eases in and out. */
function anim(attributeName: string, stops: [number, string][]) {
  return {
    attributeName,
    dur: DUR,
    repeatCount: 'indefinite',
    calcMode: 'spline',
    keyTimes: stops.map(([t]) => +at(t).toFixed(4)).join(';'),
    values: stops.map(([, v]) => v).join(';'),
    keySplines: stops.slice(1).map(() => EASE).join(';'),
  } as const;
}

/** A value held at `a` until `from`, eased to `b` by `to`, held, and snapped back at the hidden moment (0.925–0.93). */
const swap = (a: string, b: string, from: number, to: number): [number, string][] => [[0, a], [from, a], [to, b], [0.925, b], [0.93, a], [1, a]];

// The timeline, in fractions of the 6 s movement (after the 2 s hold). The reshape starts as soon as the
// turn does and is done well before it (0.32 of 0.4), so the glass is whole before it stands.
const TURN: [number, string][] = [[0, '0 50 55'], [0.1, '0 50 55'], [0.4, '180 50 55'], [0.925, '180 50 55'], [0.93, '0 50 55'], [1, '0 50 55']];
const ALL: [number, string][] = [[0, '1'], [0.86, '1'], [0.92, '0'], [0.93, '0'], [1, '1']];
const TIP_ON = swap('1', '0', 0.17, 0.29);
/** Under the water the berg is one solid blue; as it becomes the glass its inside lightens and the walls stay dark. */
const ICE = '#1e4f7a';
const HEART = swap(ICE, '#e2f1fa', 0.12, 0.32);
const OUT_SHAPE = swap(BERG_OUT, GLASS_OUT, 0.12, 0.32);
const IN_SHAPE = swap(BERG_IN, GLASS_IN, 0.12, 0.32);
/** The milk stream is revealed from the top down, then its tail falls into the glass when the pour stops. */
const POUR_H: [number, string][] = [[0, '0'], [0.46, '0'], [0.51, '72'], [0.74, '72'], [0.79, '0'], [1, '0']];
const POUR_Y: [number, string][] = [[0, '-2'], [0.74, '-2'], [0.79, '70'], [0.8, '-2'], [1, '-2']];
/** The sea and its wave fade out while the berg turns, so the glass stands alone in stillness, and come back as it fades. */
const SEA_ON: [number, string][] = [[0, '1'], [0.16, '1'], [0.42, '0'], [0.86, '0'], [0.96, '1'], [1, '1']];
const MILK_Y = swap('69', '23', 0.49, 0.74);
const MILK_H = swap('0', '46', 0.49, 0.74);

/** The stream: no outline, a little wider where it leaves the jug, swaying between two curves. */
const STREAM_A = 'M47.2 -2 C47.6 20 48.6 40 48.9 68.4 L51.1 68.4 C51.3 40 52.2 20 52.6 -2 Z';
const STREAM_B = 'M47.7 -2 C47.2 20 48.9 40 49.1 68.4 L51.3 68.4 C51.7 40 51.8 20 53.1 -2 Z';

/** A wave across twice the width, so sliding it by one period loops seamlessly. */
const WAVE = (() => {
  let d = 'M-20 34';
  for (let x = -20; x < 120; x += 20) d += ' q5 -2.4 10 0 t10 0';
  return d;
})();

export default function HeroMark({ className = '' }: { className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const svgRef = useRef<SVGSVGElement>(null);
  const still = prefersStill();
  const ring = `ib-mark-ring-${id}`;
  const inside = `ib-mark-inside-${id}`;
  const sky = `ib-mark-sky-${id}`;
  const sea = `ib-mark-sea-${id}`;
  const still2 = `ib-mark-still-${id}`;
  const pour = `ib-mark-pour-${id}`;

  // An inline SVG's clock starts with the document, so a mark mounted later would join mid-loop: start it at the berg.
  useEffect(() => {
    try { svgRef.current?.setCurrentTime(0); } catch { /* no SMIL clock: nothing to reset */ }
  }, []);

  return (
    <svg ref={svgRef} className={`ib-mark ${className}`} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={ring}>
          <circle cx="50" cy="50" r="47" />
        </clipPath>
        <clipPath id={inside}>
          <path d={GLASS_INSIDE_UP} />
        </clipPath>
        <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f5f8fa" />
          <stop offset="1" stopColor="#cfe6f3" />
        </linearGradient>
        <clipPath id={pour}>
          <rect x="0" y="-2" width="100" height="0">
            {!still && <animate {...anim('y', POUR_Y)} />}
            {!still && <animate {...anim('height', POUR_H)} />}
          </rect>
        </clipPath>
        <linearGradient id={still2} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bcd9eb" />
          <stop offset="1" stopColor="#86b6d6" />
        </linearGradient>
        <linearGradient id={sea} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5fa8cf" />
          <stop offset="1" stopColor="#0d2c47" />
        </linearGradient>
      </defs>

      <g clipPath={`url(#${ring})`}>
        {/* the still backdrop the glass is left on once the water has gone */}
        <rect width="100" height="100" fill={`url(#${still2})`} />
        <g>
          {!still && <animate {...anim('opacity', SEA_ON)} />}
          <rect width="100" height="34" fill={`url(#${sky})`} />
          <rect y="34" width="100" height="66" fill={`url(#${sea})`} />
          <path d={WAVE} fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round">
            {!still && <animateTransform attributeName="transform" type="translate" values="0 0;-20 0" dur="2s" repeatCount="indefinite" />}
          </path>
        </g>

        <g>
          {!still && <animate {...anim('opacity', ALL)} />}
          {/* the berg, turning; its ice becomes the glass and its dark heart the glass's inside */}
          <g>
            {!still && <animateTransform {...anim('transform', TURN)} type="rotate" />}
            <path d={BERG_OUT} fill={ICE}>
              {!still && <animate {...anim('d', OUT_SHAPE)} />}
            </path>
          </g>
          <g>
            {!still && <animateTransform {...anim('transform', TURN)} type="rotate" />}
            <path d={BERG_IN} fill={ICE}>
              {!still && <animate {...anim('d', IN_SHAPE)} />}
              {!still && <animate {...anim('fill', HEART)} />}
            </path>
            <g>
              {!still && <animate {...anim('opacity', TIP_ON)} />}
              <polygon points={TIP} fill="#ffffff" />
              <polygon points={TIP_SHADE} fill="#cfe2ee" />
            </g>
          </g>

          {/* upright from here on: the milk inside the glass */}
          <g clipPath={`url(#${inside})`}>
            <rect x="20" y="69" width="60" height="0" fill="#ffffff">
              {!still && <animate {...anim('y', MILK_Y)} />}
              {!still && <animate {...anim('height', MILK_H)} />}
            </rect>
          </g>
        </g>

        <g clipPath={`url(#${pour})`}>
          <path d={STREAM_A} fill="#ffffff">
            {!still && <animate attributeName="d" values={`${STREAM_A};${STREAM_B};${STREAM_A}`} dur=".6s" repeatCount="indefinite" />}
          </path>
        </g>
      </g>

      <circle cx="50" cy="50" r="47" fill="none" stroke={ICE} strokeWidth="2.6" />
    </svg>
  );
}
