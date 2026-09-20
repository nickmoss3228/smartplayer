// config/features.ts
//
// Switches for things that are built but deliberately not in front of users
// yet. Nothing here deletes code — each flag exists so a feature can be taken
// off the path and put back without a rewrite.

/**
 * Is the storefront reachable?
 *
 * OFF while the idea is being tested. The shop, the basket, the checkout and
 * the paywall modal are all still built and still work; they are simply not
 * linked from anywhere, and their routes redirect to the level picker.
 *
 * ── This flag does NOT decide access ─────────────────────────────────────────
 *
 * Whether content is locked is the SERVER's answer, `paywallEnabled` on
 * GET /api/catalog (backend: PAYWALL_ENABLED). That distinction matters: a
 * bundle built with SHOP_ENABLED=false talking to a server whose paywall is
 * still on would padlock people out of content with no way to buy it, which is
 * the worst of both. So this flag only hides CHROME — routes, the navbar
 * entry, the basket, the "add a story" tile — where being wrong costs a dead
 * link rather than a lockout.
 *
 * ── Turning the shop back on ─────────────────────────────────────────────────
 *
 *   1. backend/.env:  PAYWALL_ENABLED=true
 *                     PHONE_VERIFICATION_REQUIRED=true   (if SMS is ready)
 *                     PAYMENTS_ENABLED=true
 *   2. set SHOP_ENABLED below to true and rebuild
 *   3. restore the "+" tile and the library filter in pages/List.tsx — they
 *      were removed rather than flagged, since the page reads better without
 *      them and they are two small, well-described blocks in git history
 *   4. re-seed the placeholder stories if you want them back:
 *        node --import tsx src/scripts/seedExtensionPacks.js
 */
export const SHOP_ENABLED = false;
