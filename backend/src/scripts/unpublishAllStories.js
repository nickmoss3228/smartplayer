// scripts/unpublishAllStories.js
//
// Stabilisation step. Sets published = false on every story row, so the app
// falls back to the static built-in content for every story.
//
// Why this is safe, and why it is the right first move: the frontend currently
// resolves a story from BOTH sources at once — tracks come from the DB while
// the vocabulary chips come from the static files (Player.tsx / WaveformPlayer
// via useTrackVocabulary). A published story is therefore half itself, which is
// what makes the admin panel disagree with the list. Unpublishing collapses
// everything back to one source until the resolver lands.
//
// Nothing is destroyed: drafts keep all their content, part_markers keeps every
// marker, and story_visibility (hidden) is untouched — hiding is the one
// control that already works correctly and is still wanted.
//
// Idempotent: stories already unpublished are counted and skipped.
//
// Usage:
//   node --import tsx src/scripts/unpublishAllStories.js --dry-run
//   node --import tsx src/scripts/unpublishAllStories.js
//   node --import tsx src/scripts/unpublishAllStories.js --story news-roland-garros   # just one

import { closeDb, ping, stories } from "../db/index.js";

const dryRun = process.argv.includes("--dry-run");
const only = (() => {
  const i = process.argv.indexOf("--story");
  return i !== -1 ? process.argv[i + 1] : undefined;
})();

try {
  const { database } = await ping();
  console.log(`Connected to "${database}"${dryRun ? "  (DRY RUN)" : ""}\n`);

  const rows = (await stories.list()).filter((s) => !only || s.storyId === only);

  if (!rows.length) {
    console.log(only ? `No story with storyId "${only}".` : "No stories in this database.");
  } else {
    let changed = 0;
    let alreadyDraft = 0;

    for (const s of rows) {
      if (!s.published) {
        alreadyDraft++;
        console.log(`  ${s.difficulty}/${s.storyId} — already a draft, left alone`);
        continue;
      }
      if (!dryRun) await stories.setPublished(s.id, false);
      changed++;
      console.log(`  ${s.difficulty}/${s.storyId} — published -> draft${dryRun ? " (would be)" : ""}`);
    }

    console.log(
      `\n${dryRun ? "Would unpublish" : "Unpublished"} ${changed} story/stories.` +
        (alreadyDraft ? `  ${alreadyDraft} already draft.` : "") +
        "\nDrafts, markers and hidden flags are unchanged.",
    );
  }
} finally {
  await closeDb();
}
