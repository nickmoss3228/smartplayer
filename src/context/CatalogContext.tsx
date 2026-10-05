// context/CatalogContext.tsx
//
// The server's catalog, fetched once and shared. This is the client half of
// GET /api/catalog — see that controller for why the catalog stopped being
// bundled with the frontend.
//
// Everything sold is a subscription — one level, or all of them — so the
// helpers below are lookups, not arithmetic: a subscription's price does not
// depend on who is buying it. What is NOT here is anything that decides access:
// `owns` stays in EntitlementsContext, and the audio gate stays on the server.
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  fetchCatalog,
  NO_CATALOG,
  type Catalog,
  type CatalogProduct,
  type CatalogStory,
} from "../services/catalogServices";

interface CatalogContextValue {
  currency: string;
  /** False while nothing is sold — see Catalog.paywallEnabled. */
  paywallEnabled: boolean;
  /** See Catalog.signupWallEnabled. */
  signupWallEnabled: boolean;
  products: CatalogProduct[];
  stories: CatalogStory[];
  /**
   * False until the server has answered. Every price and every buy button must
   * wait on this: an empty catalog is indistinguishable from "nothing is for
   * sale", and painting that first is how a shop flashes an empty shelf.
   */
  catalogLoading: boolean;
  getProduct: (sku: string) => CatalogProduct | null;
  getCatalogStory: (key: string) => CatalogStory | null;
  /** Which SKUs unlock a story — smallest scope first: its level, then all. */
  skusGranting: (key: string) => string[];
  /** The subscription to one level, if that level has anything paid on it. */
  levelSubscription: (difficulty: string) => CatalogProduct | null;
  /** The subscription to every level. */
  allSubscription: CatalogProduct | null;
  refreshCatalog: () => Promise<void>;
}

const EMPTY: CatalogContextValue = {
  ...NO_CATALOG,
  catalogLoading: true,
  getProduct: () => null,
  getCatalogStory: () => null,
  skusGranting: () => [],
  levelSubscription: () => null,
  allSubscription: null,
  refreshCatalog: async () => {},
};

const CatalogContext = createContext<CatalogContextValue>(EMPTY);

export const CatalogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<Catalog>(NO_CATALOG);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const load = React.useCallback(async () => {
    try {
      setData(await fetchCatalog());
    } catch (err) {
      // An unreachable catalog leaves the shop unpriced rather than guessing.
      // It cannot unlock anything either way — the server gates the audio.
      console.error("[CatalogContext] Failed to load catalog:", err);
      setData(NO_CATALOG);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const value = useMemo<CatalogContextValue>(() => {
    const bySku = new Map(data.products.map((p) => [p.sku, p]));
    const byKey = new Map(data.stories.map((s) => [s.key, s]));

    const getProduct = (sku: string) => bySku.get(sku) ?? null;

    return {
      currency: data.currency,
      paywallEnabled: data.paywallEnabled,
      signupWallEnabled: data.signupWallEnabled,
      products: data.products,
      stories: data.stories,
      catalogLoading,
      getProduct,
      getCatalogStory: (key: string) => byKey.get(key) ?? null,
      skusGranting: (key: string) =>
        byKey.get(key)?.paid === true
          ? data.products.filter((p) => p.storyKeys.includes(key)).map((p) => p.sku)
          : [],
      levelSubscription: (difficulty: string) =>
        data.products.find((p) => p.kind === "level" && p.difficulty === difficulty) ?? null,
      allSubscription: data.products.find((p) => p.kind === "all") ?? null,
      refreshCatalog: load,
    };
  }, [data, catalogLoading, load]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
};

export const useCatalog = () => useContext(CatalogContext);
