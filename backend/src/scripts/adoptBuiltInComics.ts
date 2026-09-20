// Copies the built-in comic pages onto the DB copies of leo / maya / daniel.
//
// Why: those three stories were imported before the importer knew about the
// comic manifest, so every one of their 30 parts has `comic_url` NULL. They
// still show artwork today only because they are UNPUBLISHED and the player
// takes the static branch. Publishing them — which the real paywall lock
// requires — would silently drop every page. See the memory note
// smartplayer-comics-db-static-split and resolveStory.ts's builtInComicFor.
//
// The pages come from the frontend's own manifest (comicsData.ts), imported
// directly rather than copied, so there is still exactly one list.
//
//   npx tsx src/scripts/adoptBuiltInComics.ts            # dry run (default)
//   npx tsx src/scripts/adoptBuiltInComics.ts --commit   # write
//   npx tsx src/scripts/adoptBuiltInComics.ts --undo     # clear exactly what --commit set
//
// Only fills parts whose comic_url is empty; never overwrites a page someone
// chose in the Story Builder. Refuses any database whose name lacks "dev".

import { and, eq } from "drizzle-orm";

import { closeDb, db, ping, schema, stories } from "../db/index.js";
import type { Difficulty } from "../db/index.js";
// Loaded at runtime rather than imported statically: the manifest lives in the
// frontend tree, outside this tsconfig's rootDir, so a static import breaks
// `npm run typecheck` for the whole backend. tsx resolves it fine either way.
const COMICS_MANIFEST = "../../../src/components/Player/Comics/comicsData.ts";
const { getOrderedComics } = (await import(COMICS_MANIFEST)) as {
  getOrderedComics: (difficulty: string) => string[];
};

const commit = process.argv.includes("--commit");
const undo = process.argv.includes("--undo");

// Mirrors COMIC_OWNER_BY_DIFFICULTY in resolveStory.ts: the manifest is keyed
// by difficulty and belongs to that level's original character story only.
const OWNERS: Array<[difficulty: Difficulty, storyId: string]> = [
  ["easy", "leo"],
  ["medium", "maya"],
  ["hard", "daniel"],
];

const setComic = (storyPk: string, partNumber: number, comicUrl: string | null) =>
  db()
    .update(schema.storyPart)
    .set({ comicUrl })
    .where(and(eq(schema.storyPart.storyPk, storyPk), eq(schema.storyPart.partNumber, partNumber)));

try {
  const { database } = await ping();
  if (!database.includes("dev")) {
    console.error(`REFUSING TO RUN: database is "${database}", which is not a dev database.`);
    process.exitCode = 1;
  } else {
    console.log(`db: ${database}   mode: ${undo ? "UNDO" : commit ? "COMMIT" : "dry run"}\n`);
    let changed = 0;

    for (const [difficulty, storyId] of OWNERS) {
      const head = await stories.findByIdentity(difficulty, storyId);
      if (!head) {
        console.log(`${difficulty}/${storyId}: not in this database — skipped`);
        continue;
      }
      const pages = getOrderedComics(difficulty);
      const parts = (await stories.loadAggregate(head.id))?.parts ?? [];

      for (const part of parts) {
        const page = pages[part.partNumber - 1] ?? null;
        if (!page) continue;

        if (undo) {
          // Only pages this script would have set, so a hand-picked page survives.
          if (part.comicUrl !== page) continue;
          console.log(`  ${difficulty}/${storyId} part ${part.partNumber}: clear`);
          await setComic(head.id, part.partNumber, null);
          changed += 1;
          continue;
        }

        if (part.comicUrl) continue;
        console.log(`  ${difficulty}/${storyId} part ${part.partNumber}: ${page}`);
        if (commit) await setComic(head.id, part.partNumber, page);
        changed += 1;
      }
    }

    console.log(
      `\n${changed} part(s) ${undo ? "cleared" : commit ? "updated" : "would be updated (dry run — pass --commit)"}`,
    );
  }
} finally {
  await closeDb();
}
