import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LevelShelf, { useShopStories, type ShelfFilter } from '../components/Stories/LevelShelf';
import type { LevelSummary } from '../components/Stories/SubscriptionPlans';
import ShopStoryPreview from '../components/Stories/ShopStoryPreview';
import { useCatalog } from '../context/CatalogContext';
import { storyKey } from '../config/priceCatalog';
import type { DifficultySlug, StoryGroup } from '../types/storyGroups';

/**
 * The shop. One level at a time, picked from tabs; each level opens on the two
 * subscriptions (this level, or all three) and then its stories, so what a
 * subscription contains is always on screen next to its price.
 *
 * Stories are not sold one at a time. Buying is a single click on a plan —
 * there is no basket — and the story cards below are there to look inside.
 *
 * Ownership is a state on the card, and "my library" is a filter rather than a
 * destination — /library routes here with the filter preset.
 */
const LEVELS: DifficultySlug[] = ['easy', 'medium', 'hard'];

const levelFat: Record<DifficultySlug, string> = {
  easy: 'fatEasy',
  medium: 'fatMedium',
  hard: 'fatHard',
};

interface Props {
  /** /library enters on 'mine'; /shop and /stories enter on 'all'. */
  initialFilter?: ShelfFilter;
}

const Stories = ({ initialFilter = 'all' }: Props) => {
  const { t } = useTranslation();
  const location = useLocation();
  const { getProduct, getCatalogStory } = useCatalog();

  const [filter, setFilter] = useState<ShelfFilter>(initialFilter);
  const [level, setLevel] = useState<DifficultySlug>('easy');
  const [previewing, setPreviewing] = useState<{
    difficulty: DifficultySlug;
    story: StoryGroup;
  } | null>(null);

  // One call per level, so the tabs can say what each level holds. The list
  // hook caches per level, so the shelf below reuses these answers.
  const easy = useShopStories('easy');
  const medium = useShopStories('medium');
  const hard = useShopStories('hard');
  const shelves: Record<DifficultySlug, { stories: StoryGroup[]; loading: boolean }> = {
    easy,
    medium,
    hard,
  };

  // Each level's character names its tab and its line on the all-levels card.
  // The catalog's `character` is the key ("leo"); the story's own field is a
  // display title, which is not a name.
  const characterOf = (difficulty: DifficultySlug) => {
    const lead = shelves[difficulty].stories.find((s) => s.category === 'general');
    const character = lead && getCatalogStory(storyKey(difficulty, lead.slug))?.character;
    return character ? t(`shelf.characters.${character}`, { defaultValue: character }) : null;
  };

  const levels: LevelSummary[] = LEVELS.map((difficulty) => ({
    difficulty,
    character: characterOf(difficulty),
    stories: shelves[difficulty].stories.length,
    tracks: shelves[difficulty].stories.reduce((sum, s) => sum + s.totalTracks, 0),
  }));

  // The paywall sends the learner here pointing at what they chose.
  const highlightSku = (location.state as { highlightSku?: string } | null)?.highlightSku ?? null;

  // Open on the level the highlighted subscription is for, once the catalog
  // says. The all-levels one is on every tab, so it leaves the tab alone.
  useEffect(() => {
    if (!highlightSku) return;
    const difficulty = getProduct(highlightSku)?.difficulty as DifficultySlug | undefined;
    if (difficulty && LEVELS.includes(difficulty)) setLevel(difficulty);
  }, [highlightSku, getProduct]);

  useEffect(() => {
    if (!highlightSku) return;
    // After the shelf has had a moment to render its cards.
    const timer = window.setTimeout(() => {
      document
        .getElementById(`sku-${highlightSku}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [highlightSku]);

  const filters: { id: ShelfFilter; label: string }[] = useMemo(
    () => [
      { id: 'all', label: t('shelf.filterAll') },
      { id: 'mine', label: t('shelf.filterMine') },
      { id: 'buy', label: t('shelf.filterBuy') },
    ],
    [t],
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 pb-20 pt-20 sm:gap-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[26px] sm:text-[30px] lg:text-4xl font-extrabold tracking-[-0.03em] leading-tight text-gray-900">
              {t('shop.title')}
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">{t('shop.subtitle')}</p>
          </div>

          {/* Filter, not navigation. "My library" is a view of this page. */}
          <div className="flex gap-1.5">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                aria-pressed={filter === f.id}
                className={`font-mono rounded-[2px] border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] transition-colors ${
                  filter === f.id
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 text-gray-500 hover:bg-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Level tabs. The fat percentage is the level's own identity here. */}
        <nav aria-label={t('shop.plans.levels')} className="grid grid-cols-3 gap-2">
          {LEVELS.map((difficulty) => {
            const active = level === difficulty;
            const character = characterOf(difficulty);
            const { stories, loading } = shelves[difficulty];
            return (
              <button
                key={difficulty}
                type="button"
                onClick={() => setLevel(difficulty)}
                aria-pressed={active}
                className={`flex min-h-[52px] min-w-0 flex-col items-start justify-center gap-0.5 rounded-tile px-2.5 py-2.5 text-left transition-colors sm:min-h-[64px] sm:px-4 ${
                  active
                    ? 'border-2 border-gray-900 bg-gray-900 text-white'
                    : 'border border-gray-300 bg-white text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span className="max-w-full truncate text-[13px] font-extrabold sm:text-[17px]">
                  {t(`list.difficultyTitle.${difficulty}`)}
                </span>
                <span
                  className={`max-w-full truncate font-mono text-[10px] uppercase tracking-[0.14em] ${
                    active ? 'text-gray-300' : 'text-gray-500'
                  }`}
                >
                  {character && <span>{character}</span>}
                  <span className="hidden sm:inline">
                    {!loading && (
                      <>
                        {character && ' · '}
                        {t('shop.plans.storiesCount', { count: stories.length })}
                      </>
                    )}
                    {' · '}
                    {t('levels.fatLabel')} {t(`levels.${levelFat[difficulty]}`)}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>

        <LevelShelf
          key={level}
          difficulty={level}
          filter={filter}
          stories={shelves[level].stories}
          storiesLoading={shelves[level].loading}
          levels={levels}
          highlightSku={highlightSku}
          onPreview={(story) => setPreviewing({ difficulty: level, story })}
        />
      </div>

      {previewing && (
        <ShopStoryPreview
          difficulty={previewing.difficulty}
          story={previewing.story}
          onClose={() => setPreviewing(null)}
        />
      )}
    </div>
  );
};

export default Stories;
