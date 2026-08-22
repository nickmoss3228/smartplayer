import { describe, it, expect } from 'vitest';
import {
  ACHIEVEMENT_CATEGORIES,
  TIER_ORDER,
  TIER_COLORS,
  getEarnedTiers,
  getHighestEarnedTier,
  getNextTier,
  getRungFills,
  getTierProgress,
} from './achievementsConfig';
import en from '../locales/en/translation.json';
import ru from '../locales/ru/translation.json';

const tiers = [
  { tier: 'bronze' as const, threshold: 10 },
  { tier: 'silver' as const, threshold: 20 },
  { tier: 'gold' as const, threshold: 40 },
];

describe('getEarnedTiers', () => {
  it('earns a tier exactly at its threshold, not one past it', () => {
    expect(getEarnedTiers(tiers, 9).map((t) => t.tier)).toEqual([]);
    expect(getEarnedTiers(tiers, 10).map((t) => t.tier)).toEqual(['bronze']);
  });

  it('accumulates lower tiers rather than replacing them', () => {
    expect(getEarnedTiers(tiers, 25).map((t) => t.tier)).toEqual(['bronze', 'silver']);
    expect(getEarnedTiers(tiers, 999).map((t) => t.tier)).toEqual([
      'bronze',
      'silver',
      'gold',
    ]);
  });
});

describe('getHighestEarnedTier', () => {
  it('returns null before the first tier, not the first tier', () => {
    expect(getHighestEarnedTier(tiers, 0)).toBeNull();
    expect(getHighestEarnedTier(tiers, 9)).toBeNull();
  });

  it('reports the top of the earned run, not the bottom', () => {
    // The medallion shows rank, so returning bronze at silver level would
    // quietly demote the learner.
    expect(getHighestEarnedTier(tiers, 25)?.tier).toBe('silver');
    expect(getHighestEarnedTier(tiers, 999)?.tier).toBe('gold');
  });
});

describe('getRungFills', () => {
  it('fills earned rungs, part-fills the current one, leaves the rest empty', () => {
    // 30 is halfway from silver (20) to gold (40).
    expect(getRungFills(tiers, 30)).toEqual([
      { tier: tiers[0], fill: 100, state: 'earned' },
      { tier: tiers[1], fill: 100, state: 'earned' },
      { tier: tiers[2], fill: 50, state: 'current' },
    ]);
  });

  it('leaves every rung empty before anything is earned', () => {
    const fills = getRungFills(tiers, 0);
    expect(fills.map((r) => r.fill)).toEqual([0, 0, 0]);
    expect(fills.map((r) => r.state)).toEqual(['current', 'locked', 'locked']);
  });

  it('fills every rung once the top tier is reached', () => {
    // This is the distinction the old single progress bar could not draw:
    // a finished ladder has to look different from a fresh one.
    const fills = getRungFills(tiers, 40);
    expect(fills.map((r) => r.fill)).toEqual([100, 100, 100]);
    expect(fills.every((r) => r.state === 'earned')).toBe(true);
  });

  it('returns one entry per tier for every real category', () => {
    for (const category of ACHIEVEMENT_CATEGORIES) {
      expect(getRungFills(category.tiers, 0)).toHaveLength(category.tiers.length);
    }
  });
});

describe('getNextTier', () => {
  it('points at the next unearned tier', () => {
    expect(getNextTier(tiers, 0)?.tier).toBe('bronze');
    expect(getNextTier(tiers, 10)?.tier).toBe('silver');
  });

  it('returns null once everything is earned, rather than an undefined tier', () => {
    // The dashboard renders "next: {tier}" — undefined would print raw.
    expect(getNextTier(tiers, 40)).toBeNull();
  });
});

describe('getTierProgress', () => {
  it('measures from the previous threshold, not from zero', () => {
    // Halfway from silver (20) to gold (40) is 30, and must read 50% — not
    // 75%, which is what measuring from zero would give.
    expect(getTierProgress(tiers, 30)).toBe(50);
  });

  it('reads 0 at the start of a band and 100 once complete', () => {
    expect(getTierProgress(tiers, 0)).toBe(0);
    expect(getTierProgress(tiers, 20)).toBe(0);
    expect(getTierProgress(tiers, 40)).toBe(100);
  });

  it('never exceeds 100 once every tier is earned', () => {
    expect(getTierProgress(tiers, 10_000)).toBe(100);
  });

  it('scales the first band from zero', () => {
    expect(getTierProgress(tiers, 5)).toBe(50);
  });
});

describe('achievement config integrity', () => {
  it.each(ACHIEVEMENT_CATEGORIES)('$key has strictly ascending thresholds', (category) => {
    // getTierProgress finds the first unmet threshold and measures back to the
    // one before it. Out-of-order thresholds make that arithmetic meaningless,
    // and two equal thresholds divide by zero and yield NaN in the progress bar.
    const values = category.tiers.map((t) => t.threshold);
    for (let i = 1; i < values.length; i++) {
      expect(values[i], `${category.key}: ${values[i]} follows ${values[i - 1]}`)
        .toBeGreaterThan(values[i - 1]);
    }
  });

  it.each(ACHIEVEMENT_CATEGORIES)('$key uses known tier names in order', (category) => {
    expect(category.tiers.map((t) => t.tier)).toEqual(
      TIER_ORDER.slice(0, category.tiers.length),
    );
  });

  it('has a colour for every tier', () => {
    for (const tier of TIER_ORDER) expect(TIER_COLORS[tier]).toBeTruthy();
  });

  it('has no duplicate category keys', () => {
    const keys = ACHIEVEMENT_CATEGORIES.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it.each(ACHIEVEMENT_CATEGORIES)(
    '$key has its unit translated in both locales',
    (category) => {
      // getTierLabel does t(`dashboard.achievements.units.${unitKey}`); a
      // missing family renders the raw key path next to the medal.
      for (const [name, locale] of [
        ['en', en],
        ['ru', ru],
      ] as const) {
        const units = (locale as Record<string, any>).dashboard.achievements.units;
        expect(
          Object.keys(units).some((k) => k.startsWith(`${category.unitKey}_`)),
          `${name} has no "${category.unitKey}" unit for ${category.key}`,
        ).toBe(true);
      }
    },
  );

  it('expresses listening-time thresholds in whole hours', () => {
    // Thresholds are stored in seconds and divided by 3600 for the label, so a
    // value that is not a whole number of hours prints as "1.5 hours".
    const listening = ACHIEVEMENT_CATEGORIES.find((c) => c.unitKey === 'hours');
    for (const t of listening?.tiers ?? []) {
      expect(Number.isInteger(t.threshold / 3600), `${t.tier}: ${t.threshold}s`).toBe(true);
    }
  });
});
