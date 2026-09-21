import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * App.css holds `[data-list-reveal] { opacity: 0 }` until something sets the
 * attribute to "in". That makes the opt-in half of the pair mandatory: a
 * component that marks itself "out" and never reveals renders content that is
 * laid out, focusable and clickable but completely invisible.
 *
 * That is exactly what shipped once. The card carried `data-list-reveal="out"`
 * while the IntersectionObserver that flips it lived in List.tsx, so the moment
 * the card was shared with /stories, /shop and /library those pages rendered
 * invisible cards. Nothing failed — no error, no blank space, just nothing to
 * see — which is the worst shape a bug can take.
 *
 * A static check rather than a rendering one: the project has no component
 * testing setup, and the invariant is about which file owns the reveal, not
 * about runtime behaviour.
 */
const SRC = join(process.cwd(), 'src');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [path] : [];
  });
}

describe('scroll reveal', () => {
  const files = sourceFiles(SRC);

  it('has at least one file participating, so this test cannot pass vacuously', () => {
    const marking = files.filter((f) => readFileSync(f, 'utf8').includes('data-list-reveal="out"'));
    expect(marking.length).toBeGreaterThan(0);
  });

  it('never marks an element hidden without also revealing it', () => {
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      if (!source.includes('data-list-reveal="out"')) continue;

      expect(
        source.includes('data-list-reveal') && source.includes('IntersectionObserver'),
        `${relative(SRC, file)} hides elements with data-list-reveal="out" but never reveals ` +
          `them. Whatever sets "out" must also set "in", or the content is invisible ` +
          `while still being clickable.`,
      ).toBe(true);
    }
  });

  it('falls back to visible when IntersectionObserver is missing', () => {
    // The reveal must fail toward showing content. A decorative animation whose
    // stuck state is "invisible" is a content-loss bug wearing a nice coat.
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      if (!source.includes('data-list-reveal="out"')) continue;

      expect(
        source.includes("typeof IntersectionObserver === 'undefined'"),
        `${relative(SRC, file)} must reveal immediately when IntersectionObserver is ` +
          `unavailable, rather than leaving cards hidden.`,
      ).toBe(true);
    }
  });
});
