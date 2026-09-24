import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useStoryGroupsWithStatus,
  type DifficultySlug,
  type StoryGroup,
} from '../../types/storyGroups';
import { useProgress } from '../../context/ProgressContext';
import { useCart } from '../../context/CartContext';
import { useEntitlements } from '../../context/EntitlementsContext';
import { themes } from '../../modules/levelprogress/themes.levelprogress';
import {
  SET_TRACK_PRICE_MINOR,
  TRACK_PRICE_MINOR,
  formatPrice,
  levelSku,
} from '../../config/priceCatalog';
import { useCatalog } from '../../context/CatalogContext';
import type { CatalogProduct as Product } from '../../services/catalogServices';
import StoryCard from './StoryCard';
import { StoryCardSkeletonGrid } from './StoryCardSkeleton';

export type ShelfFilter = 'all' | 'mine' | 'buy';

/**
 * One level's shelf: every story on it, owned and unowned together, split into
 * the two things the shop sells separately — stories, and news & interesting
 * things.
 *
 * A component per level rather than a loop, because each needs its own
 * useStoryGroupsWithStatus call and hooks cannot be called in a loop.
 *
 * NOTHING here is drawn from a half-answer. The shelf waits on two independent
 * loads — which stories exist, and what this account owns — and every visible
 * decision needs both. A skeleton the size of the answer is the better first
 * frame than a shelf that repaints its padlocks.
 */
const levelFat: Record<DifficultySlug, string> = {
  easy: 'fatEasy',
  medium: 'fatMedium',
  hard: 'fatHard',
};

const CATEGORY_ORDER: StoryGroup['category'][] = ['general', 'news'];

interface Props {
  difficulty: DifficultySlug;
  filter: ShelfFilter;
  /** Scrolled to and ringed — set when the paywall sent the learner here. */
  highlightSku?: string | null;
  onPreview: (story: StoryGroup) => void;
}

interface OfferProps {
  sku: string;
  title: string;
  meta: string;
  fullMinor: number;
  priceMinor: number;
  inCart: boolean;
  highlighted: boolean;
  onToggle: () => void;
}

