// modules/hub/hubData.ts
//
// Pure decisions for the signed-in hub (/home): which part the "Continue" card
// opens, which started stories sit below it, and the weekly parts count. No
// React, no fetching; the page passes in what it has and every input may be
// partial (null overview, missing levelResults, malformed keys).

import type { DetailedProgressMap, Difficulty, OverviewData, StoryOverview } from '../../types/Dashboard';
import { lastPlayedTitle, type LastPlayed } from '../../services/lastPlayed';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

export interface ContinueTarget {
  difficulty: Difficulty;
  storyId: string;
  part: number;
  totalParts: number | null;
  completedParts: number[];
  title: string;
  href: string;
  source: 'device' | 'server' | 'start';
}

export interface StartedStory {
  difficulty: Difficulty;
  storyId: string;
  title: string;
  done: number;
  total: number;
  nextPart: number;
  href: string;
}

interface Result {
  difficulty: Difficulty;
  storyId: string;
  part: number;
  completed: boolean;
  /** ms since epoch, null when absent or unparseable */
  at: number | null;
}

const isDifficulty = (d: unknown): d is Difficulty => DIFFICULTIES.includes(d as Difficulty);

const storiesOf = (overview: OverviewData | null, d: Difficulty): StoryOverview[] => {
  const list = overview?.[d]?.stories;
  return Array.isArray(list) ? list.filter((s) => s && typeof s.storyId === 'string' && s.storyId) : [];
};

const doneOf = (s: StoryOverview): number[] =>
  Array.isArray(s.completedParts) ? s.completedParts.filter((p) => Number.isInteger(p)) : [];

const totalOf = (s: StoryOverview): number =>
  typeof s.totalParts === 'number' && Number.isInteger(s.totalParts) && s.totalParts > 0 ? s.totalParts : 0;

/** Lowest part in 1..total not done, or null when every part is done. */
const lowestUndone = (s: StoryOverview): number | null => {
  const done = new Set(doneOf(s));
  const total = totalOf(s);
  for (let p = 1; p <= total; p++) if (!done.has(p)) return p;
  return null;
};

const findStory = (overview: OverviewData | null, d: Difficulty, storyId: string): StoryOverview | undefined =>
  storiesOf(overview, d).find((s) => s.storyId === storyId);

/** Every well-formed levelResults entry across the three difficulties. */
const flattenResults = (detailed: DetailedProgressMap | null): Result[] => {
  const out: Result[] = [];
  for (const difficulty of DIFFICULTIES) {
    const results = detailed?.[difficulty]?.levelResults;
    if (!results || typeof results !== 'object') continue;
    for (const [key, value] of Object.entries(results)) {
      const colon = key.lastIndexOf(':');
      if (colon <= 0) continue;
      const storyId = key.slice(0, colon);
      const partRaw = key.slice(colon + 1);
      if (!/^\d+$/.test(partRaw)) continue;
      const part = Number(partRaw);
      if (part < 1 || !value || typeof value !== 'object') continue;
      const parsed = value.completedAt ? Date.parse(value.completedAt) : NaN;
      out.push({
        difficulty,
        storyId,
        part,
        completed: value.completed === true,
        at: Number.isNaN(parsed) ? null : parsed,
      });
    }
  }
  return out;
};

/** Newest completion time per "difficulty/storyId". */
const newestPerStory = (results: Result[]): Map<string, number> => {
  const map = new Map<string, number>();
  for (const r of results) {
    if (!r.completed || r.at === null) continue;
    const k = `${r.difficulty}/${r.storyId}`;
    const prev = map.get(k);
    if (prev === undefined || r.at > prev) map.set(k, r.at);
  }
  return map;
};

const playerHref = (difficulty: string, storyId: string, part: number) =>
  `/levels/${difficulty}/${storyId}/${part}`;

const storyHref = (difficulty: string, storyId: string) => `/levels/${difficulty}/${storyId}`;

const isStarted = (s: StoryOverview) => {
  const n = doneOf(s).length;
  return n > 0 && n < totalOf(s);
};

interface Candidate {
  difficulty: Difficulty;
  storyId: string;
  part: number;
  at: number;
}

