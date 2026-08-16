import { describe, it, expect } from 'vitest';
import { themes } from './themes.levelprogress';

/**
 * This file is the single source of truth for what each difficulty looks like:
 * the level picker reads `accent` for its glass colour, LevelProgress reads the
 * gradient/border classes. A difficulty missing a key renders as `undefined`
 * inside a className, which produces no error and no styling — the element just
 * quietly loses its colour.
 */

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

const REQUIRED_KEYS = [
  'accent',
  'gradient',
  'completedGradient',
  'completedColor',
  'currentGradient',
  'currentColor',
  'incompleteGradient',
  'incompleteColor',
  'progressGradient',
  'lastListenedBorder',
  'statColors',
] as const;

describe('level themes', () => {
  it('covers every difficulty', () => {
    expect(Object.keys(themes).sort()).toEqual([...DIFFICULTIES].sort());
  });

  it.each(DIFFICULTIES)('%s defines every key the UI reads', (difficulty) => {
    for (const key of REQUIRED_KEYS) {
      const value = (themes[difficulty] as Record<string, unknown>)[key];
      expect(value, `themes.${difficulty}.${key} is missing`).toBeDefined();
      if (typeof value === 'string') {
        expect(value.trim(), `themes.${difficulty}.${key} is empty`).not.toBe('');
      }
    }
  });

  it.each(DIFFICULTIES)('%s exposes accent as a resolvable CSS variable', (difficulty) => {
    // Deliberately a var(--color-*) reference rather than a hex: it points at
    // the palette variable Tailwind emits, so the SVG in the level picker
    // cannot drift from the utility classes beside it. A literal class name
    // here would not work — Tailwind never scans values built at runtime.
    expect(themes[difficulty].accent).toMatch(/^var\(--color-[a-z]+-\d{2,3}\)$/);
  });

  it('gives each difficulty a distinct accent', () => {
    const accents = DIFFICULTIES.map((d) => themes[d].accent);
    expect(new Set(accents).size).toBe(accents.length);
  });

  it('keeps accent and lastListenedBorder on the same hue', () => {
    // Both encode "this difficulty's colour". If they diverge, the level
    // picker and the progress page disagree about what green means.
    for (const difficulty of DIFFICULTIES) {
      const theme = themes[difficulty];
      const accentHue = theme.accent.match(/--color-([a-z]+)-/)?.[1];
      const borderHue = theme.lastListenedBorder.match(/border-([a-z]+)-/)?.[1];
      expect(accentHue, `${difficulty}: accent hue unreadable`).toBeTruthy();
      expect(borderHue, `${difficulty}: border hue unreadable`).toBe(accentHue);
    }
  });

  it('uses the documented easy/medium/hard hues', () => {
    expect(themes.easy.accent).toContain('green');
    expect(themes.medium.accent).toContain('orange');
    expect(themes.hard.accent).toContain('purple');
  });
});
