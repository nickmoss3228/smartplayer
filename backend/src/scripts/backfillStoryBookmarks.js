// scripts/backfillStoryBookmarks.js
//
// Repairs story bookmarks (story_progress.current_part) left stuck by the
// completeStoryPart bug fixed on 2026-09-23.
//
// THE BUG
//
// The "advance the bookmark" CASE compared two bare query parameters,
// `$part < $total`. Neither side was a column, so Postgres typed both as TEXT
// and compared them alphabetically: "1" < "10" is true, "2" < "10" is false.
// So passing part 1 moved the bookmark to 2, and from then on it never moved
// again on any 10-part story. completed_parts was always written correctly —
// only the bookmark is wrong, which is why this can be repaired from the data.
//
// HOW A STUCK ROW IS RECOGNISED
//
// The bookmark sits on a part that is already completed, and that part is not
// the last one. The healthy code never leaves a row like that: passing the
// current part always advances it (see completeStoryPart). A bookmark on an
// UNcompleted part is left alone, whatever else the row says — that is a
// learner who is simply on that part.
//
// WHERE IT MOVES TO
//
// The first part the learner has not completed, or the last part if they have
// completed every one (the same resting place the healthy code uses). Part
// counts come from getStoryMeta, the lookup the progress controller itself
// uses, so built-in stories with no story row resolve too. A row whose story
// no longer exists is reported and skipped.
//
// SAFE TO RE-RUN
//
// Each UPDATE is conditioned on current_part still holding the value this
// script read, so a learner who passes a part while it runs keeps their newer
// bookmark instead of having it overwritten. updated_at is not touched — this
// is a repair, not activity, and "recently played" must not reshuffle.
//
// Usage (from backend/, against whatever DATABASE_URL points at):
//   node --import tsx src/scripts/backfillStoryBookmarks.js            # report only
//   node --import tsx src/scripts/backfillStoryBookmarks.js --apply    # write

import { pathToFileURL } from "node:url";
import { and, eq, sql } from "drizzle-orm";
import { closeDb, db, ping } from "../db/index.js";
import { storyProgress } from "../db/schema.js";
import { getStoryMeta } from "../helpers/storyLookup.js";

const apply = process.argv.includes("--apply");

/** First part in 1..totalParts not in `completed`, else totalParts. */
export function repairedBookmark(completed, totalParts) {
  const done = new Set(completed);
  for (let part = 1; part <= totalParts; part += 1) {
    if (!done.has(part)) return part;
  }
  return totalParts;
}

async function main() {
  const { database } = await ping();
  console.log(`Database: ${database}${apply ? "" : "  (report only — pass --apply to write)"}\n`);

  // Only rows whose bookmark sits on a completed part can be stuck.
  const candidates = await db()
    .select()
    .from(storyProgress)
    .where(sql`${storyProgress.currentPart} = ANY(${storyProgress.completedParts})`);

  const metaCache = new Map();
  const totalPartsFor = async (difficulty, storyId) => {
    const key = `${difficulty}/${storyId}`;
    if (!metaCache.has(key)) metaCache.set(key, (await getStoryMeta(difficulty, storyId))?.totalParts ?? null);
    return metaCache.get(key);
  };

  let fixed = 0;
  let raced = 0;
  const unknown = new Set();

  for (const row of candidates) {
    const totalParts = await totalPartsFor(row.difficulty, row.storyId);
    if (!totalParts) {
      unknown.add(`${row.difficulty}/${row.storyId}`);
      continue;
    }
    // On the last part and it is completed: that is where a finished story rests.
    if (row.currentPart >= totalParts) continue;

    const target = repairedBookmark(row.completedParts, totalParts);
    if (target === row.currentPart) continue;

    console.log(
      `  ${row.difficulty}/${row.storyId}  user ${row.userId}  ` +
        `completed [${row.completedParts.join(",")}]  part ${row.currentPart} -> ${target}`,
    );

    if (!apply) {
      fixed += 1;
      continue;
    }
    const updated = await db()
      .update(storyProgress)
      .set({ currentPart: target })
      .where(and(eq(storyProgress.id, row.id), eq(storyProgress.currentPart, row.currentPart)))
      .returning({ id: storyProgress.id });
    if (updated.length) fixed += 1;
    else raced += 1;
  }

  console.log(
    `\n${candidates.length} row(s) with the bookmark on a completed part; ` +
      `${fixed} ${apply ? "repaired" : "would be repaired"}` +
      (raced ? `; ${raced} changed while running and were left alone` : ""),
  );
  if (unknown.size) console.log(`Skipped, story not found: ${[...unknown].join(", ")}`);
}

// Only when run directly, so the test can import repairedBookmark.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(closeDb);
}
