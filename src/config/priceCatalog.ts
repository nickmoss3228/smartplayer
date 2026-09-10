// config/priceCatalog.ts
//
// MIRRORS backend/src/config/priceCatalog.js. That file is the source of truth
// for what a purchase actually costs — this one exists so the shop can render
// prices without waiting on a round-trip, and catalogMirror.test.ts fails the
// build if the two ever disagree.
//
// Drift here is not cosmetic: the shop would advertise one price while the
// server charged another. The server re-prices every order from its own
// catalog, so drift can never overcharge a customer — it can only make the shop
// lie, which is bad enough.
//
// Display text (names, blurbs) is NOT here — it lives in
// locales/{en,ru}/translation.json under `shop.*`, the same way story titles do,
// because it needs translating and the server has no opinion about it.

export const CURRENCY = 'RUB';

export type ProductKind = 'pass' | 'pack' | 'story';
export type DifficultySlug = 'easy' | 'medium' | 'hard';

export interface Product {
  sku: string;
  kind: ProductKind;
  /** Integer kopecks. Divide by 100 only at the point of display. */
  amountMinor: number;
  durationDays: number | null;
  purchasable: boolean;
  /** Only on kind === 'story'. */
  storyKey?: string;
}

export const storyKey = (difficulty: string, storyId: string) => `${difficulty}/${storyId}`;

export const STARTER_STORIES: readonly string[] = [
  'easy/leo',
  'easy/leo-additional',
  'easy/news-roland-garros',
  'easy/news-family-visit',
  'easy/news-grazing-board',
  'medium/maya',
  'hard/daniel',
];

export const PAID_PREVIEW_PARTS = 1;
export const PASS_DURATION_DAYS = 90;

export const PACK_STORIES: Record<string, readonly string[]> = {
  'pack-easy': ['easy/leo-new-job', 'easy/leo-doctor', 'easy/leo-moving-day'],
  'pack-medium': ['medium/maya-interview', 'medium/maya-roommates', 'medium/maya-lost-luggage'],
  'pack-hard': ['hard/daniel-negotiation', 'hard/daniel-startup-pitch', 'hard/daniel-courtroom'],
};

const PACK_PRICE_MINOR = 69000;
const STORY_PRICE_MINOR = 24900;
const PASS_PRICE_MINOR = 129000;

const packProduct = (sku: string): Product => ({
  sku,
  kind: 'pack',
  amountMinor: PACK_PRICE_MINOR,
  durationDays: null,
  purchasable: false,
});

const storyProduct = (key: string): Product => ({
  sku: `story-${key.replace('/', '-')}`,
  kind: 'story',
  storyKey: key,
  amountMinor: STORY_PRICE_MINOR,
  durationDays: null,
  purchasable: false,
});

export const PRODUCTS: Product[] = [
  {
    sku: 'all-access-90d',
    kind: 'pass',
    amountMinor: PASS_PRICE_MINOR,
    durationDays: PASS_DURATION_DAYS,
    purchasable: true,
  },
  ...Object.keys(PACK_STORIES).map(packProduct),
  ...Object.values(PACK_STORIES).flat().map(storyProduct),
];

/** Every story key the catalog sells, in catalog order. */
export const PAID_STORY_KEYS: readonly string[] = Object.values(PACK_STORIES).flat();

const PAID_SET = new Set(PAID_STORY_KEYS);

/**
 * Mirrors isPaidStory() in backend/src/config/entitlements.js: a story nobody
 * sells is free. The UI needs this to decide how large a GUEST's preview is —
 * two parts of a free story (the trial that has always existed) versus one
 * part of a paid one — and `owns()` cannot answer that, because a guest owns
 * nothing either way.
 */
export const isPaidStory = (key: string): boolean => PAID_SET.has(key);

const BY_SKU = new Map(PRODUCTS.map((p) => [p.sku, p]));

export const getProduct = (sku: string): Product | null => BY_SKU.get(sku) ?? null;

/** Which level a pack belongs to — the shop groups by level, the SKU encodes it. */
export const packForDifficulty = (difficulty: DifficultySlug) => `pack-${difficulty}`;

export const skusGranting = (key: string): string[] => {
  if (STARTER_STORIES.includes(key)) return [];

  const skus: string[] = [];
  const single = PRODUCTS.find((p) => p.kind === 'story' && p.storyKey === key);
  if (single) skus.push(single.sku);

  for (const [packSku, keys] of Object.entries(PACK_STORIES)) {
    if (keys.includes(key)) skus.push(packSku);
  }

  skus.push('all-access-90d');
  return skus;
};


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
export const NBSP = '\u00a0';

/** 129000 -> "1 290 ₽". Minor units in, display string out. */
export const formatPrice = (amountMinor: number, currency: string = CURRENCY): string => {
  const major = amountMinor / 100;
  const sign = currency === 'RUB' ? `${NBSP}\u20bd` : `${NBSP}${currency}`;
  const rounded = Number.isInteger(major) ? String(major) : major.toFixed(2);
  return rounded.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP) + sign;
};
