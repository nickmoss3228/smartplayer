// Moves the stories that used to ship inside the frontend bundle (leo,
// leo-additional, maya, daniel and the two news stories) fully into the story
// table, and publishes them as ordinary DB stories.
//
// The content comes from src/seed/builtInStories.json — a frozen export of the
// frontend's static files (audiodata, vocabulary, comics, preview cards, the
// locale story text) plus config/quizData.js, taken on 2026-10-02. After this
// has run in an environment, the frontend no longer needs those files there.
//
//   node --import tsx src/scripts/seedBuiltInStories.ts            # dry run (default)
//   node --import tsx src/scripts/seedBuiltInStories.ts --commit   # write
//
// Most environments already hold an imported copy of each story, so this
// MERGES rather than overwrites. The rule is "keep what learners hear today":
//
//   - A PUBLISHED copy is what learners hear, so it wins on every field it
//     has. The seed only fills blanks: part titles, preview cards, help clips,
//     comic pages, the story's text, cover and shelf.
//   - An UNPUBLISHED copy is invisible — learners hear the static version — and
//     the static vocabulary was revised after those drafts were imported. So
//     its vocabulary and phrasal verbs are taken from the seed. Anything else
//     the draft has (markers placed in the Story Builder, re-uploaded audio,
//     edited quizzes) is kept, and blanks are filled as above.
//   - Time markers are kept whenever the copy has a usable set (2 or more);
//     the static news files never had any.
//
// A story missing entirely is created from the seed. Pricing columns are left
// alone on existing rows (seedBuiltInCatalog.js owns them). Idempotent: a
// second run changes nothing.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { closeDb, ping, stories } from "../db/index.js";
import type { Difficulty } from "../db/index.js";
// Plain-JS modules with no type declarations, loaded by a path held in a
// variable so `npm run typecheck` does not try to resolve them (the same trick
// adoptBuiltInComics.ts uses). tsx loads them fine either way.
const PRICE_CATALOG = "../config/priceCatalog.js";
const CATALOG_STORE = "../helpers/catalogStore.js";
const { BUILT_IN_ROWS } = (await import(PRICE_CATALOG)) as {
  BUILT_IN_ROWS: Array<{ key: string; character?: string }>;
};
const { invalidateCatalog } = (await import(CATALOG_STORE)) as { invalidateCatalog: () => void };

type SeedPart = {
  partNumber: number;
  title: string;
  audioUrl: string | null;
  helpAudio: string[];
  comicUrl: string | null;
  intro: unknown;
  timeMarkers: Array<{ time: number; label?: string; color?: string }>;
  vocabulary: Array<{ word: string; definition: string; audioKey: string; audioUrl: string }>;
  phrasalVerbs: Array<{ word: string; definition: string; audioKey: string; audioUrl: string }>;
  quiz: Array<{
    question: string;
    options: string[];
    correctAnswer: number;
    referenceTime: number;
    audio: { fast: string; slow: string };
  }>;
};
type SeedStory = {
  difficulty: Difficulty;
  storyId: string;
  storyName: string;
  description: string;
  characterIcon: string;
  category: "general" | "news";
  coverUrl: string | null;
  localized: { title: { en: string; ru: string }; description: { en: string; ru: string } };
  totalParts: number;
  /** Drafted 2026-10-04 from the part intros; see `_about` in the JSON. */
  cast?: unknown[];
  parts: SeedPart[];
};

const SEED_FILE = fileURLToPath(new URL("../seed/builtInStories.json", import.meta.url));
const seed: SeedStory[] = JSON.parse(readFileSync(SEED_FILE, "utf8")).stories;
const commit = process.argv.includes("--commit");

const blank = (v: unknown) =>
  v === null || v === undefined || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.length === 0);
const usableMarkers = (m: unknown[] | undefined) => (m?.length ?? 0) >= 2;

try {
  const { database } = await ping();
  console.log(`db: ${database}   mode: ${commit ? "COMMIT" : "dry run"}\n`);

  for (const s of seed) {
    const key = `${s.difficulty}/${s.storyId}`;
    const existing = await stories.findByIdentity(s.difficulty, s.storyId);

    if (!existing) {
      const row = BUILT_IN_ROWS.find((r) => r.key === key);
      console.log(`${key}: not in this database — create and publish (${s.parts.length} parts)`);
      if (commit) {
        await stories.createStoryWithParts({
          ...s,
          character: row?.character ?? "",
          published: true,
          contentSource: "db",
          parts: s.parts as never,
        });
      }
      continue;
    }

    const changes: string[] = [];
    const outcome = await stories.mutateStory(existing.id, (story) => {
      const wasLive = story.published && story.contentSource === "db";

      const dbNumbers = story.parts.map((p) => p.partNumber).sort((a, b) => a - b).join(",");
      const seedNumbers = s.parts.map((p) => p.partNumber).sort((a, b) => a - b).join(",");
      if (dbNumbers !== seedNumbers) {
        return { halt: `parts differ (db ${dbNumbers || "none"}, seed ${seedNumbers}) — fix by hand` };
      }

      const fill = <T extends object, K extends keyof T>(target: T, field: K, value: T[K], label: string) => {
        if (blank(target[field]) && !blank(value)) {
          target[field] = value;
          changes.push(label);
        }
      };

      fill(story, "category", s.category, "category");
      fill(story, "coverUrl", s.coverUrl, "cover");
      // Only an EMPTY cast is filled, like every other field here: once an
      // admin has edited the characters in the Builder, the seed keeps out.
      fill(story, "cast", s.cast as never, "cast");
      for (const side of ["title", "description"] as const) {
        for (const lang of ["en", "ru"] as const) {
          fill(story.localized[side], lang, s.localized[side][lang], `${side}.${lang}`);
        }
      }

      for (const part of story.parts) {
        const src = s.parts.find((p) => p.partNumber === part.partNumber)!;
        const P = `part ${part.partNumber}`;
        fill(part, "title", src.title, `${P} title`);
        fill(part, "audioUrl", src.audioUrl, `${P} audio`);
        fill(part, "comicUrl", src.comicUrl, `${P} comic`);
        fill(part, "intro", src.intro as never, `${P} card`);
        fill(part, "helpAudio", src.helpAudio, `${P} help clips`);
        fill(part, "quiz", src.quiz as never, `${P} quiz`);
        if (!usableMarkers(part.timeMarkers) && usableMarkers(src.timeMarkers)) {
          part.timeMarkers = src.timeMarkers as never;
          changes.push(`${P} markers`);
        }
        if (!wasLive) {
          const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
          if (!same(part.vocabulary, src.vocabulary)) {
            part.vocabulary = src.vocabulary as never;
            changes.push(`${P} vocabulary`);
          }
          if (!same(part.phrasalVerbs, src.phrasalVerbs)) {
            part.phrasalVerbs = src.phrasalVerbs as never;
            changes.push(`${P} phrasal verbs`);
          }
        }
      }

      if (story.contentSource !== "db") {
        story.contentSource = "db";
        changes.push("content source → db");
      }
      if (!story.published) {
        story.published = true;
        changes.push("published");
      }

      // A dry run reads and decides inside the same transaction, then halts.
      if (!commit || changes.length === 0) return { halt: null };
    });

    if (outcome && "halt" in outcome && typeof outcome.halt === "string") {
      console.log(`${key}: SKIPPED — ${outcome.halt}`);
      continue;
    }
    console.log(`${key}: ${changes.length ? changes.join(", ") : "nothing to change"}`);
  }

  if (commit) invalidateCatalog();
  if (!commit) console.log("\nDry run — nothing written. Re-run with --commit.");
} finally {
  await closeDb();
}
