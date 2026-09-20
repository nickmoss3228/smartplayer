import { describe, it, expect } from 'vitest';
import type { TFunction } from 'i18next';

import { CHARACTER_CATALOG, CHARACTER_SLOTS } from './characterCatalog';
import { SHOP_CATALOG, SHOP_SLOTS } from './shopCatalog';
import { QUIZ_PASS_BITAWARD, PHRASE_REPEAT_BITPHRASE, CURRENCIES } from './currencies';
import {
  CURRENCY,
  TRACK_PRICE_MINOR,
  SET_TRACK_PRICE_MINOR,
  LEVEL_PRICE_MINOR,
  FREE_PARTS_LONG_STORY,
  LONG_STORY_MIN_PARTS,
  PREVIEW_SECONDS,
  freeAllowanceFor,
  setSku,
  storySku,
  levelSku,
  NBSP,
  formatPrice,
} from './priceCatalog';
import { getStoryGroups, type DifficultySlug } from '../types/storyGroups';

import {
  CHARACTER_CATALOG as SERVER_CHARACTER_CATALOG,
  CHARACTER_SLOTS as SERVER_CHARACTER_SLOTS,
} from '../../backend/src/config/characterCatalog.js';
import { SHOP_CATALOG as SERVER_SHOP_CATALOG } from '../../backend/src/config/shopCatalog.js';
import {
  QUIZ_PASS_BITAWARD as SERVER_QUIZ_PASS_BITAWARD,
  PHRASE_REPEAT_BITPHRASE as SERVER_PHRASE_REPEAT_BITPHRASE,
} from '../../backend/src/config/currency.js';
import {
  BUILT_IN_CATALOG as SERVER_CATALOG,
  buildCatalog,
  CURRENCY as SERVER_CURRENCY,
  TRACK_PRICE_MINOR as SERVER_TRACK_PRICE_MINOR,
  SET_TRACK_PRICE_MINOR as SERVER_SET_TRACK_PRICE_MINOR,
  LEVEL_PRICE_MINOR as SERVER_LEVEL_PRICE_MINOR,
  FREE_PARTS_LONG_STORY as SERVER_FREE_PARTS_LONG_STORY,
  LONG_STORY_MIN_PARTS as SERVER_LONG_STORY_MIN_PARTS,
  PREVIEW_SECONDS as SERVER_PREVIEW_SECONDS,
  freeAllowanceFor as serverFreeAllowanceFor,
  storySku as serverStorySku,
  setSku as serverSetSku,
  levelSku as serverLevelSku,
} from '../../backend/src/config/priceCatalog.js';

/**
 * Three config files in src/config say, in their own header comments, that
 * they mirror a backend file and that "the server is the source of truth for
 * what a purchase actually costs". Nothing enforced that.
 *
 * The failure is quiet and user-facing: the shop renders the client's price,
 * the server charges its own. Drift shows up as a purchase that silently costs
 * more than advertised, or one that fails validation for an item the UI is
 * happily offering. Neither throws anywhere a developer would see it.
 *
 * These tests import both sides and compare them directly. The backend files
 * are plain ES modules with no runtime dependencies, so they load in the test
 * environment without standing up a server or a database.
 */

type PricedItem = { id: string; slot: string; priceBitAward: number };

/** Compare on the fields both sides genuinely share — the client adds `swatch`. */
const pricing = (items: readonly PricedItem[]) =>
  [...items]
    .map(({ id, slot, priceBitAward }) => ({ id, slot, priceBitAward }))
    .sort((a, b) => a.id.localeCompare(b.id));

describe('character catalog mirrors the server', () => {
  it('offers exactly the same item ids', () => {
    const client = CHARACTER_CATALOG.map((i) => i.id).sort();
    const server = SERVER_CHARACTER_CATALOG.map((i: PricedItem) => i.id).sort();
    expect(client).toEqual(server);
  });

  it('agrees on every price and slot', () => {
    expect(pricing(CHARACTER_CATALOG)).toEqual(pricing(SERVER_CHARACTER_CATALOG));
  });

  it('agrees on the slot list', () => {
    expect([...CHARACTER_SLOTS].sort()).toEqual([...SERVER_CHARACTER_SLOTS].sort());
  });
});

describe('shop catalog mirrors the server', () => {
  it('offers exactly the same item ids', () => {
    const client = SHOP_CATALOG.map((i) => i.id).sort();
    const server = SERVER_SHOP_CATALOG.map((i: PricedItem) => i.id).sort();
    expect(client).toEqual(server);
  });

  it('agrees on every price and slot', () => {
    expect(pricing(SHOP_CATALOG)).toEqual(pricing(SERVER_SHOP_CATALOG));
  });
});

