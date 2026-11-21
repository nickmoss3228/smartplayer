// services/entitlementServices.ts
// What the signed-in account has paid for. Follows the shared-client shape
// documented at the top of walletServices.ts.
import { api } from "./apiClient";

export interface EntitlementRow {
  sku: string;
  grantedAt: string;
  /** null = never expires. Only an admin grant with `days` sets one. */
  expiresAt: string | null;
  source: "purchase" | "admin" | "promo";
}

export interface Entitlements {
  entitlements: EntitlementRow[];
  /**
   * Resolved "difficulty/slug" keys of every PAID story this account owns, with
   * sets and levels already expanded. The client gates on this, never on rows.
   */
  ownedStories: string[];
  currency: string;
  /**
   * Which SKUs the SERVER will price right now. The bundled catalog carries
   * production defaults, so this is what lets staging offer placeholder stories
   * that production refuses without shipping a different build.
   */
  purchasableSkus: string[];
}

/**
 * The empty state — used for guests and whenever the call fails.
 *
 * Failing to "owns nothing" rather than "owns everything" is deliberate. Hiding
 * a story is an editorial choice, so fetchPublishedStoriesList fails open;
 * access is a commercial one, so this fails closed. The user sees a padlock and
 * a working shop rather than a play button that 403s.
 */
export const NO_ENTITLEMENTS: Entitlements = {
  entitlements: [],
  ownedStories: [],
  currency: "RUB",
  purchasableSkus: [],
};

export const fetchEntitlements = async (): Promise<Entitlements> => {
  const res = await api.get("/api/user/entitlements");
  return res.data;
};
