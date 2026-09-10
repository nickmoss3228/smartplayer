import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router';
import { IoLockClosed } from 'react-icons/io5';
import { getProduct, formatPrice, type Product } from '../../config/priceCatalog';
import { useEntitlements } from '../../context/EntitlementsContext';
import { useAuth } from '../../context/AuthContext';
import type { Theme } from '../../types/LevelProgress';

interface Props {
  isOpen: boolean;
  theme: Theme;
  /** Story being blocked, for the heading. */
  storyTitle?: string;
  /** SKUs that would unlock it, cheapest scope first (from the server). */
  requiredSkus: string[];
  onClose: () => void;
}

/**
 * Sells a specific story. Deliberately a SIBLING of TrialGateModal rather than
 * a mode of it: that one sells signing up (its CTAs are /signup and /login),
 * this one sells a SKU. Different audience, different copy, different actions
 * — merging them produces one component with two disjoint halves.
 *
 * A signed-out visitor never sees this. They get TrialGateModal, because
 * "create an account" is the cheaper ask and the starter pack is genuinely
 * free; asking a stranger for 1290 ₽ before they have an account is the wrong
 * order.
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

  if (!isOpen) return null;

  // The server said these unlock it; the client decides which are sellable in
  // this environment. A placeholder pack with purchasable:false is listed as
  // "coming soon" rather than hidden — the buyer should see that the story
  // exists and is planned, not that the app is missing a price.
  const offers = requiredSkus
    .map((sku) => getProduct(sku))
    .filter((p): p is Product => p !== null);

  const labelFor = (product: Product) => {
    if (product.kind === 'pass') return t('paywall.buyAllAccess');
    if (product.kind === 'pack') return t('paywall.buyPack');
    return t('paywall.buyStory');
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`w-16 h-16 rounded-full bg-gradient-to-br ${theme.progressGradient} flex items-center justify-center mx-auto mb-5 shadow-lg`}
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
                onClick={() =>
                  navigate('/shop', {
                    state: { highlightSku: product.sku, returnTo: location.pathname },
                  })
                }
                // The first offer is the smallest sufficient purchase, so it
                // gets the primary treatment — the cheapest way out of the
                // modal should be the one that reads as the default.
                className={`w-full py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-between gap-3 ${
                  !sellable
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : index === 0
                      ? `bg-gradient-to-r ${theme.progressGradient} text-white shadow-md hover:opacity-90 active:scale-95`
                      : 'border border-gray-200 text-gray-700 hover:bg-gray-50 active:scale-95'
                }`}
              >
                <span className="text-sm">{labelFor(product)}</span>
                <span className="text-sm tabular-nums whitespace-nowrap">
                  {sellable ? formatPrice(product.amountMinor) : t('paywall.comingSoon')}
                </span>
              </button>
            );
          })}
        </div>

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
