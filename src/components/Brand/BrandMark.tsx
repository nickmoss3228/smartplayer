/**
 * The malako mark — the icon that replaced the old ∞ glyph.
 *
 * Drawn as *white with an outline*, not as a solid silhouette: milk reads as
 * white, so filling the shape black would fight the thing it depicts. The fill
 * is milk, the stroke is the drawn edge.
 *
 * It is used in two very different places, at wildly different scales:
 *   • the navbar logo — ~32px, black outline
 *   • the homepage watermark — ~55vw, sitting on a white page, so only the
 *     outline is actually visible
 * That scale gap is why the stroke uses `vector-effect="non-scaling-stroke"`:
 * strokeWidth is read in device pixels and does NOT scale with the shape, so
 * the same component gives a proportionate edge at 32px and a hairline at
 * 800px. Without it the watermark's outline would render ~40px thick.
 *
 * To switch the site over to a different mark, change ACTIVE_MARK below.
 */

export type MarkVariant = 'drop' | 'carton' | 'glass' | 'splash';

/** The mark the navbar uses. Change this one line to swap it everywhere. */
export const ACTIVE_MARK: MarkVariant = 'drop';

/** Milk. The fill is the same in every variant. */
const MILK = '#ffffff';

type Props = {
  variant?: MarkVariant;
  className?: string;
  style?: React.CSSProperties;
  /** Outline weight in device pixels — does not scale with the mark. */
  strokeWidth?: number;
  /** Decorative by default; pass a label when the mark carries meaning. */
  title?: string;
};

/**
 * `vector-effect` is not an inherited property, so it has to sit on every
 * painted path rather than once on the <svg>.
 */
const ns = { vectorEffect: 'non-scaling-stroke' } as const;

const paths: Record<MarkVariant, React.ReactNode> = {
  // A single drop of milk.
  drop: (
    <path
      {...ns}
      d="M12 2C8.2 7.4 4.9 11.6 4.9 14.6a7.1 7.1 0 0 0 14.2 0C19.1 11.6 15.8 7.4 12 2Z"
    />
  ),

  // Gable-top carton. The second path is the fold crease; outlined it reads as
  // the seam where the gable folds over.
  carton: (
    <>
      <path {...ns} d="M5 21.5V9.2L8.7 3.5h6.6L19 9.2v12.3H5Z" />
      <path {...ns} d="M5 9.45h14" fill="none" />
    </>
  ),

  // Tumbler with a milk line: the inner path is the surface of the milk.
  glass: (
    <>
      <path
        {...ns}
        d="M6.8 3h10.4l-1.55 17.5a1.7 1.7 0 0 1-1.7 1.5h-3.9a1.7 1.7 0 0 1-1.7-1.5L6.8 3Z"
      />
      <path {...ns} d="M7.35 9.35h9.3" fill="none" />
    </>
  ),

  // A drop mid-fall, with the ripples it is about to make.
  splash: (
    <>
      <path
        {...ns}
        d="M12 1.8C9.4 5.5 7.2 8.4 7.2 10.5a4.8 4.8 0 1 0 9.6 0C16.8 8.4 14.6 5.5 12 1.8Z"
      />
      <path {...ns} d="M4.4 17.4c1.9 1.9 4.6 3.1 7.6 3.1s5.7-1.2 7.6-3.1" fill="none" />
      <path {...ns} d="M7.6 21.3c1.2.8 2.8 1.3 4.4 1.3s3.2-.5 4.4-1.3" fill="none" />
    </>
  ),
};

const BrandMark = ({
  variant = ACTIVE_MARK,
  className,
  style,
  strokeWidth = 1.5,
  title,
}: Props) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    style={style}
    fill={MILK}
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    role={title ? 'img' : undefined}
    aria-label={title}
    aria-hidden={title ? undefined : true}
    focusable="false"
  >
    {paths[variant]}
  </svg>
);

export default BrandMark;
