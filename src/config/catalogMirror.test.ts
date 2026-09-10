import { describe, it, expect } from 'vitest';

import { CHARACTER_CATALOG, CHARACTER_SLOTS } from './characterCatalog';
import { SHOP_CATALOG, SHOP_SLOTS } from './shopCatalog';
import { QUIZ_PASS_BITAWARD, PHRASE_REPEAT_BITPHRASE, CURRENCIES } from './currencies';
import {
  PRODUCTS,
  STARTER_STORIES,
  PACK_STORIES,
  PAID_PREVIEW_PARTS,
  PASS_DURATION_DAYS,
  CURRENCY,
  skusGranting,
  NBSP,
  formatPrice,
} from './priceCatalog';
import { FREE_TRIAL_STORIES } from '../constants/trial';

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
  PRODUCTS as SERVER_PRODUCTS,
  STARTER_STORIES as SERVER_STARTER_STORIES,
  PACK_STORIES as SERVER_PACK_STORIES,
  PAID_PREVIEW_PARTS as SERVER_PAID_PREVIEW_PARTS,
  PASS_DURATION_DAYS as SERVER_PASS_DURATION_DAYS,
  CURRENCY as SERVER_CURRENCY,
  skusGranting as serverSkusGranting,
} from '../../backend/src/config/priceCatalog.js';
import { FREE_TRIAL_STORIES as SERVER_FREE_TRIAL_STORIES } from '../../backend/src/config/trial.js';

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
    // A fractional or negative price would let the wallet go somewhere the
    // server's integer arithmetic cannot follow.
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
 * costs a player some bitAward; this one guards rubles, where drift means the
 * shop quotes one price and the card is charged another. The server re-prices
 * every order from its own file, so the customer can never be OVERcharged by
 * drift — but the shop can still lie, and a lie about a price is the kind of
 * bug that ends up in a chargeback rather than a bug report.
 */
type PricedProduct = {
  sku: string;
  kind: string;
  amountMinor: number;
  durationDays: number | null;
  purchasable: boolean;
  storyKey?: string;
};

const productShape = (products: readonly PricedProduct[]) =>
  [...products]
    .map(({ sku, kind, amountMinor, durationDays, purchasable, storyKey }) => ({
      sku,
      kind,
      amountMinor,
      durationDays: durationDays ?? null,
      purchasable,
      storyKey: storyKey ?? null,
    }))
    .sort((a, b) => a.sku.localeCompare(b.sku));

describe('free trial length mirrors the server', () => {
  /**
   * backend/src/config/trial.js and src/constants/trial.ts have said "KEEP IN
   * SYNC" in a comment since they were written, with nothing enforcing it.
   * That was survivable while the trial only separated guests from registered
   * users. It stops being survivable now: this number is how many parts of a
   * PAID story a non-owner may hear, so a client that thinks it is larger than
   * the server does renders a play button that returns a locked part.
   */
  it('agrees on how many parts are free', () => {
    expect(FREE_TRIAL_STORIES).toBe(SERVER_FREE_TRIAL_STORIES);
  });

  it('never gives away more of a paid story than of a free one', () => {
    // A paid preview wider than the guest trial would mean signing OUT showed
    // you less than never signing in.
    expect(PAID_PREVIEW_PARTS).toBeLessThanOrEqual(FREE_TRIAL_STORIES);
  });
});

describe('price catalog mirrors the server', () => {
  it('offers exactly the same SKUs', () => {
    expect(PRODUCTS.map((p) => p.sku).sort()).toEqual(
      SERVER_PRODUCTS.map((p: PricedProduct) => p.sku).sort(),
    );
  });

  it('agrees on every price, duration, kind and purchasable flag', () => {
    expect(productShape(PRODUCTS)).toEqual(productShape(SERVER_PRODUCTS));
  });

  it('agrees on the free starter pack', () => {
    expect([...STARTER_STORIES].sort()).toEqual([...SERVER_STARTER_STORIES].sort());
  });

  it('agrees on which stories each pack contains', () => {
    expect(Object.keys(PACK_STORIES).sort()).toEqual(Object.keys(SERVER_PACK_STORIES).sort());
    for (const sku of Object.keys(PACK_STORIES)) {
      expect([...PACK_STORIES[sku]].sort(), `pack contents differ for ${sku}`).toEqual(
        [...SERVER_PACK_STORIES[sku]].sort(),
      );
    }
  });

  it('agrees on the preview allowance, pass length and currency', () => {
    expect(PAID_PREVIEW_PARTS).toBe(SERVER_PAID_PREVIEW_PARTS);
    expect(PASS_DURATION_DAYS).toBe(SERVER_PASS_DURATION_DAYS);
    expect(CURRENCY).toBe(SERVER_CURRENCY);
  });

  it('resolves the same unlock options for every story', () => {
    const everyKey = [...STARTER_STORIES, ...Object.values(PACK_STORIES).flat()];
    for (const key of everyKey) {
      expect(skusGranting(key), `unlock options differ for ${key}`).toEqual(
        serverSkusGranting(key),
      );
    }
  });
});

