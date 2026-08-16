import { useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * A glass of milk whose fill level *is* the difficulty: skim splash for Easy,
 * brim-full cream for Hard. Selecting a level pours it.
 *
 * Drawn in the same flat line-art language as BrandMark — white body, black
 * outline — so the level picker and the logo read as one family.
 *
 * Everything that moves here moves via `transform` only (the wave translates
 * on x, the fill translates on y). Deliberately no `filter:` on any animated
 * node: see the note in Homepage/WhyClouds/Cloud.tsx, where a per-frame blur
 * was smooth on desktop and visibly choppy on an iPhone 12.
 */

// Tapered tumbler. Symmetric about x=50: top rim 14→86, base 26→74, with a
// 9px radius on the bottom corners.
const GLASS = 'M14 8 L26 145 a9 9 0 0 0 9 8 h30 a9 9 0 0 0 9 -8 L86 8 Z';

// The milk surface. 200 units wide with a 50-unit period, so translating it
// exactly -50 on x returns it to an identical position — the loop has no seam.
// It drops to y=200 so the body below the surface always covers the glass.
const WAVE =
  'M-50 0 q12.5 -3 25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 L150 200 L-50 200 Z';

// Interior span the fill maps onto.
const TOP = 10;
const BOTTOM = 150;

/** Milk is white. It does not change per level — the glass does. */
const MILK = '#ffffff';

type Props = {
  /** 0 = empty, 1 = brim-full. */
  fill: number;
  selected: boolean;
  className?: string;
  /** Carries the level accent in as `color`; the glass paints from it. */
  style?: React.CSSProperties;
};

/**
 * Note the empty part of the glass carries a faint wash of the level colour.
 * That is what makes white milk legible: pure white on a near-white page has
 * almost no contrast, so rather than darkening the whole page, the contrast is
 * created *inside* the glass — tinted glass behind, white milk in front.
 */
const MilkGlass = ({ fill, selected, className, style }: Props) => {
  const shouldReduceMotion = useReducedMotion();
  // useId() emits colons, which are not valid inside a url(#…) reference.
  const clipId = `milk-${useId().replace(/:/g, '')}`;

  const surfaceY = BOTTOM - fill * (BOTTOM - TOP);
  const waving = selected && !shouldReduceMotion;

  return (
    <svg
      viewBox="0 0 100 160"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id={clipId}>
          <path d={GLASS} />
        </clipPath>
      </defs>

      {/* Empty glass — the level colour, kept faint so it reads as tinted
          glass rather than as liquid. */}
      <motion.path
        d={GLASS}
        fill="currentColor"
        stroke="none"
        initial={false}
        animate={{ opacity: selected ? 0.18 : 0.11 }}
        transition={{ duration: 0.25 }}
      />

      {/* The pour. Keyed on `fill` so re-selecting the same glass replays it,
          and animated through the `height` attribute rather than scaleY to
          sidestep SVG transform-origin differences between browsers. */}
      {waving && (
        <motion.rect
          key={`pour-${fill}`}
          x="47"
          y="0"
          width="6"
          rx="3"
          fill={MILK}
          initial={{ height: 0, opacity: 1 }}
          animate={{ height: [0, surfaceY, surfaceY], opacity: [1, 1, 0] }}
          transition={{ duration: 0.75, times: [0, 0.45, 1], ease: 'easeIn' }}
        />
      )}

      {/* Milk. The clip sits on a static <g>: a clip-path on a *transformed*
          element resolves in that element's own moved coordinate system, so
          the mask would slide up and down with the fill. */}
      <g clipPath={`url(#${clipId})`}>
        {/* Milk stays fully opaque whether or not the level is selected —
            fading it made the fill level, which is the actual information on
            this page, hard to read at a glance. Selection is carried by the
            outline weight, the lift and the label colour instead. */}
        <motion.g
          initial={false}
          animate={{ y: surfaceY }}
          transition={
            shouldReduceMotion
              ? { duration: 0.2 }
              : // Under-damped on purpose — the milk overshoots and settles,
                // which is what selling the "poured liquid" read depends on.
                { type: 'spring', stiffness: 120, damping: 12, mass: 0.9 }
          }
        >
          <motion.path
            d={WAVE}
            fill={MILK}
            animate={waving ? { x: [0, -50] } : { x: 0 }}
            transition={
              waving
                ? { duration: 3.4, repeat: Infinity, ease: 'linear' }
                : { duration: 0.3 }
            }
          />
        </motion.g>
      </g>

      {/* Glass outline, painted last so it reads as the front of the glass. */}
      <motion.path
        d={GLASS}
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeLinecap="round"
        initial={false}
        animate={{ strokeWidth: selected ? 3.5 : 2.25, opacity: selected ? 1 : 0.55 }}
        transition={{ duration: 0.25 }}
      />
    </svg>
  );
};

export default MilkGlass;
