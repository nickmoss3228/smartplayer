// scripts/seedBuiltInCatalog.js
//
// Gives every BUILT-IN story a catalog row, so leo/maya/daniel and the news
// stories are priced, listed and edited from /admin like everything else.
//
// ── Why a row, when the story already works without one ─────────────────────
//
// helpers/catalogStore.js falls back to BUILT_IN_ROWS for any key the database
// does not have, so these stories are priced correctly today. What the fallback
// cannot do is let an admin CHANGE anything: the price, the free allowance and
// the shelf are literals in a source file. Seeding turns each into a row, and
// the admin panel becomes the only place any of it is decided — which is the
// whole point of the exercise.
//
// ── contentSource: "builtin" — read this before changing it ─────────────────
//
// These rows carry NO parts, and must not. Their audio, comic pages, vocabulary
// and quizzes live in src/assets and config/quizData.js, and the story table's
// `content_source` column is what keeps them there: stories.loadPublishedAggregate
// returns null for a 'builtin' row, so every content read falls through to the
// static files exactly as before.
//
// Publishing one of these as a normal DB story instead would blank it — every
// comic page gone, every quiz gone — because a published 'db' row is
// authoritative for content and these rows have none. That trap is the reason
// content_source exists rather than being inferred from `published`.
//
// Direction is enforced: the target is DATABASE_URL, and the script refuses
// unless the database name looks like a dev or staging one.
//
// Idempotent: matched on (difficulty, story_id). Re-running updates the catalog
// columns and leaves everything else — including any title an admin has since
// edited — alone, unless --reset-text is passed.
//
// Usage:
//   node --import tsx src/scripts/seedBuiltInCatalog.js --dry-run
//   node --import tsx src/scripts/seedBuiltInCatalog.js
//   node --import tsx src/scripts/seedBuiltInCatalog.js --reset-text

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { BUILT_IN_ROWS } from "../config/priceCatalog.js";
import { closeDb, ping, stories } from "../db/index.js";

const dryRun = process.argv.includes("--dry-run");
const resetText = process.argv.includes("--reset-text");

const here = dirname(fileURLToPath(import.meta.url));
const localeDir = resolve(here, "../../../src/locales");

/**
 * Cover art and emoji, mirroring src/types/storyGroups.ts's storyGroupsRaw.
 *
 * Only the stories that HAVE art are listed; the rest keep the halftone +
 * emoji card, which is by design rather than a gap.
 */
const PRESENTATION = {
  "easy/leo": { icon: "🧑", cover: "/assets/covers/leo.jpg" },
  "easy/leo-additional": { icon: "🧑", cover: "/assets/covers/leo-additional.jpg" },
  "easy/news-roland-garros": { icon: "📰", cover: "/assets/covers/news-roland-garros.jpg" },
  "easy/news-family-visit": { icon: "📰", cover: null },
  "easy/news-grazing-board": { icon: "📰", cover: "/assets/covers/news-grazing-board.jpg" },
  "medium/maya": { icon: "👩", cover: "/assets/covers/maya.jpg" },
  "hard/daniel": { icon: "👨", cover: "/assets/covers/daniel.jpg" },
};

async function loadLocale(lang) {
  const raw = await readFile(resolve(localeDir, lang, "translation.json"), "utf8");
  return JSON.parse(raw);
}

/** `stories.easy.leo.title` out of the translation bundle, or "" if absent. */
const textAt = (bundle, difficulty, slug, field) =>
  bundle?.stories?.[difficulty]?.[slug]?.[field] ?? "";

try {
  const { database } = await ping();
  if (!/dev|staging/i.test(database)) {
    console.error(
      `Refusing to run: DATABASE_URL points at "${database}", which is neither a ` +
        `dev nor a staging database.`,
    );
    process.exitCode = 2;
  } else {
    await seed(database);
  }
} finally {
  await closeDb();
}

async function seed(database) {
  const [en, ru] = await Promise.all([loadLocale("en"), loadLocale("ru")]);

  // The extension packs are seeded by seedExtensionPacks.js as real DB stories
  // with parts; they are not built-in content and must not be marked as such.
  const rows = BUILT_IN_ROWS.filter((r) => r.extension !== true);

  console.log(`target: ${database}${dryRun ? "   (DRY RUN)" : ""}`);
  console.log(`${rows.length} built-in stories\n`);

  let created = 0;
  let updated = 0;

  for (const row of rows) {
    const [difficulty, storyId] = row.key.split("/");
    const existing = await stories.findByIdentity(difficulty, storyId);
    const presentation = PRESENTATION[row.key] ?? { icon: "📖", cover: null };

    if (existing && existing.contentSource === "db") {
      // Someone imported this story into the builder for real. Its content and
      // its text now live in the database and belong to the admin panel — but
      // its CATALOG columns still need filling in, or it joins no set and the
      // bundle prices come out wrong. So: pricing only, nothing else.
      console.log(`  catalog   ${row.key}  (imported as a DB story — pricing only)`);
      if (!dryRun) {
        await stories.setCatalogFields(difficulty, storyId, {
          character: row.character,
          paid: true,
          ready: row.ready !== false,
        });
      }
      updated += 1;
      continue;
    }

    const titleEn = textAt(en, difficulty, storyId, "title");
    const titleRu = textAt(ru, difficulty, storyId, "title");
    const descEn = textAt(en, difficulty, storyId, "description");
    const descRu = textAt(ru, difficulty, storyId, "description");
    if (!titleEn) console.warn(`  (!) no en title for ${row.key} — falling back to the slug`);

    // Text is seeded once and then belongs to the admin panel: re-running must
    // not undo an edit made there. --reset-text opts back in deliberately.
    const keepText = existing && !resetText;

    const head = {
      difficulty,
      storyId,
      storyName: keepText ? existing.storyName : titleEn || storyId,
      description: keepText ? existing.description : descEn,
      titleEn: keepText ? existing.titleEn : titleEn,
      titleRu: keepText ? existing.titleRu : titleRu,
      descriptionEn: keepText ? existing.descriptionEn : descEn,
      descriptionRu: keepText ? existing.descriptionRu : descRu,
      characterIcon: keepText ? existing.characterIcon : presentation.icon,
      totalParts: row.parts,
      category: row.category ?? "general",
      coverUrl: existing?.coverUrl ?? presentation.cover,
      // In the catalog: priced, listed, playable.
      published: true,
      // The line that protects the comics. See the header.
      contentSource: "builtin",
      character: row.character,
      paid: true,
      ready: row.ready !== false,
      // null everywhere: derive the price from the part count and the allowance
      // from the length, which is what these stories have always done. An admin
      // overrides them per story from here on.
      priceMinor: existing?.priceMinor ?? null,
      freeParts: existing?.freeParts ?? null,
      previewSeconds: existing?.previewSeconds ?? null,
      legacyMongoId: existing?.legacyMongoId ?? null,
    };

    console.log(`  ${existing ? "update    " : "create    "} ${row.key}  (${row.parts} parts)`);
    // No parts are written, deliberately — a 'builtin' row is a catalog entry.
    if (!dryRun) await stories.upsertHead(head);
    existing ? (updated += 1) : (created += 1);
  }

  console.log(`\n${created} created, ${updated} updated${dryRun ? "  (DRY RUN — nothing written)" : ""}`);
}
