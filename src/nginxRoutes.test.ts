import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * nginx.conf answers the app's top-level routes itself: one hand-written
 * `location ~ ^/(...)` line sends those paths to the SPA, and anything it does
 * not list falls through to a 404. A route added to App.tsx but not to that
 * line works in dev and 404s in production.
 *
 * This test reads both files and fails when a top-level App route is missing
 * from the nginx list. It only checks App -> nginx; nginx may list extra
 * entries (for example a removed page), which is harmless.
 */

const appSource = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
const nginxConf = readFileSync(new URL('../nginx.conf', import.meta.url), 'utf8');

/** First path segment of every <Route path="/..."> that ships to production. */
const appSegments = new Set<string>();
for (const line of appSource.split('\n')) {
  // Dev-only routes are wrapped in `import.meta.env.DEV &&` and are not in prod.
  if (line.includes('import.meta.env.DEV')) continue;
  for (const [, path] of line.matchAll(/path="\/([^"]*)"/g)) {
    const segment = path.split('/')[0];
    if (segment === '' || segment === '*') continue;
    appSegments.add(segment);
  }
}

/** Entries of the `location ~ ^/(a|b|c)(/|$)` line in nginx.conf. */
const nginxLine = nginxConf.split('\n').find((line) => line.trim().startsWith('location ~ ^/('));
const nginxMatch = nginxLine?.match(/\^\/\(([^)]*)\)/);
const nginxEntries = new Set(nginxMatch ? nginxMatch[1].split('|') : []);

describe('nginx.conf lists every top-level App route', () => {
  it('finds routes and nginx entries to compare', () => {
    // Guards against a format change making the test below pass on nothing.
    expect(appSegments.size, 'too few App.tsx route segments parsed').toBeGreaterThanOrEqual(10);
    expect(nginxEntries.size, 'too few nginx location entries parsed').toBeGreaterThanOrEqual(10);
  });

  it('lists every App.tsx route segment in the nginx location line', () => {
    const missing = [...appSegments].filter((segment) => !nginxEntries.has(segment));
    expect(
      missing,
      `Routes in src/App.tsx missing from nginx.conf: ${missing.join(', ')}. ` +
        'Add them to the location ~ ^/(...) line in nginx.conf, or production returns 404.',
    ).toEqual([]);
  });
});
