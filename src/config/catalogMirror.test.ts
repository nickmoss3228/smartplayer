import { describe, it, expect } from 'vitest';

import { CHARACTER_CATALOG, CHARACTER_SLOTS } from './characterCatalog';
import { SHOP_CATALOG, SHOP_SLOTS } from './shopCatalog';
import { QUIZ_PASS_BITAWARD, PHRASE_REPEAT_BITPHRASE, CURRENCIES } from './currencies';

import {
  CHARACTER_CATALOG as SERVER_CHARACTER_CATALOG,
  CHARACTER_SLOTS as SERVER_CHARACTER_SLOTS,
} from '../../backend/src/config/characterCatalog.js';
import { SHOP_CATALOG as SERVER_SHOP_CATALOG } from '../../backend/src/config/shopCatalog.js';
import {
  QUIZ_PASS_BITAWARD as SERVER_QUIZ_PASS_BITAWARD,
  PHRASE_REPEAT_BITPHRASE as SERVER_PHRASE_REPEAT_BITPHRASE,
} from '../../backend/src/config/currency.js';

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
