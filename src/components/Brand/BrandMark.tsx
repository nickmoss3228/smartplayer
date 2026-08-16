/**
 * The malako mark — the icon that replaced the old ∞ glyph.
 *
 * It is used in two very different places, which is why it lives here as one
 * component rather than as an <img> import like the old infinity.svg did:
 *   • the navbar logo — small, solid black
 *   • the homepage watermark — enormous, near-white (#f5f5f5)
 * Both need to recolour the shape, so the paths are inlined and painted with
 * `currentColor` instead of being loaded as a file.
 *
 * To switch the site over to a different mark, change ACTIVE_MARK below.
 */

export type MarkVariant = 'drop' | 'carton' | 'glass' | 'splash';

/** The mark the whole site uses. Change this one line to swap it everywhere. */
export const ACTIVE_MARK: MarkVariant = 'drop';

type Props = {
  variant?: MarkVariant;
  className?: string;
  style?: React.CSSProperties;
  /** Decorative by default; pass a label when the mark carries meaning. */
  title?: string;
};

const paths: Record<MarkVariant, React.ReactNode> = {
  // A single drop of milk.
  drop: (
    <path d="M12 2C8.2 7.4 4.9 11.6 4.9 14.6a7.1 7.1 0 0 0 14.2 0C19.1 11.6 15.8 7.4 12 2Z" />
  ),

  // Gable-top carton. The second subpath is the fold crease — `evenodd` turns
  // it into a cut-out rather than a second filled block.
  carton: (
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M5 21.5V9.2L8.7 3.5h6.6L19 9.2v12.3H5Zm.9-12.05h12.2v1H5.9v-1Z"
    />
  ),

  // Tumbler with a milk line: the cut-out is the empty air above the milk.
  glass: (
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M6.8 3h10.4l-1.55 17.5a1.7 1.7 0 0 1-1.7 1.5h-3.9a1.7 1.7 0 0 1-1.7-1.5L6.8 3Zm.75.95h8.9l-.48 5.4H8.03l-.48-5.4Z"
    />
  ),

  // A drop mid-fall, with the ripples it is about to make.
  splash: (
    <>
      <path d="M12 1.8C9.4 5.5 7.2 8.4 7.2 10.5a4.8 4.8 0 1 0 9.6 0C16.8 8.4 14.6 5.5 12 1.8Z" />
      <path
        d="M4.4 17.4c1.9 1.9 4.6 3.1 7.6 3.1s5.7-1.2 7.6-3.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M7.6 21.3c1.2.8 2.8 1.3 4.4 1.3s3.2-.5 4.4-1.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </>
  ),
};

const BrandMark = ({ variant = ACTIVE_MARK, className, style, title }: Props) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    style={style}
    fill="currentColor"
    role={title ? 'img' : undefined}
    aria-label={title}
    aria-hidden={title ? undefined : true}
    focusable="false"
  >
    {paths[variant]}
  </svg>
);

export default BrandMark;
