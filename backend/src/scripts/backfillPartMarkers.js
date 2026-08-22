// scripts/backfillPartMarkers.js
//
// One-off migration. models/PartMarkers.js only starts remembering markers
// once they're saved again in the Story Builder, or once the story is deleted
// (deleteStory snapshots them on the way out). Every marker placed BEFORE that
// code shipped is therefore unprotected until someone touches it — and the
// operation most likely to touch it first is the delete that used to destroy
// it. This copies what already exists in the story documents into the durable
// collection, so the protection is retroactive.
//
// Safe to re-run. It only fills parts that have no remembered row yet and skips
// any that do, so it can never overwrite a newer copy with an older one — the
// same fill-a-gap-never-overwrite rule the restore path uses.
//
// Usage:
//   node src/scripts/backfillPartMarkers.js --dry-run
//   node src/scripts/backfillPartMarkers.js

import mongoose from "mongoose";
import { config } from "../config/env.js";
import { Story } from "../models/Story.js";
import { PartMarkers } from "../models/PartMarkers.js";

const dryRun = process.argv.includes("--dry-run");

await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 15000 });
console.log(`Connected to "${mongoose.connection.name}"${dryRun ? "  (DRY RUN)" : ""}\n`);

const stories = await Story.find({}).lean();
let wrote = 0;
let skipped = 0;
let markers = 0;

for (const story of stories) {
  const lines = [];
  for (const part of story.parts ?? []) {
    const count = part.timeMarkers?.length ?? 0;
    if (!count) continue;

    const existing = await PartMarkers.findOne({
      difficulty: story.difficulty,
      storyId: story.storyId,
      partNumber: part.partNumber,
    }).lean();

    if (existing) {
      skipped++;
      lines.push(`    part ${part.partNumber}: already remembered (${existing.timeMarkers?.length ?? 0}), left alone`);
      continue;
    }

    if (!dryRun) {
      await PartMarkers.updateOne(
        { difficulty: story.difficulty, storyId: story.storyId, partNumber: part.partNumber },
        { $set: { timeMarkers: part.timeMarkers, updatedAt: new Date() } },
        { upsert: true },
      );
    }
    wrote++;
    markers += count;
    lines.push(`    part ${part.partNumber}: ${count} marker(s) ${dryRun ? "would be" : ""} saved`);
  }
  if (lines.length) {
    console.log(`  ${story.difficulty}/${story.storyId}`);
    lines.forEach((l) => console.log(l));
  }
}

console.log(
  `\n${dryRun ? "Would write" : "Wrote"} ${wrote} part row(s), ${markers} marker(s).` +
    (skipped ? `  ${skipped} already remembered and left untouched.` : ""),
);
await mongoose.disconnect();