describe('currency rewards mirror the server', () => {
  it('agrees on the quiz payout', () => {
    expect(QUIZ_PASS_BITAWARD).toBe(SERVER_QUIZ_PASS_BITAWARD);
  });

  it('agrees on the per-repeat BitPhrase payout', () => {
    // The pre-earn UI blurb promises this number before the server mints it.
    expect(PHRASE_REPEAT_BITPHRASE).toEqual(SERVER_PHRASE_REPEAT_BITPHRASE);
  });

  it('mints nothing for a 1× repeat, since nothing was repeated', () => {
    expect(PHRASE_REPEAT_BITPHRASE[1]).toBe(0);
  });

  it('covers every repeat setting the player can choose', () => {
    for (const setting of [1, 2, 3]) {
      expect(PHRASE_REPEAT_BITPHRASE[setting], `no payout for ${setting}×`).toBeTypeOf(
        'number',
      );
    }
  });
});

describe('catalog integrity', () => {
  it('has no duplicate ids in either catalog', () => {
    for (const [name, catalog] of [
      ['character', CHARACTER_CATALOG],
      ['shop', SHOP_CATALOG],
    ] as const) {
      const ids = catalog.map((i) => i.id);
      expect(new Set(ids).size, `duplicate id in ${name} catalog`).toBe(ids.length);
    }
  });

  it('puts every item in a declared slot', () => {
    for (const item of CHARACTER_CATALOG) {
      expect(CHARACTER_SLOTS, `${item.id} has unknown slot`).toContain(item.slot);
    }
    for (const item of SHOP_CATALOG) {
      expect(SHOP_SLOTS, `${item.id} has unknown slot`).toContain(item.slot);
    }
  });

  it('prices everything at a non-negative whole number of BitAward', () => {
    for (const item of [...CHARACTER_CATALOG, ...SHOP_CATALOG]) {
      expect(Number.isInteger(item.priceBitAward), `${item.id} price not an integer`).toBe(
        true,
      );
      expect(item.priceBitAward, `${item.id} price negative`).toBeGreaterThanOrEqual(0);
    }
  });

  it('gives every slot at least one buyable item', () => {
    for (const slot of CHARACTER_SLOTS) {
      expect(
        CHARACTER_CATALOG.some((i) => i.slot === slot),
        `nothing to buy for character slot "${slot}"`,
      ).toBe(true);
    }
  });
});

/**
 * The real-money catalog. Everything above guards soft currency, where drift
 * costs a player some bitAward; this one guards rubles.
 *
 * WHAT CHANGED: the frontend no longer ships a copy of the catalog, so there is
 * no longer a mirror to compare. Which stories exist and what they cost is
 * served by GET /api/catalog and comes from the story table, because a bundled
 * copy could not know about stories authored in the admin Story Builder — and
 * that gap is what made those stories free on a logged-out shelf and unbuyable
 * in the shop.
 *
 * So these tests guard the two things that ARE still duplicated, because they
 * are policy rather than data: the pricing constants, and the SKU spelling. The
 * arithmetic is checked against the server's built-in rows, which remain the
 * fallback catalog.
 */
describe('pricing policy matches the server', () => {
  it('agrees on every price constant', () => {
    expect(CURRENCY).toBe(SERVER_CURRENCY);
    expect(TRACK_PRICE_MINOR).toBe(SERVER_TRACK_PRICE_MINOR);
    expect(SET_TRACK_PRICE_MINOR).toBe(SERVER_SET_TRACK_PRICE_MINOR);
    expect(LEVEL_PRICE_MINOR).toBe(SERVER_LEVEL_PRICE_MINOR);
    expect(FREE_PARTS_LONG_STORY).toBe(SERVER_FREE_PARTS_LONG_STORY);
    expect(LONG_STORY_MIN_PARTS).toBe(SERVER_LONG_STORY_MIN_PARTS);
    expect(PREVIEW_SECONDS).toBe(SERVER_PREVIEW_SECONDS);
  });

  it('spells every SKU the same way', () => {
    // A mismatch here is unrecoverable at runtime: the client would add a SKU
    // the server has never heard of and checkout would refuse the basket.
    expect(storySku('easy/leo')).toBe(serverStorySku('easy/leo'));
    expect(setSku('leo')).toBe(serverSetSku('leo'));
    expect(levelSku('easy')).toBe(serverLevelSku('easy'));
  });

  it('derives the same free allowance from a story length', () => {
    for (const parts of [1, 2, 5, 9, 10, 20]) {
      expect(freeAllowanceFor(parts), String(parts)).toEqual(serverFreeAllowanceFor(parts));
    }
  });

  it('gives long stories free parts and short ones a timed preview', () => {
    expect(freeAllowanceFor(10)).toEqual({ freeParts: 3, previewSeconds: null });
    expect(freeAllowanceFor(5)).toEqual({ freeParts: 0, previewSeconds: 30 });
    expect(freeAllowanceFor(2)).toEqual({ freeParts: 0, previewSeconds: 30 });
  });
});

