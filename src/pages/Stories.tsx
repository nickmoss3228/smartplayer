import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IoCartOutline, IoClose } from 'react-icons/io5';
import LevelShelf, { useShopStories, type ShelfFilter } from '../components/Stories/LevelShelf';
import type { LevelSummary } from '../components/Stories/OfferLadder';
import ShopStoryPreview from '../components/Stories/ShopStoryPreview';
import { useCart } from '../context/CartContext';
import { useEntitlements } from '../context/EntitlementsContext';
import { useAuth } from '../context/AuthContext';
import { useCatalog } from '../context/CatalogContext';
import { formatPrice, storyKey } from '../config/priceCatalog';
import type { DifficultySlug, StoryGroup } from '../types/storyGroups';
import { fetchPaymentConfig, createOrder, type PaymentConfig } from '../services/paymentServices';

/**
 * The shop. One level at a time, picked from tabs; each level opens on the
 * three ways to buy (one story, the character's set, everything) and then its
 * stories, so what a purchase contains is always on screen next to its price.
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
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { skus, count, totalMinor, clear, remove } = useCart();
  const { refreshEntitlements } = useEntitlements();
  const { products, getProduct } = useCatalog();

  const [filter, setFilter] = useState<ShelfFilter>(initialFilter);
  const [level, setLevel] = useState<DifficultySlug>('easy');
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const setTitle = (character: string) => t(`shelf.sets.${character}`, { defaultValue: character });
  const characterName = (character: string) =>
    t(`shelf.characters.${character}`, { defaultValue: character });

  // The set holding each level's stories — its character names the tab, and
  // its contents fill the "everything" card.
  const levelSet = (difficulty: DifficultySlug) =>
    products.find(
      (p) => p.kind === 'set' && p.storyKeys.some((key) => key.startsWith(`${difficulty}/`)),
    ) ?? null;

  const levels: LevelSummary[] = LEVELS.map((difficulty) => {
    const set = levelSet(difficulty);
    return {
      difficulty,
      setTitle: set?.character ? setTitle(set.character) : null,
      tracks: set
        ? set.parts
        : shelves[difficulty].stories.reduce((sum, s) => sum + s.totalTracks, 0),
    };
  });

  // The paywall sends the learner here pointing at what they chose.
  const highlightSku = (location.state as { highlightSku?: string } | null)?.highlightSku ?? null;

  // Open on the level that holds the highlighted item, once the catalog says.
  useEffect(() => {
    if (!highlightSku) return;
    const product = getProduct(highlightSku);
    const difficulty = (product?.difficulty ?? product?.storyKeys[0]?.split('/')[0]) as
      | DifficultySlug
      | undefined;
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

  useEffect(() => {
    fetchPaymentConfig()
      .then(setPaymentConfig)
      // Fail closed: an unreachable config leaves checkout disabled rather than
      // sending someone into an order that will be refused.
      .catch(() =>
        setPaymentConfig({ enabled: false, currency: 'RUB', purchasableSkus: [], fake: false }),
      );
  }, []);

  const filters: { id: ShelfFilter; label: string }[] = useMemo(
    () => [
      { id: 'all', label: t('shelf.filterAll') },
      { id: 'mine', label: t('shelf.filterMine') },
      { id: 'buy', label: t('shelf.filterBuy') },
    ],
    [t],
  );

  // What a basket line is called: the story's title, the set's name, or the level.
  const titleByKey = new Map(
    LEVELS.flatMap((d) => shelves[d].stories.map((s) => [storyKey(d, s.slug), s.title] as const)),
  );
  const itemLabel = (sku: string) => {
    const product = getProduct(sku);
    if (!product) return sku;
    if (product.kind === 'set') return setTitle(product.character ?? '');
    if (product.kind === 'level') {
      return t('shelf.wholeLevel', { level: t(`list.difficultyTitle.${product.difficulty}`) });
    }
    return titleByKey.get(product.storyKey ?? '') ?? product.storyKey ?? sku;
  };

  const checkout = async () => {
    if (!user) {
      navigate('/login', { state: { returnTo: location.pathname } });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const order = await createOrder(skus);
      // The basket is cleared on RETURN, not here: abandoning the provider's
      // page should bring you back to a basket that still has your items.
      window.location.href = order.confirmationUrl;
    } catch (err) {
      const data = (err as { response?: { data?: { error?: string; code?: string } } }).response
        ?.data;
      if (data?.code === 'ALREADY_OWNED') {
        await refreshEntitlements();
        clear();
      }
      setError(data?.error ?? t('shop.paymentsDisabled'));
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 pb-40 pt-20 sm:gap-8 sm:px-6">
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
        <nav aria-label={t('shop.ladder.levels')} className="grid grid-cols-3 gap-2">
          {LEVELS.map((difficulty) => {
            const active = level === difficulty;
            const set = levelSet(difficulty);
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
                  {set?.character && <span>{characterName(set.character)}</span>}
                  <span className="hidden sm:inline">
                    {!loading && (
                      <>
                        {set?.character && ' · '}
                        {t('shop.ladder.storiesCount', { count: stories.length })}
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
          setTitle={setTitle}
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

      {/* Basket bar. A sticky strip rather than a drawer, so what is in the
          basket and what it costs stay visible while browsing. Each item is
          named, so a set reads as the set rather than as a number. */}
      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
            <span className="flex items-center gap-2 text-sm text-gray-600">
              <IoCartOutline size={18} aria-hidden="true" />
              {t('shop.cartTitle')}
            </span>
            <ul className="flex min-w-0 flex-wrap gap-1.5">
              {skus.map((sku) => {
                const label = itemLabel(sku);
                return (
                  <li
                    key={sku}
                    className="flex items-center gap-1.5 rounded-chip border border-gray-300 py-1 pl-2.5 pr-1 text-[13px] font-semibold text-gray-900"
                  >
                    <span className="max-w-[16rem] truncate">{label}</span>
                    <button
                      type="button"
                      onClick={() => remove(sku)}
                      aria-label={t('shop.ladder.removeItem', { name: label })}
                      className="flex h-7 w-7 items-center justify-center rounded-[3px] bg-gray-100 text-gray-600 hover:bg-gray-200"
                    >
                      <IoClose size={14} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
            <span className="ml-auto text-base font-bold tabular-nums text-gray-900">
              {t('shop.total')} {formatPrice(totalMinor)}
            </span>
            <button
              type="button"
              onClick={checkout}
              disabled={busy || !paymentConfig?.enabled}
              className="h-11 rounded-[3px] bg-gray-900 px-5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {!user
                ? t('shop.checkoutLoginRequired')
                : paymentConfig?.enabled
                  ? t('shop.checkout')
                  : t('shop.paymentsDisabled')}
            </button>
          </div>
          {error && (
            <div className="mx-auto max-w-5xl px-4 pb-3 text-xs text-red-600 sm:px-6">{error}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default Stories;
