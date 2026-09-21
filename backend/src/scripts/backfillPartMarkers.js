// scripts/backfillPartMarkers.js
//
// One-off migration. The part_markers table only starts remembering markers
// once they're saved again in the Story Builder, or once the story is deleted
// (deleteStory snapshots them on the way out). Every marker placed BEFORE that
// code shipped is therefore unprotected until someone touches it — and the
// operation most likely to touch it first is the delete that used to destroy
// it. This copies what already exists on the story parts into the durable
// table, so the protection is retroactive.
//
// Safe to re-run. It only fills parts that have no remembered row yet and skips
// any that do, so it can never overwrite a newer copy with an older one — the
// same fill-a-gap-never-overwrite rule the restore path uses.
//
// Usage:
//   node --import tsx src/scripts/backfillPartMarkers.js --dry-run
//   node --import tsx src/scripts/backfillPartMarkers.js

import { closeDb, ping, stories } from "../db/index.js";

const dryRun = process.argv.includes("--dry-run");

try {
  const { database } = await ping();
  console.log(`Connected to "${database}"${dryRun ? "  (DRY RUN)" : ""}\n`);

  let wrote = 0;
  let skipped = 0;
  let markers = 0;

  for (const head of await stories.list()) {
    const aggregate = await stories.loadAggregate(head.id);
    const remembered = await stories.recallMarkers(head.difficulty, head.storyId);
    const lines = [];

    for (const part of aggregate?.parts ?? []) {
      const count = part.timeMarkers.length;
      if (!count) continue;

      const existing = remembered[part.partNumber];
      if (existing) {
        skipped++;
        lines.push(`    part ${part.partNumber}: already remembered (${existing.length}), left alone`);
        continue;
      }

      if (!dryRun) {
        await stories.rememberMarkers(head.difficulty, head.storyId, part.partNumber, part.timeMarkers);
      }
      wrote++;
      markers += count;
      lines.push(`    part ${part.partNumber}: ${count} marker(s) ${dryRun ? "would be" : ""} saved`);
    }

    if (lines.length) {
      console.log(`  ${head.difficulty}/${head.storyId}`);
      lines.forEach((l) => console.log(l));
    }
  }

  console.log(
    `\n${dryRun ? "Would write" : "Wrote"} ${wrote} part row(s), ${markers} marker(s).` +
      (skipped ? `  ${skipped} already remembered and left untouched.` : ""),
  );
} finally {
  await closeDb();
}
