import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { createOrder, fetchPaymentConfig } from '../services/paymentServices';

/**
 * One click from a subscription to the acquirer's page.
 *
 * There is no basket: a subscription is bought on its own, so every order holds
 * exactly one SKU. Buying one that is already running is a renewal — the
 * server adds the days to its end — so nothing here checks for ownership.
 *
 * A guest is sent to sign in first and comes back to the page they were on.
 */
export function useSubscribe() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [paymentsEnabled, setPaymentsEnabled] = useState(false);
  const [busySku, setBusySku] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const config = await fetchPaymentConfig();
        if (!cancelled) setPaymentsEnabled(config.enabled);
      } catch {
        // Fail closed: an unreachable config leaves the button disabled rather
        // than sending someone into an order that will be refused.
        if (!cancelled) setPaymentsEnabled(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const subscribe = useCallback(
    async (sku: string) => {
      if (!user) {
        navigate('/login', { state: { returnTo: location.pathname } });
        return;
      }
      setBusySku(sku);
      setError(null);
      try {
        const order = await createOrder([sku]);
        window.location.href = order.confirmationUrl;
      } catch (err) {
        const data = (err as { response?: { data?: { error?: string } } }).response?.data;
        setError(data?.error ?? t('shop.paymentsDisabled'));
        setBusySku(null);
      }
    },
    [user, navigate, location.pathname, t],
  );

  return { subscribe, busySku, error, paymentsEnabled, signedIn: Boolean(user) };
}