describe('the server catalog prices what it sells', () => {
  const PRODUCTS = SERVER_CATALOG.products;
  const getProduct = SERVER_CATALOG.getProduct;
  const getCatalogStory = SERVER_CATALOG.getCatalogStory;

  it('has no duplicate SKUs', () => {
    const skus = PRODUCTS.map((p: PricedProduct) => p.sku);
    expect(new Set(skus).size).toBe(skus.length);
  });

  it('prices everything in whole positive kopecks', () => {
    for (const p of PRODUCTS as PricedProduct[]) {
      expect(Number.isInteger(p.amountMinor), p.sku).toBe(true);
      expect(p.amountMinor, p.sku).toBeGreaterThan(0);
    }
  });

  it('prices a story at 29 RUB a track - a 10-track story is 290 RUB', () => {
    expect(getProduct(storySku('easy/leo'))?.amountMinor).toBe(29000);
    for (const p of (PRODUCTS as PricedProduct[]).filter((p) => p.kind === 'story')) {
      expect(p.amountMinor, p.sku).toBe(p.parts * TRACK_PRICE_MINOR);
    }
  });

  it('prices a set at 19 RUB a track, cheaper than its stories one by one', () => {
    for (const set of (PRODUCTS as PricedProduct[]).filter((p) => p.kind === 'set')) {
      expect(set.amountMinor, set.sku).toBe(set.parts * SET_TRACK_PRICE_MINOR);
      const singles = set.storyKeys.reduce(
        (sum: number, key: string) => sum + (getProduct(storySku(key))?.amountMinor ?? 0),
        0,
      );
      expect(set.amountMinor, set.sku).toBeLessThan(singles);
    }
  });

  it('sells every catalog story individually', () => {
    for (const { key } of SERVER_CATALOG.stories) {
      expect(getProduct(storySku(key)), key).not.toBeNull();
    }
  });

  it('keeps news out of every character set', () => {
    for (const set of (PRODUCTS as PricedProduct[]).filter((p) => p.kind === 'set')) {
      for (const key of set.storyKeys) {
        expect(getCatalogStory(key)?.category, key).toBe('general');
      }
    }
  });

  it('keeps the level bundle off sale until it has a real price', () => {
    for (const level of (PRODUCTS as PricedProduct[]).filter((p) => p.kind === 'level')) {
      expect(level.purchasable, level.sku).toBe(false);
    }
  });

  it('knows the real length and shelf of every built-in story it sells', () => {
    // `parts` sets both the price and the free allowance, so a catalog entry
    // that disagrees with the static catalogue misprices the story.
    const t = ((key: string) => key) as unknown as TFunction;
    for (const difficulty of ['easy', 'medium', 'hard'] as DifficultySlug[]) {
      for (const group of getStoryGroups(difficulty, t)) {
        const entry = getCatalogStory(difficulty + '/' + group.slug);
        if (!entry) continue;
        expect(entry.parts, group.slug).toBe(group.totalTracks);
        expect(entry.category, group.slug).toBe(group.category);
      }
    }
  });

  it('keys every story as difficulty/slug', () => {
    for (const { key } of SERVER_CATALOG.stories) {
      expect(key, key).toMatch(/^(easy|medium|hard)\/[a-z0-9-]+$/);
    }
  });

  it('refuses to bundle a free story into a set - it is already given away', () => {
    const catalog = buildCatalog([
      { key: 'easy/a', character: 'leo', parts: 4 },
      { key: 'easy/b', character: 'leo', parts: 6, paid: false },
    ]);
    expect(catalog.getProduct(setSku('leo'))?.storyKeys).toEqual(['easy/a']);
    expect(catalog.getProduct(storySku('easy/b'))).toBeNull();
  });
});

describe('price formatting', () => {
  it('formats prices the way the shop shows them', () => {
    // Built from the exported NBSP rather than a pasted literal. The separator
    // is invisible, so a wrong one here fails with two strings that print
    // identically - which is exactly how this test failed the first time.
    expect(formatPrice(190000)).toBe('1' + NBSP + '900' + NBSP + '₽');
    expect(formatPrice(29000)).toBe('290' + NBSP + '₽');
    expect(formatPrice(2900)).toBe('29' + NBSP + '₽');
    // Non-RUB falls back to the code, still non-breaking.
    expect(formatPrice(50000, 'USD')).toBe('500' + NBSP + 'USD');
  });
});

describe('currency metadata', () => {
  it('has a unique wallet key per currency', () => {
    const keys = CURRENCIES.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('gives every currency a label and an icon', () => {
    for (const c of CURRENCIES) {
      expect(c.label.trim(), `${c.key} has no label`).not.toBe('');
      expect(c.icon, `${c.key} has no icon`).toBeTruthy();
    }
  });
});
