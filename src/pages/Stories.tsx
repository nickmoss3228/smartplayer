import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IoCartOutline } from 'react-icons/io5';
import LevelShelf, { type ShelfFilter } from '../components/Stories/LevelShelf';
import ShopStoryPreview from '../components/Stories/ShopStoryPreview';
import { useCart } from '../context/CartContext';
import { useEntitlements } from '../context/EntitlementsContext';
import { useAuth } from '../context/AuthContext';
import { formatPrice } from '../config/priceCatalog';
import type { DifficultySlug, StoryGroup } from '../types/storyGroups';
import { fetchPaymentConfig, createOrder, type PaymentConfig } from '../services/paymentServices';

/**
 * One shelf. Every story in the app, owned and unowned side by side.
 *
 * This replaces the separate /shop and /library pages. They were the same
 * catalogue seen from two sides — one showing what you lack, the other what you
 * have. Here ownership is a state on the card, and "my library" is a filter
 * rather than a destination.
 *
 * /library still routes here with the filter preset, so the navbar entry and
 * any existing link keep working.
 */
const LEVELS: DifficultySlug[] = ['easy', 'medium', 'hard'];

interface Props {
  /** /library enters on 'mine'; /shop and /stories enter on 'all'. */
  initialFilter?: ShelfFilter;
}

const Stories = ({ initialFilter = 'all' }: Props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { skus, count, totalMinor, clear } = useCart();
  const { refreshEntitlements } = useEntitlements();

  const [filter, setFilter] = useState<ShelfFilter>(initialFilter);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<{
    difficulty: DifficultySlug;
    story: StoryGroup;
  } | null>(null);

  // The paywall sends the learner here pointing at what they chose.
  const highlightSku = (location.state as { highlightSku?: string } | null)?.highlightSku ?? null;

  useEffect(() => {
    if (!highlightSku) return;
    // After the shelves have had a moment to render their cards.
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
      <div className="mx-auto max-w-5xl px-4 pb-40 pt-20 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900">
              {t('shelf.title')}
            </h1>
            <p className="mt-0.5 text-sm text-gray-400">{t('shop.subtitle')}</p>
          </div>

          {/* Filter, not navigation. "My library" is a view of this page. */}
          <div className="flex gap-1.5">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                aria-pressed={filter === f.id}
                className={`rounded-sm border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
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

        <div className="flex flex-col gap-9">
          {LEVELS.map((difficulty) => (
            <LevelShelf
              key={difficulty}
              difficulty={difficulty}
              filter={filter}
              highlightSku={highlightSku}
              onPreview={(story) => setPreviewing({ difficulty, story })}
            />
          ))}
        </div>
      </div>

      {previewing && (
        <ShopStoryPreview
          difficulty={previewing.difficulty}
          story={previewing.story}
          onClose={() => setPreviewing(null)}
        />
      )}

      {/* Basket bar. A sticky strip rather than a drawer, so the running total
          stays visible while browsing instead of hiding behind a button. */}
      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
            <span className="flex items-center gap-2 text-sm text-gray-600">
              <IoCartOutline size={18} aria-hidden="true" />
              {t('shop.cartTitle')} · {count}
            </span>
            <span className="ml-auto text-base font-bold tabular-nums text-gray-900">
              {t('shop.total')} {formatPrice(totalMinor)}
            </span>
            <button
              type="button"
              onClick={clear}
              className="rounded-sm border border-gray-200 px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50"
            >
              {t('shop.remove')}
            </button>
            <button
              type="button"
              onClick={checkout}
              disabled={busy || !paymentConfig?.enabled}
              className="rounded-sm bg-gray-900 px-5 py-2 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
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