describe('price catalog integrity', () => {
  it('has no duplicate SKUs', () => {
    const skus = PRODUCTS.map((p) => p.sku);
    expect(new Set(skus).size).toBe(skus.length);
  });

  it('prices everything in whole positive kopecks', () => {
    // A fractional minor unit is not representable by any payment provider, and
    // a zero-priced SKU would create an order that can never be paid.
    for (const p of PRODUCTS) {
      expect(Number.isInteger(p.amountMinor), `${p.sku} price not an integer`).toBe(true);
      expect(p.amountMinor, `${p.sku} priced at or below zero`).toBeGreaterThan(0);
    }
  });

  it('sells every pack story individually too', () => {
    // The shop promises "buy the bundle or buy them one at a time". A pack
    // story with no single-story SKU would render a card with no price on it.
    for (const key of Object.values(PACK_STORIES).flat()) {
      expect(
        PRODUCTS.some((p) => p.kind === 'story' && p.storyKey === key),
        `no individual SKU for ${key}`,
      ).toBe(true);
    }
  });

  it('keeps the bundle cheaper than its parts', () => {
    // The whole reason the pack exists. If singles ever undercut it, the pack
    // is strictly worse value and nobody should buy one.
    for (const [packSku, keys] of Object.entries(PACK_STORIES)) {
      const pack = PRODUCTS.find((p) => p.sku === packSku)!;
      const singles = keys
        .map((k) => PRODUCTS.find((p) => p.kind === 'story' && p.storyKey === k)!)
        .reduce((sum, p) => sum + p.amountMinor, 0);
      expect(pack.amountMinor, `${packSku} costs more than buying its stories`).toBeLessThan(
        singles,
      );
    }
  });

  it('keeps the pass cheaper than buying two packs', () => {
    // Same argument one level up: the pass has to be the obvious choice for
    // anyone who wants more than one level, or it caps its own revenue.
    const pass = PRODUCTS.find((p) => p.sku === 'all-access-90d')!;
    const packs = PRODUCTS.filter((p) => p.kind === 'pack')
      .map((p) => p.amountMinor)
      .sort((a, b) => a - b);
    expect(pass.amountMinor).toBeLessThan(packs[0] + packs[1]);
  });

  it('never sells a story that is also in the free starter pack', () => {
    for (const key of Object.values(PACK_STORIES).flat()) {
      expect(STARTER_STORIES, `${key} is both free and for sale`).not.toContain(key);
    }
  });

  it('offers nothing to buy for a starter story', () => {
    for (const key of STARTER_STORIES) {
      expect(skusGranting(key), `${key} is free but offers a purchase`).toEqual([]);
    }
  });

  it('keys every story as difficulty/slug', () => {
    // storyId is only unique per difficulty (the compound index on
    // models/Story.js), so a bare slug would be ambiguous across levels.
    for (const key of [...STARTER_STORIES, ...Object.values(PACK_STORIES).flat()]) {
      expect(key, `${key} is not a difficulty/slug key`).toMatch(/^(easy|medium|hard)\/[a-z0-9-]+$/);
    }
  });

  it('formats prices the way the shop shows them', () => {
    // Built from the exported NBSP rather than a pasted literal. The separator
    // is invisible, so a wrong one here fails with two strings that print
    // identically — which is exactly how this test failed the first time.
    expect(formatPrice(129000)).toBe(`1${NBSP}290${NBSP}₽`);
    expect(formatPrice(69000)).toBe(`690${NBSP}₽`);
    expect(formatPrice(24900)).toBe(`249${NBSP}₽`);
    // Non-RUB falls back to the code, still non-breaking.
    expect(formatPrice(50000, 'USD')).toBe(`500${NBSP}USD`);
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