/** A bundle offer: a character set, or the whole level. */
const OfferRow = ({ sku, title, meta, fullMinor, priceMinor, inCart, highlighted, onToggle }: OfferProps) => {
  const { t } = useTranslation();
  return (
    <div
      id={`sku-${sku}`}
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 border-2 border-gray-900 px-3 py-2.5 ${
        highlighted ? 'ring-2 ring-[#FFE24A] ring-offset-2' : ''
      }`}
    >
      <span className="text-base font-extrabold uppercase tracking-tight text-gray-900">{title}</span>
      <span className="text-xs text-gray-500">{meta}</span>
      <span className="ml-auto flex items-baseline gap-1.5 text-sm tabular-nums">
        {/* Struck through only when the bundle actually saves something. */}
        {fullMinor > priceMinor && (
          <s className="text-xs text-gray-400">{formatPrice(fullMinor)}</s>
        )}
        <span className="font-bold text-gray-900">{formatPrice(priceMinor)}</span>
      </span>
      <button
        type="button"
        onClick={onToggle}
        className={`font-mono cursor-pointer rounded-[2px] px-2.5 py-1.5 text-[11px] uppercase tracking-[0.18em] transition-colors ${
          inCart
            ? 'border border-gray-300 text-gray-500 hover:bg-gray-50'
            : 'bg-gray-900 text-white hover:bg-gray-700'
        }`}
      >
        {inCart ? t('shop.inCart') : t('shop.buy')}
      </button>
    </div>
  );
};

export const LevelShelf = ({ difficulty, filter, highlightSku, onPreview }: Props) => {
  const { t } = useTranslation();
  const { getStoryData } = useProgress();
  const { has, add, remove } = useCart();
  const { canBuy, entitlementsLoading, ownedStories } = useEntitlements();
  const { products, getCatalogStory, getProduct, priceFor, catalogLoading } = useCatalog();

  const { stories, loading: storiesLoading } = useStoryGroupsWithStatus(difficulty, t);
  const theme = themes[difficulty] ?? themes.easy;

  // Either half missing makes the shelf unrenderable, so they are one flag.
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

  const unownedParts = (product: Product) =>
    product.storyKeys
      .filter((key) => !ownedStories.includes(key))
      .reduce((sum, key) => sum + (getCatalogStory(key)?.parts ?? 0), 0);

  // Offers only while something in them is still unowned, and never on the
  // "mine" view, which is a library rather than a shop window.
  const showOffers = !loading && filter !== 'mine';
  const sets = products.filter(
    (p) =>
      p.kind === 'set' &&
      p.storyKeys.some((key) => key.startsWith(`${difficulty}/`)) &&
      canBuy(p.sku) &&
      unownedParts(p) > 0,
  );
  const level = getProduct(levelSku(difficulty));
  const showLevel = level !== null && canBuy(level.sku) && unownedParts(level) > 0;

  const toggle = (sku: string) => (has(sku) ? remove(sku) : add(sku));

  // Only once the answer is in. While loading, `visible` is a filter applied to
  // stories whose lock state is not known yet, so an empty result means "not
  // told yet", not "nothing here".
  if (!loading && visible.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      {/* Shelf header. The fat percentage is the level's own identity in this
          app, so it belongs here rather than a generic "Easy / Medium / Hard". */}
      <div className="flex items-end justify-between gap-3 border-b-2 border-gray-900 pb-1.5">
        <h2 className="text-xl font-extrabold uppercase leading-none tracking-tight text-gray-900 sm:text-2xl">
          {t(`list.difficultyTitle.${difficulty}`)}
        </h2>
        <span className="font-mono shrink-0 text-[11px] uppercase tracking-[0.18em] text-gray-500 tabular-nums">
          {t('levels.fatLabel')}{' '}
          <span className="font-semibold text-gray-800">{t(`levels.${levelFat[difficulty]}`)}</span>
          <span className="mx-1.5 text-gray-300">·</span>
          {loading ? (
            <span className="inline-block h-3 w-14 rounded-[3px] bg-gray-200 align-middle animate-pulse" />
          ) : (
            t('shelf.ownedOf', {
              owned: stories.filter((s) => s.locked !== true).length,
              total: stories.length,
            })
          )}
        </span>
      </div>

      {loading ? (
        <StoryCardSkeletonGrid count={stories.length} />
      ) : (
        groups.map(({ category, stories: groupStories }) => (
          <div key={category} className="flex flex-col gap-2">
            <h3 className="font-mono px-0.5 text-[10px] uppercase tracking-[0.16em] text-gray-500">
              {t(`list.category.${category}`)}
            </h3>

            {category === 'general' &&
              showOffers &&
              sets.map((set) => {
                const parts = unownedParts(set);
                return (
                  <OfferRow
                    key={set.sku}
                    sku={set.sku}
                    title={t(`shelf.sets.${set.character}`)}
                    meta={t('shelf.setMeta', {
                      count: parts,
                      perTrack: formatPrice(SET_TRACK_PRICE_MINOR),
                    })}
                    fullMinor={parts * TRACK_PRICE_MINOR}
                    priceMinor={priceFor(set, ownedStories)}
                    inCart={has(set.sku)}
                    highlighted={highlightSku === set.sku}
                    onToggle={() => toggle(set.sku)}
                  />
                );
              })}

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
              {groupStories.map((story, index) => {
                const sku = story.requiredSkus?.[0] ?? '';
                return (
                  <div
                    key={story.slug}
                    id={sku ? `sku-${sku}` : undefined}
                    className={`rounded-[2px] ${
                      sku && highlightSku === sku ? 'ring-2 ring-[#FFE24A] ring-offset-2' : ''
                    }`}
                  >
                    <StoryCard
                      story={story}
                      difficulty={difficulty}
                      accent={theme.accent}
                      completed={getStoryData(difficulty, story.slug).completedParts.length}
                      index={index}
                      variant="shop"
                      inCart={has(sku)}
                      onOpen={() => onPreview(story)}
                      onPreview={() => onPreview(story)}
                      onBuy={sku && canBuy(sku) ? () => toggle(sku) : undefined}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {showOffers && showLevel && level && (
        <OfferRow
          sku={level.sku}
          title={t('shelf.wholeLevel', { level: t(`list.difficultyTitle.${difficulty}`) })}
          meta={t('shelf.levelMeta')}
          fullMinor={unownedParts(level) * TRACK_PRICE_MINOR}
          priceMinor={priceFor(level, ownedStories)}
          inCart={has(level.sku)}
          highlighted={highlightSku === level.sku}
          onToggle={() => toggle(level.sku)}
        />
      )}
    </section>
  );
};

export default LevelShelf;
