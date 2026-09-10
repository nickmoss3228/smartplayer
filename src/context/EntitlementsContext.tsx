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

interface EntitlementsContextValue extends Entitlements {
  entitlementsLoading: boolean;
  /** Does the signed-in account have full access to this story? */
  owns: (difficulty: string, slug: string) => boolean;
  /** When the all-access pass lapses, as a Date, or null. */
  passExpiresAt: Date | null;
  /** Would the server actually sell this SKU in THIS environment? */
  canBuy: (sku: string) => boolean;
  refreshEntitlements: () => Promise<void>;
}

const EntitlementsContext = createContext<EntitlementsContextValue>({
  ...NO_ENTITLEMENTS,
  entitlementsLoading: true,
  owns: () => false,
  passExpiresAt: null,
  canBuy: () => false,
  refreshEntitlements: async () => {},
});

/**
 * Mounted once above the Router (App.tsx), beside WalletProvider and for the
 * same reason: the story list, the level grid and the player all ask "do I own
 * this?", and re-fetching on every navigation would flash a padlock onto
 * content the user has paid for.
 *
 * It deliberately does NOT re-derive the access rules. The server resolves
 * them in config/entitlements.js and sends the answer; this is a Set lookup
 * over `ownedStories`. Two copies of a paywall rule is how a customer ends up
 * seeing a play button that 403s.
 *
 * Anything that changes what the account owns — returning from checkout, an
 * admin grant — must call refreshEntitlements(), the same discipline
 * setWalletDirect exists for on the wallet side.
 */
export const EntitlementsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
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
      // Fail CLOSED — see NO_ENTITLEMENTS. A network blip must not hand out
      // paid content; the server would refuse the audio anyway, so pretending
      // otherwise only produces a broken player instead of a shop link.
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
      passExpiresAt: data.allAccessExpiresAt ? new Date(data.allAccessExpiresAt) : null,
      canBuy: (sku: string) => purchasableSet.has(sku),
      refreshEntitlements: load,
    }),
    [data, entitlementsLoading, ownedSet, purchasableSet, load],
  );

  return (
    <EntitlementsContext.Provider value={value}>{children}</EntitlementsContext.Provider>
  );
};

export const useEntitlements = () => useContext(EntitlementsContext);
