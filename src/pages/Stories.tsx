import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IoCartOutline, IoInfiniteOutline } from 'react-icons/io5';
import LevelShelf, { type ShelfFilter } from '../components/Stories/LevelShelf';
import { useCart } from '../context/CartContext';
import { useEntitlements } from '../context/EntitlementsContext';
import { useAuth } from '../context/AuthContext';
import { formatPrice, getProduct, type DifficultySlug } from '../config/priceCatalog';
import { fetchPaymentConfig, createOrder, type PaymentConfig } from '../services/paymentServices';

/**
 * One shelf. Every story in the app, owned and unowned side by side.
 *
 * This replaces the separate /shop and /library pages. They were the same
 * catalogue seen from two sides — one showing what you lack, the other what you
 * have — which meant a learner who finished a story had to leave the page they
 * were on, remember a second page existed, and find the same story there. Here
 * ownership is a state on the card, and "my library" is a filter rather than a
 * destination.
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
  const { skus, count, totalMinor, clear, has, add, remove } = useCart();
  const { hasAllAccess, passExpiresAt, canBuy, refreshEntitlements } = useEntitlements();

  const [filter, setFilter] = useState<ShelfFilter>(initialFilter);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPaymentConfig()
      .then(setPaymentConfig)
      // Fail closed: an unreachable config leaves checkout disabled rather than
      // sending someone into an order that will be refused.
      .catch(() =>
        setPaymentConfig({ enabled: false, currency: 'RUB', purchasableSkus: [], fake: false }),
      );
  }, []);

  const pass = getProduct('all-access-90d');
  const passSellable = pass !== null && canBuy('all-access-90d') && !hasAllAccess;

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

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat(t('locale') === 'ru' ? 'ru-RU' : 'en-GB', {
      day: 'numeric',
      month: 'long',
    }).format(date);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-5xl px-4 pb-40 pt-20 sm:px-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900">
              {t('shelf.title')}
            </h1>
            <p className="mt-0.5 text-sm text-gray-400">{t('shelf.subtitle')}</p>
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

        {/* The pass sits above the shelves because it covers all of them. Once
            held, it becomes a statement of what you have rather than an offer. */}
        {hasAllAccess ? (
          <div className="mb-6 flex items-center gap-2.5 border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-700">
            <IoInfiniteOutline size={17} aria-hidden="true" className="shrink-0 text-gray-400" />
            <span>
              {passExpiresAt
                ? t('library.passActive', { date: formatDate(passExpiresAt) })
                : t('library.perpetual')}
            </span>
          </div>
        ) : (
          passSellable &&
          pass &&
          filter !== 'mine' && (
            <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 bg-gray-900 px-3.5 py-3 text-white">
              <span className="text-base font-black uppercase tracking-tight">
                {t('shelf.allAccessTitle')}
              </span>
              <span className="text-xs text-white/60">{t('shop.allAccessBlurb')}</span>
              <span className="ml-auto text-sm font-bold tabular-nums">
                {formatPrice(pass.amountMinor)}
              </span>
              <button
                type="button"
                onClick={() => (has(pass.sku) ? remove(pass.sku) : add(pass.sku))}
                className="rounded-sm bg-white px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-900 transition-opacity hover:opacity-90"
              >
                {has(pass.sku) ? t('shop.inCart') : t('shop.addToCart')}
              </button>
            </div>
          )
        )}

        <div className="flex flex-col gap-9">
          {LEVELS.map((difficulty) => (
            <LevelShelf key={difficulty} difficulty={difficulty} filter={filter} />
          ))}
        </div>
      </div>

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
