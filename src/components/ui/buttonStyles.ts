/**
 * The app's three buttons, as class strings (docs/design-manifest.md §5).
 *
 * Class strings rather than components because the same look is applied to
 * a <button>, a router <Link> and a framer-motion element — one string fits
 * all three, where a component would need a polymorphic `as` prop.
 *
 *   primary   — ink fill, white text. One per screen.
 *   secondary — hairline border, for the alternative action.
 *   outline   — ink border that fills on hover; navigation dressed as a button.
 *
 * Sizes are separate from tones so a caller can set its own height without
 * two height utilities fighting in the cascade: `buttonBase` + a height +
 * `buttonTone.primary`. The ready-made `buttonPrimary` etc. are 48px (h-12),
 * the minimum comfortable touch target.
 *
 * Red is never a button fill: #e5484d behind white text is 3.9:1 and fails AA.
 * It appears only as the focus ring.
 */

export const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-[3px] text-[15px] font-semibold ' +
  'no-underline cursor-pointer transition ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal ' +
  'disabled:cursor-not-allowed disabled:opacity-45'

export const buttonTone = {
  primary: 'bg-ink text-white hover:opacity-90',
  secondary: 'bg-transparent border border-line-strong text-ink hover:border-ink',
  outline: 'bg-transparent border border-ink text-ink hover:bg-ink hover:text-white',
} as const

export const buttonPrimary = `${buttonBase} h-12 px-6 ${buttonTone.primary}`
export const buttonSecondary = `${buttonBase} h-12 px-6 ${buttonTone.secondary}`
export const buttonOutline = `${buttonBase} h-12 px-6 ${buttonTone.outline}`
