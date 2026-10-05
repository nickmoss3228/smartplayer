import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useStoryGroupsWithStatus,
  type DifficultySlug,
  type StoryGroup,
} from '../../types/storyGroups';
import { useProgress } from '../../context/ProgressContext';
import { useEntitlements } from '../../context/EntitlementsContext';
import { themes } from '../../modules/levelprogress/themes.levelprogress';
import { storyKey } from '../../config/priceCatalog';
import { useCatalog } from '../../context/CatalogContext';
import StoryCard from './StoryCard';
import { StoryCardSkeletonGrid } from './StoryCardSkeleton';
import SubscriptionPlans, { type LevelSummary } from './SubscriptionPlans';

export type ShelfFilter = 'all' | 'mine' | 'buy';

/**
 * The stories the shop shows for a level: everything a subscription to it
 * covers. A story marked free outright is in no subscription, so it stays on
 * the level shelf (List.tsx) and off this one.
 */
export function useShopStories(difficulty: DifficultySlug): {
  stories: StoryGroup[];
  loading: boolean;
} {
  const { getCatalogStory } = useCatalog();
  const { stories: all, loading } = useStoryGroupsWithStatus(difficulty);
  const stories = useMemo(
    () => all.filter((s) => getCatalogStory(storyKey(difficulty, s.slug))?.paid !== false),
    [all, getCatalogStory, difficulty],
  );
  return { stories, loading };
}

/**
 * One level of the shop: the two subscriptions (SubscriptionPlans), then the
 * level's stories, to look inside before buying. The stories themselves are
 * not sold — a card is a preview, never a buy button.
 *
 * NOTHING here is drawn from a half-answer. The shelf waits on the stories, the
 * catalog and what this account owns, and every visible decision needs all
 * three. A skeleton the size of the answer is the better first frame than a
 * shelf that repaints its padlocks.
 */
const CATEGORY_ORDER: StoryGroup['category'][] = ['general', 'news'];

interface Props {
  difficulty: DifficultySlug;
  filter: ShelfFilter;
  /** This level's shop stories (useShopStories), loaded once by the page for its tabs. */
  stories: StoryGroup[];
  storiesLoading: boolean;
  /** Every level, for the all-levels card. */
  levels: LevelSummary[];
  /** Ringed — set when the paywall sent the learner here. */
  highlightSku?: string | null;
  onPreview: (story: StoryGroup) => void;
}

export const LevelShelf = ({
  difficulty,
  filter,
  stories,
  storiesLoading,
  levels,
  highlightSku,
  onPreview,
}: Props) => {
  const { t } = useTranslation();
  const { getStoryData } = useProgress();
  const { entitlementsLoading } = useEntitlements();
  const { getCatalogStory, levelSubscription, allSubscription, catalogLoading } = useCatalog();
  const theme = themes[difficulty] ?? themes.easy;

  // Any one missing makes the shelf unrenderable, so they are one flag.
  const loading = storiesLoading || entitlementsLoading || catalogLoading;

  const visible = useMemo(() => {
    if (filter === 'mine') return stories.filter((s) => s.locked !== true);
    if (filter === 'buy') return stories.filter((s) => s.locked === true);
    return stories;
  }, [stories, filter]);

  const groups = useMemo(
    () =>
      CATEGORY_ORDER.map((category) => ({
        category,
        stories: visible.filter((s) => s.category === category),
      })).filter((g) => g.stories.length > 0),
    [visible],
  );

  const level = levelSubscription(difficulty);

  // What the level's subscription holds today, and how much of it is still to come.
  const contents = useMemo(() => {
    const keys = new Set(level?.storyKeys ?? []);
    const released = stories.filter((s) => keys.has(storyKey(difficulty, s.slug)));
    const durations = released.map(
      (s) => getCatalogStory(storyKey(difficulty, s.slug))?.durationSeconds ?? null,
    );
    const known = durations.filter((d): d is number => d !== null);
    return {
      released,
      upcoming: Math.max(0, keys.size - released.length),
      minutes: known.length > 0 ? Math.round(known.reduce((a, b) => a + b, 0) / 60) : null,
      minutesComplete: known.length === durations.length,
    };
  }, [level, stories, difficulty, getCatalogStory]);

  // A library view ("mine") is not a shop window, so it shows no plans.
  const showPlans = !loading && filter !== 'mine';

  // Only once the answer is in. While loading, `visible` is a filter applied to
  // stories whose lock state is not known yet, so an empty result means "not
  // told yet", not "nothing here".
  if (!loading && visible.length === 0 && !showPlans) return null;

  return (
    <div className="flex flex-col gap-8">
      {showPlans && (
        <SubscriptionPlans
          difficulty={difficulty}
          level={level}
          all={allSubscription}
          released={contents.released}
          upcoming={contents.upcoming}
          minutes={contents.minutes}
          minutesComplete={contents.minutesComplete}
          levels={levels}
          highlightSku={highlightSku}
        />
      )}

      <div id="shop-stories" className="flex scroll-mt-20 flex-col gap-8">
        {loading ? (
          <StoryCardSkeletonGrid count={stories.length} />
        ) : (
          groups.map(({ category, stories: groupStories }) => (
            <section key={category} className="flex flex-col gap-3">
              <div className="flex items-end justify-between gap-3 border-b-2 border-gray-900 pb-1.5">
                <h2 className="text-xl font-extrabold uppercase leading-none tracking-tight text-gray-900">
                  {t(`list.category.${category}`)}
                </h2>
                <span className="font-mono shrink-0 text-[11px] uppercase tracking-[0.18em] text-gray-500 tabular-nums">
                  {t('shelf.ownedOf', {
                    owned: groupStories.filter((s) => s.locked !== true).length,
                    total: groupStories.length,
                  })}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {groupStories.map((story, index) => (
                  <StoryCard
                    key={story.slug}
                    story={story}
                    difficulty={difficulty}
                    accent={theme.accent}
                    completed={getStoryData(difficulty, story.slug).completedParts.length}
                    index={index}
                    variant="shop"
                    onOpen={() => onPreview(story)}
                    onPreview={() => onPreview(story)}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
};

export default LevelShelf;