function serverCandidate(overview: OverviewData | null, results: Result[]): Candidate | null {
  let newest: Result | null = null;
  for (const r of results) {
    if (r.completed && r.at !== null && (newest === null || r.at > newest.at!)) newest = r;
  }
  if (!newest) return null;

  const story = findStory(overview, newest.difficulty, newest.storyId);
  if (!story) {
    return { difficulty: newest.difficulty, storyId: newest.storyId, part: newest.part, at: newest.at! };
  }
  const next = lowestUndone(story);
  if (next !== null) {
    return { difficulty: newest.difficulty, storyId: newest.storyId, part: next, at: newest.at! };
  }

  // The newest story is finished: fall back to the most recent unfinished one.
  const times = newestPerStory(results);
  let best: Candidate | null = null;
  for (const d of DIFFICULTIES) {
    for (const s of storiesOf(overview, d)) {
      if (!isStarted(s)) continue;
      const at = times.get(`${d}/${s.storyId}`);
      if (at === undefined || (best !== null && at <= best.at)) continue;
      best = { difficulty: d, storyId: s.storyId, part: lowestUndone(s)!, at };
    }
  }
  return best;
}

function deviceCandidate(lp: LastPlayed | null, overview: OverviewData | null) {
  if (!lp || !isDifficulty(lp.difficulty)) return null;
  const story = findStory(overview, lp.difficulty, lp.storySlug);
  let part = lp.part;
  if (story) {
    const next = lowestUndone(story);
    if (next === null) return null;
    if (doneOf(story).includes(part)) part = next;
  }
  return { difficulty: lp.difficulty, storyId: lp.storySlug, part, story };
}

export function pickContinue(args: {
  lastPlayed: LastPlayed | null;
  overview: OverviewData | null;
  detailed: DetailedProgressMap | null;
  locale: string;
  suggestedLevel?: Difficulty | null;
}): ContinueTarget | null {
  const { lastPlayed, overview, detailed, locale, suggestedLevel } = args;

  const server = serverCandidate(overview, flattenResults(detailed));
  const device = deviceCandidate(lastPlayed, overview);

  const build = (
    c: { difficulty: Difficulty; storyId: string; part: number },
    source: ContinueTarget['source'],
  ): ContinueTarget => {
    const story = findStory(overview, c.difficulty, c.storyId);
    const title =
      source === 'device' && lastPlayed
        ? lastPlayedTitle(lastPlayed, locale)
        : story?.storyName?.trim() || c.storyId;
    return {
      difficulty: c.difficulty,
      storyId: c.storyId,
      part: c.part,
      totalParts: story ? totalOf(story) : null,
      completedParts: story ? doneOf(story) : [],
      title,
      href: playerHref(c.difficulty, c.storyId, c.part),
      source,
    };
  };

  if (device && (!server || lastPlayed!.at >= server.at)) return build(device, 'device');
  if (server) return build(server, 'server');

  if (!overview) return null;
  const level: Difficulty = isDifficulty(suggestedLevel) ? suggestedLevel : 'easy';
  const first = storiesOf(overview, level)[0];
  if (first) return build({ difficulty: level, storyId: first.storyId, part: 1 }, 'start');
  for (const d of DIFFICULTIES) {
    const s = storiesOf(overview, d)[0];
    if (s) return build({ difficulty: d, storyId: s.storyId, part: 1 }, 'start');
  }
  return null;
}

export function startedStories(args: {
  overview: OverviewData | null;
  detailed: DetailedProgressMap | null;
  exclude?: { difficulty: string; storyId: string } | null;
  limit?: number;
}): StartedStory[] {
  const { overview, detailed, exclude, limit = 6 } = args;
  const times = newestPerStory(flattenResults(detailed));

  const items: { story: StartedStory; at: number | null }[] = [];
  for (const d of DIFFICULTIES) {
    for (const s of storiesOf(overview, d)) {
      if (!isStarted(s)) continue;
      if (exclude && exclude.difficulty === d && exclude.storyId === s.storyId) continue;
      items.push({
        at: times.get(`${d}/${s.storyId}`) ?? null,
        story: {
          difficulty: d,
          storyId: s.storyId,
          title: s.storyName?.trim() || s.storyId,
          done: doneOf(s).length,
          total: totalOf(s),
          nextPart: lowestUndone(s)!,
          href: storyHref(d, s.storyId),
        },
      });
    }
  }

  // Array.prototype.sort is stable, so ties keep difficulty then overview order.
  items.sort((a, b) => {
    if (a.at === null && b.at === null) return 0;
    if (a.at === null) return 1;
    if (b.at === null) return -1;
    return b.at - a.at;
  });
  return items.slice(0, Math.max(0, limit)).map((i) => i.story);
}

/** Monday 00:00 local time of the week containing `now`, ms since epoch. */
export function startOfWeek(now: Date): number {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

export function partsCompletedSince(detailed: DetailedProgressMap | null, sinceMs: number): number {
  return flattenResults(detailed).filter((r) => r.completed && r.at !== null && r.at >= sinceMs).length;
}
