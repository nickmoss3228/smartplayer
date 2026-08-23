// scripts/unpublishAllStories.js
//
// Stabilisation step. Sets published:false on every Story document, so the app
// falls back to the static built-in content for every story.
//
// Why this is safe, and why it is the right first move: the frontend currently
// resolves a story from BOTH sources at once — tracks come from the DB while
// the vocabulary chips come from the static files (Player.tsx / WaveformPlayer
// via useTrackVocabulary). A published story is therefore half itself, which is
// what makes the admin panel disagree with the list. Unpublishing collapses
// everything back to one source until the resolver lands.
//
// Nothing is destroyed: drafts keep all their content, PartMarkers keeps every
// marker, and StoryVisibility (hidden) is untouched — hiding is the one control
// that already works correctly and is still wanted.
//
// Idempotent: stories already unpublished are counted and skipped.
//
// Usage:
//   node src/scripts/unpublishAllStories.js --dry-run
//   node src/scripts/unpublishAllStories.js
//   node src/scripts/unpublishAllStories.js --story news-roland-garros   # just one

import mongoose from "mongoose";
import { config } from "../config/env.js";
import { Story } from "../models/Story.js";

const dryRun = process.argv.includes("--dry-run");
const only = (() => {
  const i = process.argv.indexOf("--story");
  return i !== -1 ? process.argv[i + 1] : undefined;
})();

await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 15000 });
console.log(`Connected to "${mongoose.connection.name}"${dryRun ? "  (DRY RUN)" : ""}\n`);

const filter = only ? { storyId: only } : {};
const stories = await Story.find(filter).select("difficulty storyId storyName published").lean();

if (!stories.length) {
  console.log(only ? `No story with storyId "${only}".` : "No stories in this database.");
  await mongoose.disconnect();
  process.exit(0);
}

let changed = 0;
let alreadyDraft = 0;

for (const s of stories) {
  if (!s.published) {
    alreadyDraft++;
    console.log(`  ${s.difficulty}/${s.storyId} — already a draft, left alone`);
    continue;
  }
  if (!dryRun) {
    await Story.updateOne({ _id: s._id }, { $set: { published: false } });
  }
  changed++;
  console.log(`  ${s.difficulty}/${s.storyId} — published -> draft${dryRun ? " (would be)" : ""}`);
}

console.log(
  `\n${dryRun ? "Would unpublish" : "Unpublished"} ${changed} story/stories.` +
    (alreadyDraft ? `  ${alreadyDraft} already draft.` : "") +
    "\nDrafts, markers and hidden flags are unchanged.",
);
await mongoose.disconnect();
