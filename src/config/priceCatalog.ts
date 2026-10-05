// config/priceCatalog.ts
//
// The pricing CONSTANTS and pure formatting helpers. The catalog itself — which
// stories exist, what each costs, what unlocks it — is no longer here: it comes
// from GET /api/catalog through context/CatalogContext.tsx.
//
// This file used to carry a hand-maintained copy of the server's catalog, kept
// honest by catalogMirror.test.ts. The copy could not know about anything
// authored in the admin Story Builder, so every story created there had no
// price and no SKU: it rendered with no buy button in the shop, and — because
// the server's paywall also keyed off that list — as FREE on a logged-out
// library shelf. A mirror cannot mirror rows that are written at runtime, so
// the mirror is gone and the server answers instead.
//
// What stays here is what is genuinely static: the free allowance rule and how
// a number becomes "199 ₽". These are the same on both sides because they are
// policy, not data. Prices are not here at all — what a subscription costs and
// how long it runs come from the catalog, so the shop cannot show one number
// while the server charges another.
//
// Display text (names, blurbs) is NOT here — it lives in
// locales/{en,ru}/translation.json under `shop.*`, the same way story titles do,
// because it needs translating and the server has no opinion about it.

export const CURRENCY = 'RUB';

/** A subscription to one level, or to all of them. Nothing else is sold. */
export type ProductKind = 'level' | 'all';
export type DifficultySlug = 'easy' | 'medium' | 'hard';
export type CatalogCategory = 'general' | 'news';

/**
 * Story identity across the whole payment system: "easy/leo". The difficulty
 * has to be part of the key because a slug is only unique per difficulty.
 */
export const storyKey = (difficulty: string, storyId: string) => `${difficulty}/${storyId}`;

export const FREE_PARTS_LONG_STORY = 3;
export const LONG_STORY_MIN_PARTS = 10;
export const PREVIEW_SECONDS = 30;

export interface FreeAllowance {
  /** Parts 1..freeParts play in full. */
  freeParts: number;
  /** When not null, part 1 plays for this long and then stops. */
  previewSeconds: number | null;
}

/**
 * The DEFAULT free allowance, from a story's length alone.
 *
 * Only a fallback now: a story's real allowance is whatever the catalog says,
 * because a row may override it per story. Use the catalog's `freeParts` /
 * `previewSeconds` whenever you have the story; reach for this only when you
 * have a part count and nothing else.
 *
 * The first 3 parts of any story, capped at its length — so a 2-part story is
 * free outright. No timed preview by default; see the server's copy.
 */
export const freeAllowanceFor = (totalParts: number): FreeAllowance => ({
  freeParts: Math.min(FREE_PARTS_LONG_STORY, Math.max(0, Number(totalParts) || 0)),
  previewSeconds: null,
});

/**
 * The one space character used in every price the app renders: U+00A0, a
 * no-break space. It groups thousands AND separates the amount from the sign,
 * so "1 290 ₽" can never wrap across two lines inside a narrow shop card.
 *
 * Exported and named because it was briefly two different invisible
 * characters — U+202F between the digits, U+00A0 before the ₽ — which looks
 * identical on screen and made an equality assertion fail with two strings
 * that printed the same. One constant, or this recurs.
 */
export const NBSP = ' ';

/** 129000 -> "1 290 ₽". Minor units in, display string out. */
export const formatPrice = (amountMinor: number, currency: string = CURRENCY): string => {
  const major = amountMinor / 100;
  const sign = currency === 'RUB' ? `${NBSP}₽` : `${NBSP}${currency}`;
  const rounded = Number.isInteger(major) ? String(major) : major.toFixed(2);
  return rounded.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP) + sign;
};
