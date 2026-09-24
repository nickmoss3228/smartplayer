/**
 * Motion tokens for framer-motion (docs/design-manifest.md §8).
 *
 * The CSS side has the same curve as `--ease-enter` in App.css, so an element
 * animated by a keyframe and one animated by framer-motion arrive the same way.
 *
 * Storytelling sequences (the why-cloud visualisations, the auth panel) keep
 * their own beat timings — those durations *are* the content. These tokens are
 * for generic interface motion: something appearing, a dialog opening.
 */

/** The one entrance curve — fast out, long settle. */
export const EASE_ENTER = [0.16, 1, 0.3, 1] as const

/** Hover, press, a quick fade. */
export const motionFast = { duration: 0.15, ease: 'easeOut' } as const

/** Something arriving: a heading, a card, a dialog. */
export const motionEnter = { duration: 0.42, ease: EASE_ENTER } as const

/** Delay between items that arrive in reading order. */
export const STAGGER = 0.055
