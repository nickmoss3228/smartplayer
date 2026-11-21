// config/features.ts
//
// Switches for things that are built but deliberately not in front of users
// yet. Nothing here deletes code — each flag exists so a feature can be taken
// off the path and put back without a rewrite.

/**
 * Is the storefront reachable?
 *
 * OFF again since 2026-11-21 (user: hide the shop for now). Was off
 * 2026-09-20 → 2026-10-01, on 2026-10-01 → 2026-11-21. When false, the shop, the basket, the checkout and the paywall
 * modal stay built but unlinked, and their routes redirect to the level picker.
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
 *   3. (skipped on purpose, 2026-10-01) the "+" tile and library filter that
 *      pages/List.tsx had before the shop went off stay OUT — the level shelf
 *      keeps its current design; the shop is reached from the navbar
 *   4. re-seed the placeholder stories if you want them back:
 *        node --import tsx src/scripts/seedExtensionPacks.js
 */
export const SHOP_ENABLED = false;

/**
 * The signed-in hub (/home, pages/Home.tsx) and the tab bar under it
 * (components/TabBar): Главная, Уровни, Слова, Школа. ON since 2026-11-19.
 * With it off, /home redirects to the level picker, sign-in lands on /levels
 * and the navbar is the one from before the hub.
 */
export const HUB_ENABLED = true;
