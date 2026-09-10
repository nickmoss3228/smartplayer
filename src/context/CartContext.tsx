// context/CartContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { getProduct } from "../config/priceCatalog";
import { useEntitlements } from "./EntitlementsContext";

const STORAGE_KEY = "malako:cart:v1";

interface CartContextValue {
  skus: string[];
  count: number;
  /** Client-side total, for display only. The server re-prices every order. */
  totalMinor: number;
  has: (sku: string) => boolean;
  add: (sku: string) => void;
  remove: (sku: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue>({
  skus: [],
  count: 0,
  totalMinor: 0,
  has: () => false,
  add: () => {},
  remove: () => {},
  clear: () => {},
});

/**
 * The basket. Client-side, in localStorage, following the same pattern as
 * services/guestProgress.ts and services/deviceId.ts.
 *
 * Why not server-side: the basket grants nothing and holds no money. The server
 * re-prices every order from config/priceCatalog.js, so a tampered basket buys
 * exactly nothing — it can only make the shopper's own screen wrong. Persisting
 * at most a dozen SKU strings would otherwise cost a collection, endpoints, TTL
 * cleanup and a merge-on-login story. And a guest has to be able to fill a
 * basket BEFORE signing up, which a server cart cannot do without an anonymous
 * session concept this app does not have.
 *
 * Only SKU strings are stored. Never prices — a price in localStorage is a
 * price a user can edit, and it would go stale against the catalog anyway.
 */
export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { ownedStories, hasAllAccess } = useEntitlements();
  const [skus, setSkus] = useState<string[]>([]);

  // Load once. Anything the catalog no longer knows is dropped here rather than
  // erroring at checkout: a SKU can disappear between sessions.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        setSkus(parsed.filter((s) => typeof s === "string" && getProduct(s) !== null));
      }
    } catch {
      // A corrupt basket is not worth surfacing — start empty.
      setSkus([]);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(skus));
    } catch {
      // Private browsing / quota. The basket still works for this session.
    }
  }, [skus]);

  // Prune anything the shopper has since come to own — after a purchase, and
  // after an admin grant. Without this the basket would still offer to sell
  // them what they just bought.
  useEffect(() => {
    if (!hasAllAccess && ownedStories.length === 0) return;
    setSkus((current) =>
      current.filter((sku) => {
        const product = getProduct(sku);
        if (!product) return false;
        // The pass is dated: re-buying it extends it, so it is never pruned.
        if (product.durationDays !== null) return true;
        if (hasAllAccess) return false;
        if (product.kind === "story" && product.storyKey) {
          return !ownedStories.includes(product.storyKey);
        }
        return true;
      }),
    );
  }, [ownedStories, hasAllAccess]);

  const add = useCallback((sku: string) => {
    if (!getProduct(sku)) return;
    setSkus((current) => (current.includes(sku) ? current : [...current, sku]));
  }, []);

  const remove = useCallback((sku: string) => {
    setSkus((current) => current.filter((s) => s !== sku));
  }, []);

  const clear = useCallback(() => setSkus([]), []);

  const value = useMemo<CartContextValue>(() => {
    // Mirrors the server's normalization so the displayed total matches what
    // will actually be charged: an all-access pass subsumes everything else.
    const effective = skus.includes("all-access-90d") ? ["all-access-90d"] : skus;
    return {
      skus,
      count: skus.length,
      totalMinor: effective.reduce((sum, sku) => sum + (getProduct(sku)?.amountMinor ?? 0), 0),
      has: (sku: string) => skus.includes(sku),
      add,
      remove,
      clear,
    };
  }, [skus, add, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => useContext(CartContext);
