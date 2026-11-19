// components/Guide/guideKit.tsx
//
// The guide's visual language (pages/HowToUse.tsx, drawn in the landing's
// language on 2026-11-14), in one place so the onboarding at /welcome can
// speak it too: the landing's green, the shallow-water band, the kicker with
// its bar of colour, the big white cards and the uppercase call to action.

import React from 'react';

/** The shallow-water band behind the guide's steps. */
export const WATER = '#cfe6f3';
/** The landing's green, as a fill behind ink; `GREEN_INK` is the shade that passes AA as text on white. */
export const GREEN = '#00c951';
export const GREEN_INK = '#007a33';

/** The guide's card: big corners, white, no border. */
export const guideCard = 'rounded-[22px] bg-white p-5 sm:p-7';

/** The guide's call to action (its «Выбрать жирность»), as a class string for a button or a Link. */
export const guideCta =
  'inline-flex h-14 items-center justify-center gap-2.5 rounded-[14px] bg-ink px-7 text-sm font-bold uppercase ' +
  'tracking-[0.2em] text-white no-underline transition-colors hover:bg-gray-800 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal';

/** The landing's kicker, small: a bar of colour and a mono label. */
export const Eyebrow: React.FC<{ children: React.ReactNode; bar?: string; className?: string }> = ({
  children,
  bar = GREEN,
  className = 'text-dim',
}) => (
  <p className={`m-0 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em] ${className}`}>
    <span aria-hidden className="h-1.5 w-7 flex-none rounded-full" style={{ background: bar }} />
    {children}
  </p>
);
