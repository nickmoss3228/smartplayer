// context/EntitlementsContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useAuth } from "./AuthContext";
import {
  fetchEntitlements,
  NO_ENTITLEMENTS,
  type Entitlements,
} from "../services/entitlementServices";
import { storyKey } from "../config/priceCatalog";
import { useCatalog } from "./CatalogContext";

interface EntitlementsContextValue extends Entitlements {
  entitlementsLoading: boolean;
  /** Has the signed-in account bought this story (directly, or via a set or level)? */
  owns: (difficulty: string, slug: string) => boolean;
  /** Would the server actually sell this SKU in THIS environment? */
  canBuy: (sku: string) => boolean;
  refreshEntitlements: () => Promise<void>;
}

const EntitlementsContext = createContext<EntitlementsContextValue>({
  ...NO_ENTITLEMENTS,
  entitlementsLoading: true,
  owns: () => false,
  canBuy: () => false,
  refreshEntitlements: async () => {},
});

/**
 * Mounted once above the Router (App.tsx), beside WalletProvider and for the
 * same reason: the story list, the level grid and the player all ask "do I own
 * this?", and re-fetching on every navigation would flash a padlock onto
 * content the user has paid for.
 *
 * Ownership comes from the server (`ownedStories`); this is a Set lookup over
 * it. How much of an UNOWNED story is free is a property of the story's length
 * and lives in config/priceCatalog.ts, mirrored from the server.
 *
 * Anything that changes what the account owns — returning from checkout, an
 * admin grant — must call refreshEntitlements(), the same discipline
 * setWalletDirect exists for on the wallet side.
 */
export const EntitlementsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const { getProduct } = useCatalog();
  const [data, setData] = useState<Entitlements>(NO_ENTITLEMENTS);
  const [entitlementsLoading, setEntitlementsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      // A guest owns nothing. Not an error state, and not worth a request.
      setData(NO_ENTITLEMENTS);
      setEntitlementsLoading(false);
      return;
    }
    try {
      setData(await fetchEntitlements());
    } catch (err) {
      // Fail CLOSED — see NO_ENTITLEMENTS.
      console.error("[EntitlementsContext] Failed to load entitlements:", err);
      setData(NO_ENTITLEMENTS);
    } finally {
      setEntitlementsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    setEntitlementsLoading(true);
    load();
  }, [load]);

  const ownedSet = useMemo(() => new Set(data.ownedStories), [data.ownedStories]);
  const purchasableSet = useMemo(
    () => new Set(data.purchasableSkus),
    [data.purchasableSkus],
  );

  const value = useMemo<EntitlementsContextValue>(
    () => ({
      ...data,
      entitlementsLoading,
      owns: (difficulty: string, slug: string) => ownedSet.has(storyKey(difficulty, slug)),
      // A guest has no entitlements response to read this from, but still has
      // to see real prices and buy buttons — buying is what signs them in.
      // /api/catalog is public precisely so this question has an answer for
      // them; its `purchasable` already folds in the environment's
      // PURCHASABLE_SKUS, so the two branches agree. Checkout asks the server
      // again either way.
      canBuy: (sku: string) =>
        user ? purchasableSet.has(sku) : getProduct(sku)?.purchasable === true,
      refreshEntitlements: load,
    }),
    [data, entitlementsLoading, ownedSet, purchasableSet, load, user, getProduct],
  );

  return (
    <EntitlementsContext.Provider value={value}>{children}</EntitlementsContext.Provider>
  );
};

export const useEntitlements = () => useContext(EntitlementsContext);
