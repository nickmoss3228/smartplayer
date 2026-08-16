import { describe, it, expect } from 'vitest';
import en from './en/translation.json';
import ru from './ru/translation.json';

/**
 * The two locale files are ~1200 lines each and edited by hand, usually in
 * pairs. When a key is added to one and forgotten in the other, i18next does
 * not throw — it silently renders the raw key path ("levels.fatEasy") or falls
 * back to English inside an otherwise Russian page. Both look like content
 * bugs, not code bugs, so they tend to reach users.
 *
 * These tests make that failure loud at build time instead.
 */

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

/** Every leaf path in the object, e.g. "levels.fatEasy" or "stories.easy.leo.title". */
function leafPaths(value: Json, prefix = ''): string[] {
  if (Array.isArray(value)) return [prefix];
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) =>
      leafPaths(v as Json, prefix ? `${prefix}.${k}` : k),
    );
  }
  return [prefix];
}

/** Read a dotted path back out of a locale object. */
function at(obj: Json, path: string): Json | undefined {
  return path.split('.').reduce<Json | undefined>((acc, key) => {
    if (acc !== null && typeof acc === 'object' && !Array.isArray(acc)) {
      return (acc as { [k: string]: Json })[key];
    }
    return undefined;
  }, obj);
}

/**
 * i18next appends a CLDR plural category to the key. English has two (one,
 * other); Russian has four (one, few, many, other) — so `hours_many` existing
 * only in Russian is correct, not drift. Parity is therefore compared on the
 * base key, with the plural suffix stripped.
 */
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;
const baseKey = (path: string) => path.replace(PLURAL_SUFFIX, '');

const enPaths = leafPaths(en as Json);
const ruPaths = leafPaths(ru as Json);

const enBase = new Set(enPaths.map(baseKey));
const ruBase = new Set(ruPaths.map(baseKey));

describe('locale parity', () => {
  it('has no key in English that is missing from Russian', () => {
    const missing = [...enBase].filter((p) => !ruBase.has(p));
    expect(missing, `missing from ru/translation.json:\n  ${missing.join('\n  ')}`).toEqual(
      [],
    );
  });

  it('has no key in Russian that is missing from English', () => {
    const missing = [...ruBase].filter((p) => !enBase.has(p));
    expect(missing, `missing from en/translation.json:\n  ${missing.join('\n  ')}`).toEqual(
      [],
    );
  });

  it('gives every Russian plural its few/many forms', () => {
    // Russian needs one/few/many; with `many` missing, i18next falls back and
    // renders "5 час" instead of "5 часов". English is unaffected, so this is
    // easy to ship without noticing.
    const pluralBases = new Set(
      ruPaths.filter((p) => PLURAL_SUFFIX.test(p)).map(baseKey),
    );

    const incomplete = [...pluralBases].filter((base) =>
      ['one', 'few', 'many'].some((form) => !ruPaths.includes(`${base}_${form}`)),
    );

    expect(incomplete, `incomplete Russian plurals:\n  ${incomplete.join('\n  ')}`).toEqual(
      [],
    );
  });

  it('keeps array-valued keys the same length in both locales', () => {
    // Arrays are rendered positionally (grammar points, story topics, the
    // rotating slogan words). A shorter array in one locale drops content
    // rather than showing an obviously untranslated string.
    const mismatched = enPaths
      .filter((p) => Array.isArray(at(en as Json, p)))
      .map((p) => {
        const a = at(en as Json, p) as Json[];
        const b = at(ru as Json, p);
        return Array.isArray(b) && a.length === b.length
          ? null
          : `${p}: en=${a.length} ru=${Array.isArray(b) ? b.length : 'not an array'}`;
      })
      .filter(Boolean);

    expect(mismatched, mismatched.join('\n  ')).toEqual([]);
  });
});

describe('brand', () => {
  it('is lowercase in both locales', () => {
    // The name is a deliberate misspelling of молоко and is always lowercase;
    // an editor "correcting" it to Malako/Малако is the likely regression.
    expect(en.brand).toBe(en.brand.toLowerCase());
    expect(ru.brand).toBe(ru.brand.toLowerCase());
  });

  it('is spelled the way the domain is', () => {
    expect(en.brand).toBe('malako');
    expect(ru.brand).toBe('малако');
  });
});

describe('slogan', () => {
  it('offers more than one word to rotate through in both locales', () => {
    // With a single word the rotation silently stops and the slogan reads as
    // a static line, which is not obviously broken from the outside.
    expect(en.homepage.slogan.words.length).toBeGreaterThan(1);
    expect(ru.homepage.slogan.words.length).toBeGreaterThan(1);
  });

  it('has no empty words', () => {
    for (const words of [en.homepage.slogan.words, ru.homepage.slogan.words]) {
      for (const w of words) expect(w.trim()).not.toBe('');
    }
  });
});
