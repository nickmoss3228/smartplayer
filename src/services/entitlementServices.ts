// services/entitlementServices.ts
// What the signed-in account has paid for. Follows the shared-client shape
// documented at the top of walletServices.ts.
import { api } from "./apiClient";

export interface EntitlementRow {
  sku: string;
  grantedAt: string;
  /** null = never expires. A past date = the pass lapsed; still listed. */
  expiresAt: string | null;
  source: "purchase" | "admin" | "promo";
}

export interface Entitlements {
  entitlements: EntitlementRow[];
  /** Resolved "difficulty/slug" keys. The client gates on this, never on the rules. */
  ownedStories: string[];
  hasAllAccess: boolean;
  allAccessExpiresAt: string | null;
  freeTrialParts: number;
  paidPreviewParts: number;
  currency: string;
  /**
   * Which SKUs the SERVER will price right now. The bundled catalog carries
   * production defaults, so this is what lets staging offer placeholder packs
   * that production refuses without shipping a different build.
   */
  purchasableSkus: string[];
}

/**
 * The empty state — used for guests and whenever the call fails.
 *
 * Failing to "owns nothing" rather than "owns everything" is deliberate, and
 * it is the opposite of how fetchPublishedStoriesList fails. Hiding a story is
 * an editorial choice, so that one fails open; access is a commercial one, so
 * this fails closed. The user sees a padlock and a working shop rather than a
 * play button that 403s.
 */
export const NO_ENTITLEMENTS: Entitlements = {
  entitlements: [],
  ownedStories: [],
  hasAllAccess: false,
  allAccessExpiresAt: null,
  freeTrialParts: 2,
  paidPreviewParts: 1,
  currency: "RUB",
  purchasableSkus: [],
};

export const fetchEntitlements = async (): Promise<Entitlements> => {
  const res = await api.get("/api/user/entitlements");
  return res.data;
};
