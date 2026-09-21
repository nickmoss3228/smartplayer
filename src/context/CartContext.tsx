// context/CartContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useCatalog } from "./CatalogContext";
import { useEntitlements } from "./EntitlementsContext";

const STORAGE_KEY = "malako:cart:v1";

interface CartContextValue {
  skus: string[];
  /** Items that will actually be charged — a story next to its set counts once. */
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
 * exactly nothing — it can only make the shopper's own screen wrong. And a
 * guest has to be able to fill a basket BEFORE signing up, which a server cart
 * cannot do without an anonymous session concept this app does not have.
 *
 * Only SKU strings are stored. Never prices — a price in localStorage is a
 * price a user can edit, and it would go stale against the catalog anyway.
 */
export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { ownedStories } = useEntitlements();
  const { getProduct, collapseBasket, priceFor, catalogLoading } = useCatalog();
  const [skus, setSkus] = useState<string[]>([]);
  const [restored, setRestored] = useState(false);

  // Load once, but NOT before the catalog has arrived.
  //
  // Anything the catalog no longer knows is dropped here rather than erroring
  // at checkout: a SKU can disappear between sessions (the old 90-day pass and
  // level packs did). That filter is only meaningful against a real catalog —
  // running it while the catalog is still empty would call every SKU unknown
  // and silently empty the basket of anyone who had one saved.
  useEffect(() => {
    if (catalogLoading || restored) return;
    setRestored(true);
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
  }, [catalogLoading, restored, getProduct]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(skus));
    } catch {
      // Private browsing / quota. The basket still works for this session.
    }
  }, [skus]);

  // Prune anything the shopper has since come to own outright — after a
  // purchase, and after an admin grant. Without this the basket would still
  // offer to sell them what they just bought.
  //
  // Gated on the catalog, for the same reason the restore above is: every
  // getProduct returns null before it lands, which reads as "you own all of
  // this" and would empty the basket.
  useEffect(() => {
    if (catalogLoading || ownedStories.length === 0) return;
    const owned = new Set(ownedStories);
    setSkus((current) =>
      current.filter((sku) => {
        const product = getProduct(sku);
        return product !== null && !product.storyKeys.every((key) => owned.has(key));
      }),
    );
  }, [ownedStories, catalogLoading, getProduct]);

  const add = useCallback(
    (sku: string) => {
      if (!getProduct(sku)) return;
      setSkus((current) => (current.includes(sku) ? current : [...current, sku]));
    },
    [getProduct],
  );

  const remove = useCallback((sku: string) => {
    setSkus((current) => current.filter((s) => s !== sku));
  }, []);

  const clear = useCallback(() => setSkus([]), []);

  const value = useMemo<CartContextValue>(() => {
    // Mirrors the server's normalization so the displayed total matches what
    // will actually be charged: covered items drop out, and a set costs only
    // the tracks the shopper does not own yet.
    const { kept } = collapseBasket(skus);
    return {
      skus,
      count: kept.length,
      totalMinor: kept.reduce((sum, sku) => sum + priceFor(getProduct(sku), ownedStories), 0),
      has: (sku: string) => skus.includes(sku),
      add,
      remove,
      clear,
    };
  }, [skus, ownedStories, add, remove, clear, collapseBasket, priceFor, getProduct]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => useContext(CartContext);
