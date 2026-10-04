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
import { TRACK_PRICE_MINOR, storyKey, storySku } from '../../config/priceCatalog';
import { useCatalog } from '../../context/CatalogContext';
import StoryCard from './StoryCard';
import { StoryCardSkeletonGrid } from './StoryCardSkeleton';
import OfferLadder, { type LevelSummary, type SetOffer } from './OfferLadder';

export type ShelfFilter = 'all' | 'mine' | 'buy';

/**
 * The stories the shop shows for a level: everything published, minus a story
 * that is free in full — free outright, or a free allowance that already covers
 * every part. Such a story has nothing to sell, so it stays on the level shelf
 * (List.tsx) and off this one.
 */
export function useShopStories(difficulty: DifficultySlug): {
  stories: StoryGroup[];
  loading: boolean;
} {
  const { getCatalogStory } = useCatalog();
  const { stories: all, loading } = useStoryGroupsWithStatus(difficulty);
  const stories = useMemo(
    () =>
      all.filter((s) => {
        const entry = getCatalogStory(storyKey(difficulty, s.slug));
        if (!entry) return true;
        const givenAway =
          !entry.paid || (entry.previewSeconds === null && entry.freeParts >= entry.parts);
        return !givenAway;
      }),
    [all, getCatalogStory, difficulty],
  );
  return { stories, loading };
}

/**
 * One level of the shop: the three ways to buy (OfferLadder), then the level's
 * stories to pick from one at a time.
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
  /** Every level, for the "everything" card. */
  levels: LevelSummary[];
  setTitle: (character: string) => string;
  /** Scrolled to and ringed — set when the paywall sent the learner here. */
  highlightSku?: string | null;
  onPreview: (story: StoryGroup) => void;
}

export const LevelShelf = ({
  difficulty,
  filter,
  stories,
  storiesLoading,
  levels,
  setTitle,
  highlightSku,
  onPreview,
}: Props) => {
  const { t } = useTranslation();
  const { getStoryData } = useProgress();
  const { has, add, remove } = useCart();
  const { canBuy, entitlementsLoading, ownedStories } = useEntitlements();
  const { products, getCatalogStory, getProduct, priceFor, catalogLoading } = useCatalog();
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

  const toggle = (sku: string) => (has(sku) ? remove(sku) : add(sku));

  // The character sets that hold stories on this level, as offers.
  const setOffers = useMemo<SetOffer[]>(() => {
    const bySlug = new Map(stories.map((s) => [s.slug, s]));
    return products
      .filter((p) => p.kind === 'set' && p.storyKeys.some((key) => key.startsWith(`${difficulty}/`)))
      .map((product) => {
        const released = product.storyKeys
          .map((key) => bySlug.get(key.slice(key.indexOf('/') + 1)))
          .filter((s): s is StoryGroup => Boolean(s));
        const unowned = product.storyKeys.filter((key) => !ownedStories.includes(key));
        const unownedParts = unowned.reduce((sum, key) => sum + (getCatalogStory(key)?.parts ?? 0), 0);
        const durations = product.storyKeys.map((key) => getCatalogStory(key)?.durationSeconds ?? null);
        const known = durations.filter((d): d is number => d !== null);
        return {
          product,
          released,
          upcoming: product.storyKeys.length - released.length,
          priceMinor: priceFor(product, ownedStories),
          fullMinor: unownedParts * TRACK_PRICE_MINOR,
          minutes: known.length > 0 ? Math.round(known.reduce((a, b) => a + b, 0) / 60) : null,
          minutesComplete: known.length === durations.length,
          state: unownedParts === 0 ? 'owned' : canBuy(product.sku) ? 'buy' : 'soon',
          inCart: has(product.sku),
        };
      });
  }, [products, difficulty, stories, ownedStories, getCatalogStory, priceFor, canBuy, has]);

  // "from N ₽": the cheapest story on this shelf that has a price.
  const cheapestMinor = useMemo(() => {
    const prices = stories
      .map((s) => getProduct(storySku(storyKey(difficulty, s.slug)))?.amountMinor)
      .filter((n): n is number => typeof n === 'number' && n > 0);
    return prices.length ? Math.min(...prices) : null;
  }, [stories, getProduct, difficulty]);

  // Stories a set in the basket already covers, so their cards can say so.
  const coveredBySet = useMemo(() => {
    const keys = new Set<string>();
    for (const offer of setOffers) {
      if (offer.inCart) offer.product.storyKeys.forEach((key) => keys.add(key));
    }
    return keys;
  }, [setOffers]);

  // A library view ("mine") is not a shop window, so it shows no offers.
  const showOffers = !loading && filter !== 'mine';

  // Only once the answer is in. While loading, `visible` is a filter applied to
  // stories whose lock state is not known yet, so an empty result means "not
  // told yet", not "nothing here".
  if (!loading && visible.length === 0 && !showOffers) return null;

  return (
    <div className="flex flex-col gap-8">
      {showOffers && (
        <OfferLadder
          cheapestMinor={cheapestMinor}
          sets={setOffers}
          levels={levels}
          highlightSku={highlightSku}
          setTitle={setTitle}
          onToggleSet={toggle}
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
                {groupStories.map((story, index) => {
                  const sku = story.requiredSkus?.[0] ?? '';
                  const inSet = coveredBySet.has(storyKey(difficulty, story.slug));
                  return (
                    <div
                      key={story.slug}
                      id={sku ? `sku-${sku}` : undefined}
                      className={`relative rounded-card ${
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
                      {inSet && (
                        <span className="pointer-events-none absolute right-2 top-2 z-20 rounded-chip bg-[#FFE24A] px-2 py-0.5 text-[11px] font-extrabold text-gray-900">
                          {t('shop.ladder.inSet')}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
};

export default LevelShelf;
