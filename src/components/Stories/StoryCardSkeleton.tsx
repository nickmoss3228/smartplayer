/**
 * The shape of a StoryCard before the server has said which stories exist.
 *
 * A placeholder rather than a spinner, and a placeholder the same size as the
 * thing it stands in for, so the real cards drop into space that is already
 * reserved instead of shoving the page around as they arrive. It mirrors
 * StoryCard's own geometry — the 4:5 panel and the short line of text beneath
 * it — which is the one thing to keep in step if that card is ever re-laid-out.
 *
 * Shared rather than copied into each shelf: this file exists because the same
 * mistake has already been made once here with the card itself, which was
 * briefly implemented twice and started to drift.
 */
export const StoryCardSkeleton = () => (
  <div className="animate-pulse" aria-hidden="true">
    <div className="aspect-[4/5] rounded-[2px] bg-gray-200" />
    <div className="mt-1.5 h-3 w-2/3 rounded-[3px] bg-gray-200" />
  </div>
);

interface GridProps {
  /**
   * How many tiles to reserve. Callers pass the static catalogue's length,
   * which is the best guess available before the server answers and is exactly
   * right whenever the shelf is unfiltered.
   */
  count: number;
}

/** A full shelf of placeholders, on the same grid the real cards use. */
export const StoryCardSkeletonGrid = ({ count }: GridProps) => (
  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
    {Array.from({ length: Math.max(count, 1) }).map((_, i) => (
      <StoryCardSkeleton key={i} />
    ))}
  </div>
);

export default StoryCardSkeletonGrid;
