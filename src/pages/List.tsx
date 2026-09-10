import { useParams, useNavigate } from 'react-router-dom';
import { useStoryGroups, DifficultySlug, StoryGroup } from '../types/storyGroups';
import { useProgress } from '../context/ProgressContext';
import { useCart } from '../context/CartContext';
import { useMemo } from 'react';
import { IoSearchOutline } from 'react-icons/io5';
import { useTranslation } from 'react-i18next';
import { themes } from '../modules/levelprogress/themes.levelprogress';
import StoryCard from '../components/Stories/StoryCard';

/**
 * One level's shelf, reached from the level picker.
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
 */
const categoryOrder: StoryGroup['category'][] = ['general', 'news'];

const List = () => {
  const { difficulty } = useParams<{ difficulty: string }>();
  const navigate = useNavigate();
  const { getStoryData } = useProgress();
  const { has, add, remove } = useCart();
  const { t } = useTranslation();

  const diff = (difficulty || 'easy') as DifficultySlug;
  const stories = useStoryGroups(diff, t);
  const theme = themes[diff] || themes.easy;

  const groupedStories = useMemo(() => {
    const byCategory = new Map<StoryGroup['category'], StoryGroup[]>();
    for (const story of stories) {
      const list = byCategory.get(story.category) ?? [];
      list.push(story);
      byCategory.set(story.category, list);
    }
    return categoryOrder
      .filter(cat => byCategory.has(cat))
      .map(cat => ({ category: cat, stories: byCategory.get(cat)! }));
  }, [stories]);

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
            <p className="text-gray-400 text-sm mt-1">
              {t('shelf.ownedOf', {
                owned: stories.filter(s => s.locked !== true).length,
                total: stories.length,
              })}{' '}
              {t('list.stories')}
            </p>
          </div>

          <div className="w-4 flex-shrink-0" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 space-y-8">
        {groupedStories.length > 0 ? (
          groupedStories.map(({ category, stories: groupStories }) => (
            <div key={category}>
              {groupedStories.length > 1 && (
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1 animate-fade-in-delay-2">
                  {t(`list.category.${category}`)}
                </h2>
              )}
              {/* A grid rather than the old horizontal rail: with locked cards
                  carrying a price sticker and a buy button, a row you have to
                  scroll sideways hid half the catalogue — and half the offers. */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
                {groupStories.map((story, index) => {
                  const sku = story.requiredSkus?.[0] ?? '';
                  return (
                    <StoryCard
                      key={story.slug}
                      story={story}
                      difficulty={diff}
                      accent={theme.accent}
                      completed={getStoryData(diff, story.slug).completedParts.length}
                      index={index}
                      inCart={has(sku)}
                      /* Opening a locked story is allowed on purpose: its first
                         part is a free preview, so the level grid is where the
                         paywall actually appears. */
                      onOpen={() => navigate(`/levels/${diff}/${story.slug}`)}
                      onBuy={() => (has(sku) ? remove(sku) : add(sku))}
                    />
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
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
