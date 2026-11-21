import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  IoCheckmarkCircle,
  IoCloseCircle,
  IoHourglassOutline,
  IoLockOpenOutline,
  IoFlaskOutline,
} from 'react-icons/io5';
import {
  actOnFakePayment,
  fetchFakePayment,
  fetchOrder,
  fetchPaymentConfig,
  type FakeAction,
  type FakePayment,
  type FakeAmount,
  type FakeDeliver,
  type FakeSim,
  type OrderItem,
  type OrderStatus,
  type PaymentConfig,
} from '../services/paymentServices';
import { useEntitlements } from '../context/EntitlementsContext';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../config/priceCatalog';
import { useCatalog } from '../context/CatalogContext';

/**
 * Where the acquirer sends the buyer back to.
 *
 * This page GRANTS NOTHING. It polls the server and reports what the server
 * says. The webhook is the source of truth — someone who closes the tab after
 * paying must still receive what they bought, and someone who forges this URL
 * must receive nothing. That asymmetry is the whole reason the grant does not
 * live here.
 *
 * ONE ROUTE, NOT TWO. There is deliberately no /checkout/success: some banks
 * send every outcome to the success URL, so a route named after an outcome would
 * eventually show a success page to someone whose card was declined. `?hint=fail`
 * only changes the wording while the poll continues.
 *
 * Polling exists because the redirect frequently beats the callback by a second
 * or two; `granted` (entitlements actually written), not `status`, is what the
 * UI waits for.
 */
const POLL_INTERVAL_MS = 1500;
const MAX_POLLS = 12; // ~18s, then hand over to the reconciler and say so

/** Names an order line without inventing per-SKU copy the catalog does not have. */
const useItemLabel = () => {
  const { t } = useTranslation();
  const { getProduct } = useCatalog();
  return (item: OrderItem) => {
    const product = getProduct(item.sku);
    if (product?.kind === 'set') return t('payment.itemSet');
    if (product?.kind === 'level') return t('payment.itemLevel');
    if (product?.kind === 'story') return t('payment.itemStory');
    return item.sku;
  };
};

/** Deep link to something the buyer just unlocked, when we can name one. */
const firstStoryPath = (
  items: OrderItem[],
  getProduct: (sku: string) => { storyKey?: string } | null,
): string | null => {
  for (const item of items) {
    const key = getProduct(item.sku)?.storyKey;
    if (key) return `/levels/${key}`;
  }
  return null;
};

