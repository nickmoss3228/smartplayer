// Read-only report: what the database holds for every story the price catalog
// sells, and whether each is ready to be published as the gated DB version.
//
//   node --import tsx src/scripts/inspectPaidStories.mjs
//
// Writes nothing. Safe against any database, but run it against dev first.

import { config } from "../config/env.js";
import { CATALOG_STORIES } from "../config/priceCatalog.js";
import { closeDb, ping, stories } from "../db/index.js";

try {
  const { database } = await ping();
  console.log(`db: ${database} | bucket: ${config.yandex.bucket} | base: ${config.yandex.baseUrl}\n`);

  const count = (parts, pick) => parts.filter(pick).length;

  for (const entry of CATALOG_STORIES) {
    const [difficulty, storyId] = entry.key.split("/");
    const head = await stories.findByIdentity(difficulty, storyId);
    if (!head) {
      console.log(`${entry.key.padEnd(28)} MISSING (catalog says ${entry.parts} parts)`);
      continue;
    }
    const parts = (await stories.loadAggregate(head.id))?.parts ?? [];
    const flags = [
      `published=${head.published}`,
      `parts=${parts.length}/${entry.parts}`,
      `audio=${count(parts, (p) => p.audioUrl)}`,
      `comic=${count(parts, (p) => p.comicUrl)}`,
      `quiz=${count(parts, (p) => p.quiz.length)}`,
      `markers=${count(parts, (p) => p.timeMarkers.length)}`,
      `vocab=${count(parts, (p) => p.vocabulary.length)}`,
      `category=${head.category}`,
    ];
    console.log(`${entry.key.padEnd(28)} ${flags.join("  ")}`);
    if (parts[0]?.audioUrl) console.log(`${"".padEnd(28)} part 1 audio: ${parts[0].audioUrl}`);
  }

  const published = await stories.list({ publishedOnly: true });
  console.log(`\npublished stories in this db: ${published.length}`);
} finally {
  await closeDb();
}
