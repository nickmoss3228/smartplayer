// services/catalogServices.ts
// Follows the shared-client shape documented at the top of walletServices.ts.
//
// The catalog — what exists, what it costs — now comes from the server. It used
// to be bundled: config/priceCatalog.ts shipped a hand-maintained copy of the
// server's list, kept honest by a mirror test. That copy could not know about
// anything authored in the Story Builder, so every story created there had no
// price and no SKU, and the shop drew it with no buy button.
import { api } from "./apiClient";

export interface CatalogStory {
  /** "easy/leo" — difficulty-qualified, because slugs repeat across levels. */
  key: string;
  character: string;
  parts: number;
  category: "general" | "news";
  /** False means free outright: every part, to everyone. */
  paid: boolean;
  /** Parts 1..freeParts play in full for a non-owner. */
  freeParts: number;
  /** When set, part 1 plays for this long and then stops. */
  previewSeconds: number | null;
}

export interface CatalogProduct {
  sku: string;
  kind: "story" | "set" | "level";
  /** Integer kopecks. Divide by 100 only at the point of display. */
  amountMinor: number;
  parts: number;
  /** Every story this SKU unlocks. */
  storyKeys: string[];
  durationDays: number | null;
  /** Whether THIS environment will sell it — already folds in PURCHASABLE_SKUS. */
  purchasable: boolean;
  character?: string;
  difficulty?: string;
  storyKey?: string;
}

export interface Catalog {
  currency: string;
  /**
   * Is anything gated by ownership right now?
   *
   * The client keeps its own copy of the access rule for stories with no
   * published DB row (applyCatalogAccess), so it has to be told, or it keeps
   * drawing padlocks on content the server will serve. Defaults to TRUE
   * everywhere it could be missing — a catalog we failed to load must not read
   * as "everything is free".
   */
  paywallEnabled: boolean;
  stories: CatalogStory[];
  products: CatalogProduct[];
}

/**
 * An empty catalog, used before the request lands and if it fails.
 *
 * Empty means "nothing is for sale yet", which renders as a shelf with no buy
 * buttons — never as free content, because ownership is a separate answer from
 * the entitlements endpoint and the audio gate is the server's alone. Callers
 * should wait on `loading` rather than treat this as an answer.
 */
export const NO_CATALOG: Catalog = {
  currency: "RUB",
  // Fails SAFE: a failed fetch means the paywall is on, not off.
  paywallEnabled: true,
  stories: [],
  products: [],
};

export async function fetchCatalog(): Promise<Catalog> {
  // "/api/..." like every other service: API_BASE is an ORIGIN, not an API
  // root, so the prefix belongs in the path (see services/apiClient.ts).
  const { data } = await api.get<Catalog>("/api/catalog");
  return {
    currency: data.currency ?? "RUB",
    // `!== false` rather than `?? true`: an older server that does not send the
    // field at all is a server whose paywall is on.
    paywallEnabled: data.paywallEnabled !== false,
    stories: Array.isArray(data.stories) ? data.stories : [],
    products: Array.isArray(data.products) ? data.products : [],
  };
}