const CheckoutReturn = () => {
  const { getProduct } = useCatalog();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { refreshEntitlements } = useEntitlements();
  const { clear } = useCart();
  const itemLabel = useItemLabel();

  const orderId = params.get('orderId');
  // Set by the fail URL on banks that distinguish the two outcomes. A hint, not
  // a verdict — the callback still decides.
  const hintedFail = params.get('hint') === 'fail';

  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const polls = useRef(0);
  const cleared = useRef(false);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    fetchPaymentConfig()
      .then(setConfig)
      .catch(() => setConfig(null));
  }, []);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;

    const tick = async () => {
      try {
        const next = await fetchOrder(orderId);
        if (cancelled) return;
        setOrder(next);

        if (next.granted) {
          // Refresh once, not on every poll — the padlocks come off here.
          if (!cleared.current) {
            cleared.current = true;
            clear();
            await refreshEntitlements();
          }
          return;
        }
        if (next.status === 'canceled' || next.status === 'failed') return;

        polls.current += 1;
        setPollCount(polls.current);
        if (polls.current >= MAX_POLLS) {
          setTimedOut(true);
          return;
        }
        setTimeout(tick, POLL_INTERVAL_MS);
      } catch {
        if (!cancelled) setTimedOut(true);
      }
    };

    tick();
    return () => {
      cancelled = true;
    };
    // refreshEntitlements/clear are stable enough; re-running on their identity
    // would restart the poll loop on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  if (!orderId) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 text-center text-gray-400">
        {t('payment.failed')}
      </div>
    );
  }

  const granted = order?.granted === true;
  const canceled = order?.status === 'canceled';
  const failed = order?.status === 'failed';
  const dead = canceled || failed;
  // Nothing has landed, we have stopped waiting, and the bank hinted a failure.
  const leansFailed = !granted && !dead && hintedFail && timedOut;

  const heading = granted
    ? t('payment.success')
    : canceled
      ? t('payment.canceled')
      : failed || leansFailed
        ? t('payment.failed')
        : t('payment.pending');

  const storyPath = order ? firstStoryPath(order.items, getProduct) : null;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-md px-4 pt-24 text-center">
        <div className="rounded-[3px] border border-gray-200 bg-white p-8">
          {granted ? (
            <IoCheckmarkCircle size={44} className="mx-auto mb-4 text-green-600" aria-hidden="true" />
          ) : dead || leansFailed ? (
            <IoCloseCircle size={44} className="mx-auto mb-4 text-gray-300" aria-hidden="true" />
          ) : (
            <IoHourglassOutline size={44} className="mx-auto mb-4 animate-pulse text-gray-300" aria-hidden="true" />
          )}

          <h1 className="mb-2 text-lg font-bold text-gray-900">{heading}</h1>

          {granted && <p className="mb-6 text-sm text-gray-500">{t('payment.successBody')}</p>}
          {canceled && <p className="mb-6 text-sm text-gray-500">{t('payment.canceledBody')}</p>}
          {(failed || leansFailed) && (
            <p className="mb-6 text-sm text-gray-500">{t('payment.failedBody')}</p>
          )}

          {/* What was bought. On success it is what was UNLOCKED, which is the
              question the buyer actually has at this moment. */}
          {order && (
            <div className="mb-6 rounded-[3px] bg-gray-50 px-4 py-3 text-left">
              {granted && (
                <p className="font-mono mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-green-700">
                  <IoLockOpenOutline aria-hidden="true" />
                  {t('payment.unlocked')}
                </p>
              )}
              <ul className="space-y-1">
                {order.items.map((item) => (
                  <li key={item.sku} className="flex justify-between gap-3 text-sm text-gray-700">
                    <span>{itemLabel(item)}</span>
                    <span className="tabular-nums text-gray-500">
                      {formatPrice(item.amountMinor, order.currency)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 border-t border-gray-200 pt-2 text-right text-sm font-semibold tabular-nums text-gray-900">
                {formatPrice(order.amountMinor, order.currency)}
              </p>
            </div>
          )}

          {/* The honest message when the callback has not landed in time. The
              reconciliation job settles it within a few minutes, so this is a
              "come back shortly", not a failure. */}
          {timedOut && !granted && !dead && !leansFailed && (
            <p className="mb-6 rounded-[3px] bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
              {t('payment.stillProcessing')}
            </p>
          )}

          <div className="space-y-2">
            {granted && storyPath && (
              <button
                onClick={() => navigate(storyPath)}
                className="w-full rounded-[3px] bg-ink py-3 text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                {t('payment.startListening')}
              </button>
            )}
            <button
              onClick={() => navigate('/library')}
              className="w-full rounded-[3px] bg-gray-900 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
            >
              {t('payment.backToLibrary')}
            </button>
            <button
              onClick={() => navigate('/shop')}
              className="w-full rounded-[3px] border border-gray-200 py-3 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50 active:scale-95"
            >
              {t('library.goToShop')}
            </button>
          </div>
        </div>

        {config?.testMode && (
          <Diagnostics order={order} config={config} polls={pollCount} startedAt={startedAt.current} />
        )}
      </div>
    </div>
  );
};

/**
 * Developer surface, non-production only — the server withholds every field it
 * needs when NODE_ENV is production.
 *
 * Deliberately untranslated: it is read by whoever is testing the payment
 * system, not by a buyer, and the same precedent is set by the fake bank page
 * below. Its job is to make a test run readable off the page instead of out of a
 * terminal and a devtools tab.
 */
const Diagnostics = ({
  order,
  config,
  polls,
  startedAt,
}: {
  order: OrderStatus | null;
  config: PaymentConfig;
  polls: number;
  startedAt: number;
}) => {
  const rows: [string, string][] = [
    ['driver', config.driver ?? '—'],
    ['order', order?.orderId ?? '—'],
    ['status', order?.status ?? '—'],
    ['granted', order?.granted ? 'yes' : 'no'],
    ['acquirer id', order?.providerPaymentId ?? '— (not yet returned)'],
    ['paidAt', order?.paidAt ? new Date(order.paidAt).toISOString() : '—'],
    ['polls', String(polls)],
    ['elapsed', `${((Date.now() - startedAt) / 1000).toFixed(1)}s`],
  ];

  return (
    <div className="mt-4 rounded-[3px] border border-dashed border-gray-300 bg-white/60 p-4 text-left">
      <p className="font-mono mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-gray-400">
        <IoFlaskOutline aria-hidden="true" />
        Test mode
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-[11px] text-gray-500">
        {rows.map(([key, value]) => (
          <div key={key} className="contents">
            <dt className="text-gray-400">{key}</dt>
            <dd className="break-all">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

/**
 * The fake acquirer's payment page.
 *
 * Stands in for the bank's hosted page, and behaves like one in the way that
 * matters: pressing a button records the decision and redirects the browser
 * home IMMEDIATELY, while the notification is still in flight. The callback
 * arrives at the webhook a few seconds later, out of band, over real HTTP.
 *
 * The simulation switches are the reason this exists rather than a two-button
 * stub. Duplicate deliveries, wrong amounts and lost callbacks are the cases
 * that actually break payment integrations, and they are all but impossible to
 * produce on demand against a real acquirer.
 *
 * Reached only while a driver that moves no money is selected — every endpoint
 * it calls 404s otherwise.
 */
export const FakeCheckout = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const fakeId = params.get('fp');

  const [payment, setPayment] = useState<FakePayment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sim, setSim] = useState<Required<FakeSim>>({
    delayMs: 2000,
    deliver: 'once',
    amount: 'correct',
  });

  useEffect(() => {
    if (!fakeId) return;
    fetchFakePayment(fakeId)
      .then((row) => {
        setPayment(row);
        setSim(row.sim);
      })
      .catch(() => setError('Unknown payment, or the fake driver is not selected.'));
  }, [fakeId]);

  const finish = useCallback(
    async (action: FakeAction) => {
      if (!fakeId || !payment) return;
      setBusy(true);
      try {
        await actOnFakePayment(fakeId, action, sim);
      } catch {
        setBusy(false);
        setError('The acquirer refused that action.');
        return;
      }
      // Home immediately, WITHOUT waiting for the callback. This ordering is the
      // point of the whole exercise.
      const hint = action === 'pay' ? '' : '&hint=fail';
      navigate(`/checkout/return?orderId=${payment.orderId}${hint}`, { replace: true });
    },
    [fakeId, payment, sim, navigate]
  );

  if (error) {
    return <div className="min-h-screen bg-gray-50 pt-24 text-center text-sm text-gray-400">{error}</div>;
  }
  if (!payment) {
    return <div className="min-h-screen bg-gray-50 pt-24 text-center text-sm text-gray-400">Loading…</div>;
  }

  const decided = payment.status !== 'PENDING' && payment.status !== 'NEW';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-md px-4 pt-24">
        <div className="rounded-[3px] border-2 border-dashed border-amber-300 bg-white p-8 text-center">
          <p className="font-mono mb-1 flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-amber-600">
            <IoFlaskOutline aria-hidden="true" />
            Test payment page
          </p>
          <p className="mb-6 text-sm text-gray-500">
            No real money moves here. This stands in for the bank&apos;s page.
          </p>

          <p className="text-2xl font-bold tabular-nums text-gray-900">
            {formatPrice(payment.amountMinor, payment.currency)}
          </p>
          <p className="mb-6 font-mono text-[11px] text-gray-400">order {payment.orderId}</p>

          {decided ? (
            <p className="rounded-[3px] bg-gray-50 px-3 py-2 text-sm text-gray-500">
              Already decided: <span className="font-mono">{payment.status}</span>
              {payment.delivered ? ' · callback delivered' : ' · callback not delivered'}
            </p>
          ) : (
            <>
              <div className="mb-6 space-y-2 rounded-[3px] bg-gray-50 p-3 text-left">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gray-400">
                  Simulate
                </p>
                <SimRow
                  label="delay"
                  value={String(sim.delayMs)}
                  options={[
                    ['0', '0s'],
                    ['3000', '3s'],
                    ['30000', '30s'],
                  ]}
                  onPick={(v) => setSim((s) => ({ ...s, delayMs: Number(v) }))}
                />
                <SimRow
                  label="deliver"
                  value={sim.deliver}
                  options={[
                    ['once', 'once'],
                    ['twice', 'twice'],
                    ['never', 'never'],
                  ]}
                  onPick={(v) => setSim((s) => ({ ...s, deliver: v as FakeDeliver }))}
                />
                <SimRow
                  label="amount"
                  value={sim.amount}
                  options={[
                    ['correct', 'correct'],
                    ['wrong', 'wrong'],
                  ]}
                  onPick={(v) => setSim((s) => ({ ...s, amount: v as FakeAmount }))}
                />
              </div>

              <div className="space-y-2">
                <button
                  disabled={busy}
                  onClick={() => finish('pay')}
                  className="w-full rounded-[3px] bg-ink py-3 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-45"
                >
                  Pay
                </button>
                <button
                  disabled={busy}
                  onClick={() => finish('decline')}
                  className="w-full rounded-[3px] border border-gray-200 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 active:scale-95 disabled:opacity-40"
                >
                  Decline
                </button>
                <button
                  disabled={busy}
                  onClick={() => finish('cancel')}
                  className="w-full rounded-[3px] py-3 text-sm font-medium text-gray-400 hover:text-gray-600 active:scale-95 disabled:opacity-40"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const SimRow = ({
  label,
  value,
  options,
  onPick,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onPick: (value: string) => void;
}) => (
  <div className="flex items-center justify-between gap-2">
    <span className="font-mono text-[11px] text-gray-400">{label}</span>
    <div className="flex gap-1">
      {options.map(([key, text]) => (
        <button
          key={key}
          onClick={() => onPick(key)}
          className={`rounded-[3px] px-2 py-1 font-mono text-[11px] transition-colors ${
            value === key
              ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-500 hover:bg-gray-100'
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  </div>
);

export default CheckoutReturn;
