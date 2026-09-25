import { useParams, useNavigate } from 'react-router-dom';
import { useStoryGroupsWithStatus, DifficultySlug, StoryGroup } from '../types/storyGroups';
import { useProgress } from '../context/ProgressContext';
import { useMemo } from 'react';
import { IoSearchOutline } from 'react-icons/io5';
import { useTranslation } from 'react-i18next';
import { themes } from '../modules/levelprogress/themes.levelprogress';
import StoryCard from '../components/Stories/StoryCard';
import { StoryCardSkeletonGrid } from '../components/Stories/StoryCardSkeleton';

/**
 * One level's shelf, reached from the level picker: every story on the level.
 *
 * The card itself lives in components/Stories/StoryCard — the same component
 * the merged /stories page uses. There were briefly two near-identical card
 * implementations, here and there; they would have drifted the first time a
 * price or a lock state changed shape.
 *
 * Do NOT add a scroll-reveal IntersectionObserver here. It lives on StoryCard
 * itself, because when it lived on this page every other surface rendering the
 * same card showed cards that were clickable but invisible.
 *
 * The page header is the level name and the owned-of-total count, and that is
 * all. The milk-fat tag ("1% FAT" plus its segment meter) used to sit between
 * the header and the shelf; the level picker at /levels already states the fat
 * for every level, and repeating it on the page you reached BY choosing that
 * level was a line nobody needed to read twice. levelFat/FatMeter went with it.
 *
 * EVERY story on the level is listed, and that is the whole rule. There is no
 * price and no buy button here — selling is switched off entirely for now
 * (config/features.ts) — and a story whose first parts play carries no padlock,
 * because a lock on a card that plays confused people.
 *
 * This page used to be a LIBRARY: it showed only what you could already hear,
 * and each category ended with a dashed "+" tile leading to the shop. Both are
 * gone. With nothing for sale there is no second place for a story to live, so
 * a shelf that hid stories was hiding them from everyone for no reason, and a
 * "+" that added nothing was an invitation to a page that redirects. What a
 * signed-out visitor cannot yet HEAR is still shown — they are asked to sign
 * up when they reach it, which is the point of showing it.
 *
 * Nothing here renders until the server's story list has arrived. The shelf
 * used to paint twice: the static catalogue first — every story unlocked,
 * hidden ones still present, published ones missing — and then the real list,
 * so padlocks appeared, cards vanished and the header count changed under the
 * reader. A skeleton the same size and shape as the answer is a better first
 * frame than a wrong answer, and on a repeat visit there is no skeleton at all
 * because useStoryGroupsWithStatus already has the list (see its cache).
 */
const categoryOrder: StoryGroup['category'][] = ['general', 'news'];

const List = () => {
  const { difficulty } = useParams<{ difficulty: string }>();
  const navigate = useNavigate();
  const { getStoryData } = useProgress();
  const { t } = useTranslation();

  const diff = (difficulty || 'easy') as DifficultySlug;
  const { stories, loading } = useStoryGroupsWithStatus(diff, t);
  const theme = themes[diff] || themes.easy;

  // Every category that has a story in it. No filtering: the shelf is the
  // level's full contents, in the order the categories are declared.
  const groupedStories = useMemo(() => {
    const byCategory = new Map<StoryGroup['category'], StoryGroup[]>();
    for (const story of stories) {
      byCategory.set(story.category, [...(byCategory.get(story.category) ?? []), story]);
    }
    return categoryOrder
      .filter(cat => (byCategory.get(cat)?.length ?? 0) > 0)
      .map(cat => ({ category: cat, stories: byCategory.get(cat)! }));
  }, [stories]);

  // While loading, `stories` is the static catalogue — not what the shelf will
  // end up showing, but the right count of tiles to reserve.
  const skeletonCount = stories.length;

  const libraryCount = groupedStories.reduce((n, g) => n + g.stories.length, 0);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">

      <div className="max-w-5xl pt-20 mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between gap-2 sm:gap-4 mb-4 animate-fade-in">
          <button
            onClick={() => navigate('/levels')}
            className="flex items-center cursor-pointer gap-2 text-gray-500 hover:text-gray-800 transition-colors text-sm flex-shrink-0"
            aria-label={t('levels.title')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="text-center flex-1 min-w-0 px-2">
            <div className="text-xl sm:text-2xl font-bold text-gray-800 tracking-wide">
              {t(`list.difficultyTitle.${diff}`)}
            </div>
            {/* min-h, not a conditional line: the count appearing must not
                push the shelf down a row once it resolves. */}
            <p className="text-gray-400 text-sm mt-1 min-h-[1.25rem]">
              {loading ? (
                <span className="inline-block h-3 w-24 rounded-[3px] bg-gray-200 align-middle animate-pulse" />
              ) : (
                <>
                  {libraryCount} {t('list.stories')}
                </>
              )}
            </p>
          </div>

          <div className="w-4 flex-shrink-0" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 space-y-8">
        {loading ? (
          /* Sized from the static catalogue, which is the best guess available
             without the server and is almost always the right number — so the
             real cards drop into the space the skeleton was already holding
             instead of reflowing the page. */
          <StoryCardSkeletonGrid count={skeletonCount} />
        ) : groupedStories.length > 0 ? (
          groupedStories.map(({ category, stories: groupStories }) => (
            <div key={category}>
              {groupedStories.length > 1 && (
                <h2 className="font-mono text-[10px] text-gray-500 uppercase tracking-[0.16em] mb-2 px-1 animate-fade-in-delay-2">
                  {t(`list.category.${category}`)}
                </h2>
              )}
              {/* A grid rather than the old horizontal rail: a row you have to
                  scroll sideways hid half the catalogue behind a gesture that
                  gives no hint there is more. */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
                {groupStories.map((story, index) => (
                  <StoryCard
                    key={story.slug}
                    story={story}
                    difficulty={diff}
                    accent={theme.accent}
                    completed={getStoryData(diff, story.slug).completedParts.length}
                    index={index}
                    /* A free-to-start story opens like any other: its free
                       parts play, and the level grid is where a signed-out
                       visitor is asked to sign up for the rest. */
                    onOpen={() => navigate(`/levels/${diff}/${story.slug}`)}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-card border border-gray-200 overflow-hidden">
            <div className="text-center py-16 text-gray-400">
              <IoSearchOutline size={32} className="mx-auto mb-3 opacity-40" aria-hidden="true" />
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default List;
