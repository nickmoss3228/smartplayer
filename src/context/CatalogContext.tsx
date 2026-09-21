// context/CatalogContext.tsx
//
// The server's catalog, fetched once and shared. This is the client half of
// GET /api/catalog — see that controller for why the catalog stopped being
// bundled with the frontend.
//
// The helper surface below (getProduct / getCatalogStory / skusGranting /
// priceFor / collapseBasket) is deliberately the same shape the bundled
// config/priceCatalog.ts used to export, so consumers changed where they import
// from and nothing else. What is NOT here is anything that decides access:
// `owns` stays in EntitlementsContext, and the audio gate stays on the server.
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  fetchCatalog,
  NO_CATALOG,
  type Catalog,
  type CatalogProduct,
  type CatalogStory,
} from "../services/catalogServices";
import { SET_TRACK_PRICE_MINOR } from "../config/priceCatalog";

interface CatalogContextValue {
  currency: string;
  /** False while nothing is sold — see Catalog.paywallEnabled. */
  paywallEnabled: boolean;
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
  /** Which SKUs unlock a story — smallest scope first: story, set, level. */
  skusGranting: (key: string) => string[];
  /** The character set a story belongs to, if any — the shop's upsell. */
  setForStory: (key: string) => CatalogProduct | null;
  /** What a buyer pays, given what they already own. Mirrors the server. */
  priceFor: (product: CatalogProduct | null, ownedStoryKeys?: readonly string[]) => number;
  /** Drops basket items another item already covers. Mirrors the server. */
  collapseBasket: (skus: readonly string[]) => { kept: string[]; dropped: string[] };
  refreshCatalog: () => Promise<void>;
}

const EMPTY: CatalogContextValue = {
  ...NO_CATALOG,
  catalogLoading: true,
  getProduct: () => null,
  getCatalogStory: () => null,
  skusGranting: () => [],
  setForStory: () => null,
  priceFor: () => 0,
  collapseBasket: (skus) => ({ kept: [...new Set(skus)], dropped: [] }),
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
    const partsOf = (keys: readonly string[]) =>
      keys.reduce((sum, key) => sum + (byKey.get(key)?.parts ?? 0), 0);

    return {
      currency: data.currency,
      paywallEnabled: data.paywallEnabled,
      products: data.products,
      stories: data.stories,
      catalogLoading,
      getProduct,
      getCatalogStory: (key: string) => byKey.get(key) ?? null,
      skusGranting: (key: string) =>
        byKey.get(key)?.paid === true
          ? data.products.filter((p) => p.storyKeys.includes(key)).map((p) => p.sku)
          : [],
      setForStory: (key: string) =>
        data.products.find((p) => p.kind === "set" && p.storyKeys.includes(key)) ?? null,
      // A set charges only for the tracks the buyer does not own yet, so someone
      // who bought one story and then wants the rest is never sold it twice.
      priceFor: (product, ownedStoryKeys = []) => {
        if (!product) return 0;
        if (product.kind !== "set") return product.amountMinor;
        const owned = new Set(ownedStoryKeys);
        return partsOf(product.storyKeys.filter((k) => !owned.has(k))) * SET_TRACK_PRICE_MINOR;
      },
      // Widest scope wins; between two items granting the same stories, the
      // cheaper is kept. Unknown SKUs pass through for the server to reject.
      collapseBasket: (skus) => {
        const unique = [...new Set(skus)];
        const ranked = unique
          .filter((sku) => getProduct(sku))
          .sort((a, b) => {
            const pa = getProduct(a)!;
            const pb = getProduct(b)!;
            return (
              pb.storyKeys.length - pa.storyKeys.length ||
              pa.amountMinor - pb.amountMinor ||
              a.localeCompare(b)
            );
          });

        const covered = new Set<string>();
        const dropped = new Set<string>();
        for (const sku of ranked) {
          const keys = getProduct(sku)!.storyKeys;
          if (keys.length > 0 && keys.every((k) => covered.has(k))) {
            dropped.add(sku);
            continue;
          }
          for (const key of keys) covered.add(key);
        }
        return {
          kept: unique.filter((s) => !dropped.has(s)),
          dropped: unique.filter((s) => dropped.has(s)),
        };
      },
      refreshCatalog: load,
    };
  }, [data, catalogLoading, load]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
};

export const useCatalog = () => useContext(CatalogContext);
