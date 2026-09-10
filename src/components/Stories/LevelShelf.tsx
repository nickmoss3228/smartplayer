import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStoryGroups, type DifficultySlug, type StoryGroup } from '../../types/storyGroups';
import { useProgress } from '../../context/ProgressContext';
import { useCart } from '../../context/CartContext';
import { useEntitlements } from '../../context/EntitlementsContext';
import { themes } from '../../modules/levelprogress/themes.levelprogress';
import { getProduct, formatPrice, PACK_STORIES } from '../../config/priceCatalog';
import StoryCard from './StoryCard';

export type ShelfFilter = 'all' | 'mine' | 'buy';

/**
 * One level's shelf: every story on it, owned and unowned together.
 *
 * A component per level rather than a loop, because each needs its own
 * useStoryGroups call and hooks cannot be called in a loop. It also keeps the
 * pack maths local — the bar underneath compares this level's pack against the
 * sum of its own stickers.
 */
const levelFat: Record<DifficultySlug, string> = {
  easy: 'fatEasy',
  medium: 'fatMedium',
  hard: 'fatHard',
};

interface Props {
  difficulty: DifficultySlug;
  filter: ShelfFilter;
  /** Hide the whole shelf when a filter empties it, so no bare heading is left. */
  onEmptyChange?: (empty: boolean) => void;
}

export const LevelShelf = ({ difficulty, filter }: Props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { getStoryData } = useProgress();
  const { has, add, remove } = useCart();
  const { canBuy } = useEntitlements();

  const stories = useStoryGroups(difficulty, t);
  const theme = themes[difficulty] ?? themes.easy;

  const visible = useMemo(() => {
    if (filter === 'mine') return stories.filter((s) => s.locked !== true);
    if (filter === 'buy') return stories.filter((s) => s.locked === true);
    return stories;
  }, [stories, filter]);

  const packSku = `pack-${difficulty}`;
  const pack = getProduct(packSku);
  const packSellable = pack !== null && canBuy(packSku);

  // What the three stories in this pack would cost bought one at a time. Shown
  // beside the pack price because "cheaper than separately" is only persuasive
  // with the other number next to it.
  const singlesTotal = useMemo(
    () =>
      (PACK_STORIES[packSku] ?? []).reduce((sum, key) => {
        const product = getProduct(`story-${key.replace('/', '-')}`);
        return sum + (product?.amountMinor ?? 0);
      }, 0),
    [packSku],
  );

  // Offer the pack only while some of it is still unowned — buying it whole
  // after owning two thirds of it is a worse deal, and the server would refuse
  // the order anyway.
  const lockedCount = stories.filter((s) => s.locked === true).length;
  const showPack = packSellable && lockedCount > 1 && filter !== 'mine';

  if (visible.length === 0) return null;

  const openStory = (story: StoryGroup) => navigate(`/levels/${difficulty}/${story.slug}`);

  return (
    <section className="flex flex-col gap-3">
      {/* Shelf header. The fat percentage is the level's own identity in this
          app, so it belongs here rather than a generic "Easy / Medium / Hard". */}
      <div className="flex items-end justify-between gap-3 border-b-2 border-gray-900 pb-1.5">
        <h2 className="text-xl font-black uppercase leading-none tracking-tight text-gray-900 sm:text-2xl">
          {t(`list.difficultyTitle.${difficulty}`)}
        </h2>
        <span className="shrink-0 text-[11px] uppercase tracking-widest text-gray-500 tabular-nums">
          {t('levels.fatLabel')}{' '}
          <span className="font-semibold text-gray-800">{t(`levels.${levelFat[difficulty]}`)}</span>
          <span className="mx-1.5 text-gray-300">·</span>
          {t('shelf.ownedOf', {
            owned: stories.filter((s) => s.locked !== true).length,
            total: stories.length,
          })}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
        {visible.map((story, index) => {
          const sku = story.requiredSkus?.[0] ?? '';
          return (
            <StoryCard
              key={story.slug}
              story={story}
              difficulty={difficulty}
              accent={theme.accent}
              completed={getStoryData(difficulty, story.slug).completedParts.length}
              index={index}
              inCart={has(sku)}
              onOpen={() => openStory(story)}
              onBuy={() => (has(sku) ? remove(sku) : add(sku))}
            />
          );
        })}
      </div>

      {showPack && pack && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-2 border-gray-900 px-3 py-2.5">
          <span className="text-base font-black uppercase tracking-tight text-gray-900">
            {t('shelf.wholeLevel', { level: t(`list.difficultyTitle.${difficulty}`) })}
          </span>
          <span className="text-xs text-gray-500">
            {t('shelf.packSaving', { singles: formatPrice(singlesTotal) })}
          </span>
          <span className="ml-auto text-sm font-bold tabular-nums text-gray-900">
            {formatPrice(pack.amountMinor)}
          </span>
          <button
            type="button"
            onClick={() => (has(packSku) ? remove(packSku) : add(packSku))}
            className={`rounded-sm px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
              has(packSku)
                ? 'border border-gray-300 text-gray-500 hover:bg-gray-50'
                : 'bg-gray-900 text-white hover:bg-gray-700'
            }`}
          >
            {has(packSku) ? t('shop.inCart') : t('shop.addToCart')}
          </button>
        </div>
      )}
    </section>
  );
};

export default LevelShelf;
