// scripts/makeSlowCopies.js
//
// Makes the 0.65x and 0.8x slowed copies (services/slowCopies.js) for every
// part that has audio but no up-to-date copies: the parts uploaded before the
// Story Builder started making them, and any whose audio was replaced since.
// Needs AUDIO_WORKER_URL and the storage keys of the environment it runs in.
//
// Safe to re-run: a part whose copies still match its audio is skipped unless
// --force is given. A part whose audio changes while its copies are being made
// is left alone and reported.
//
// Usage:
//   node --import tsx src/scripts/makeSlowCopies.js --dry-run
//   node --import tsx src/scripts/makeSlowCopies.js [--story <storyId>] [--force]

import { closeDb, ping, stories } from "../db/index.js";
import { makeSlowCopies } from "../services/slowCopies.js";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const onlyStory = args.includes("--story") ? args[args.indexOf("--story") + 1] : null;

const isUpToDate = (part) =>
  stories.SLOW_SPEEDS.every((speed) => Boolean(stories.freshSlowCopies(part)[speed]));

try {
  const { database } = await ping();
  console.log(`Connected to "${database}"${dryRun ? "  (DRY RUN)" : ""}\n`);

  let made = 0;
  let skipped = 0;
  let failed = 0;

  for (const head of await stories.list()) {
    if (onlyStory && head.storyId !== onlyStory) continue;
    const story = await stories.loadStoryJson(head.id);
    if (!story) continue;
    console.log(`${story.difficulty}/${story.storyId}`);

    for (const part of story.parts) {
      const label = `    part ${part.partNumber}`;
      if (!part.audioUrl) {
        console.log(`${label}: no audio`);
        continue;
      }
      if (!force && isUpToDate(part)) {
        skipped++;
        console.log(`${label}: up to date`);
        continue;
      }
      if (dryRun) {
        made++;
        console.log(`${label}: would make copies`);
        continue;
      }

      const started = Date.now();
      try {
        const slowAudio = await makeSlowCopies(story, part);
        const result = await stories.mutateStory(head.id, (current) => {
          const target = current.parts.find((p) => p.partNumber === part.partNumber);
          if (!target || target.audioUrl !== slowAudio.source) return { halt: { status: 409, body: null } };
          target.slowAudio = slowAudio;
        });
        if (!result || "halt" in result) {
          failed++;
          console.log(`${label}: audio changed while copying, left alone`);
          continue;
        }
        made++;
        console.log(`${label}: made in ${((Date.now() - started) / 1000).toFixed(1)} s`);
      } catch (error) {
        failed++;
        console.log(`${label}: FAILED, ${error.message}`);
      }
    }
  }

  console.log(`\n${dryRun ? "Would make" : "Made"} ${made}, up to date ${skipped}, failed ${failed}.`);
  process.exitCode = failed > 0 ? 1 : 0;
} finally {
  await closeDb();
}
