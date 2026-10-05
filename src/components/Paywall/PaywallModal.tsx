import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router';
import { IoLockClosed } from 'react-icons/io5';
import { formatPrice } from '../../config/priceCatalog';
import { useCatalog } from '../../context/CatalogContext';
import type { CatalogProduct as Product } from '../../services/catalogServices';
import { useEntitlements } from '../../context/EntitlementsContext';
import { useAuth } from '../../context/AuthContext';
import type { Theme } from '../../types/LevelProgress';

interface Props {
  isOpen: boolean;
  theme: Theme;
  /** Story being blocked, for the heading. */
  storyTitle?: string;
  /** SKUs that would unlock it, smallest scope first (its level, then all). */
  requiredSkus: string[];
  onClose: () => void;
}

/**
 * Offers what would unlock a story: a subscription to its level, or to every
 * level. Stories are not sold one at a time.
 *
 * Shown to guests too. A guest is asked to sign in at the moment they pick an
 * offer, and comes straight back to this page with the modal open again —
 * Login and SignUp honour `returnTo` and `openPaywall` (auth/returnTo.ts).
 */
export const PaywallModal: React.FC<Props> = ({
  isOpen,
  theme,
  storyTitle,
  requiredSkus,
  onClose,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { canBuy } = useEntitlements();
  // Before the early return: hooks cannot be called conditionally.
  const { getProduct } = useCatalog();

  if (!isOpen) return null;

  const offers = requiredSkus
    .map((sku) => getProduct(sku))
    .filter((p): p is Product => p !== null);

  const labelFor = (product: Product) =>
    product.kind === 'level'
      ? t('paywall.subscribeLevel', { level: t(`list.difficultyTitle.${product.difficulty}`) })
      : t('paywall.subscribeAll');

  const choose = (product: Product) => {
    if (!user) {
      navigate('/login', { state: { returnTo: location.pathname, openPaywall: true } });
      return;
    }
    navigate('/shop', { state: { highlightSku: product.sku, returnTo: location.pathname } });
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 dialog-backdrop-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[3px] p-8 max-w-sm w-full text-center shadow-xl dialog-panel-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`w-16 h-16 rounded-full bg-gradient-to-br ${theme.progressGradient} flex items-center justify-center mx-auto mb-5`}
        >
          <IoLockClosed className="w-8 h-8 text-white" aria-hidden="true" />
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {storyTitle || t('paywall.title')}
        </h2>
        <p className="text-gray-500 text-sm mb-6 leading-relaxed">
          {t('paywall.description')}
        </p>

        <div className="space-y-3 mb-4">
          {offers.map((product, index) => {
            const sellable = canBuy(product.sku);
            return (
              <button
                key={product.sku}
                disabled={!sellable}
                onClick={() => choose(product)}
                // The first offer is the level the story is on, so it gets
                // the primary treatment.
                className={`w-full py-3 px-4 rounded-[3px] font-semibold transition-all flex items-center justify-between gap-3 ${
                  !sellable
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : index === 0
                      ? `bg-gradient-to-r ${theme.progressGradient} text-white shadow-md hover:opacity-90 active:scale-95`
                      : 'border border-gray-200 text-gray-700 hover:bg-gray-50 active:scale-95'
                }`}
              >
                <span className="text-sm">{labelFor(product)}</span>
                <span className="text-sm tabular-nums whitespace-nowrap">
                  {sellable
                    ? t('paywall.pricePerPeriod', {
                        price: formatPrice(product.amountMinor),
                        count: product.durationDays ?? 0,
                      })
                    : t('paywall.comingSoon')}
                </span>
              </button>
            );
          })}
        </div>

        {!user && (
          <p className="text-xs text-gray-400 mb-4 leading-relaxed">{t('paywall.loginFirst')}</p>
        )}

        {user && (
          <button
            onClick={() => navigate('/shop')}
            className="text-gray-400 text-sm hover:text-gray-600 transition-colors block w-full mb-2"
          >
            {t('paywall.browseShop')}
          </button>
        )}
        <button
          onClick={onClose}
          className="text-gray-400 text-sm hover:text-gray-600 transition-colors"
        >
          {t('paywall.maybeLater')}
        </button>
      </div>
    </div>
  );
};
