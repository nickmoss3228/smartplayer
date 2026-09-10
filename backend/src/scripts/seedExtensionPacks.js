// scripts/seedExtensionPacks.js
//
// Creates the nine placeholder stories that the extension packs sell, so the
// shop, the paywall and the whole buy → webhook → entitlement → play loop can
// be exercised before a single recording exists.
//
// WHY THESE ARE Story DOCUMENTS AND NOT STATIC ENTRIES
//
// Two independent reasons, either of which would settle it:
//
//   1. modules/audiodata/storyContract.test.ts asserts that every slug in
//      storyGroupsRaw has bilingual text AND a non-empty static track list AND
//      totalTracks === tracks.length. Nine placeholders added there would need
//      nine real audioData*.ts files before the suite went green again.
//   2. Paid content MUST be DB-backed or it cannot be gated at all — static
//      stories bake their audio URLs into the JS bundle, where the server has
//      no say over who reads them. See the header of config/priceCatalog.js.
//
// The placeholder is not a throwaway: when the real audio arrives it is
// uploaded onto THIS document through the admin Story Builder. The story is
// edited, never migrated, and its storyId — which is half of the SKU — never
// changes. That is the whole reason to seed rather than to invent later.
//
// Direction is enforced, not merely intended: the target is the active
// MONGODB_URI, and the script refuses unless that database name looks like a
// dev or staging one. Production content is created through the Story Builder
// by a human, never by a script.
//
// Idempotent: matched on (difficulty, storyId) — the unique index from
// models/Story.js — and updated in place, so re-running never duplicates and
// never clobbers audio that has since been uploaded (see PRESERVED below).
//
// Usage:
//   node src/scripts/seedExtensionPacks.js --dry-run
//   node src/scripts/seedExtensionPacks.js
//   node src/scripts/seedExtensionPacks.js --unpublish   # hide them again

import mongoose from "mongoose";
import { config } from "../config/env.js";
import { Story } from "../models/Story.js";
import { PACK_STORIES } from "../config/priceCatalog.js";

const dryRun = process.argv.includes("--dry-run");
const unpublish = process.argv.includes("--unpublish");

// Same regex-not-new-URL() reasoning as seedDevFromProd.js: this is a
// multi-host seed list, and URL()'s error echoes the credentials into the log.
const targetDbName = /@[^/]+\/([^?]*)/.exec(config.mongoUri)?.[1] ?? "";
if (!/dev|staging/i.test(targetDbName)) {
  console.error(
    `Refusing to run: the active MONGODB_URI points at "${targetDbName || "(default)"}", ` +
      `which is neither a dev nor a staging database. Production stories are ` +
      `authored in the Story Builder, not seeded.`,
  );
  process.exit(2);
}

// Each placeholder's human-facing text. Keyed by the same "difficulty/slug"
// the price catalog uses, so a slug renamed there fails the assertion below
// instead of silently seeding a story no SKU can unlock.
const PLACEHOLDERS = {
  "easy/leo-new-job": {
    character: "Leo",
    icon: "🧑",
    en: { title: "Leo's First Day", description: "A new job, a new team, and far too many names to remember." },
    ru: { title: "Первый день Лео", description: "Новая работа, новая команда и слишком много имён." },
  },
  "easy/leo-doctor": {
    character: "Leo",
    icon: "🧑",
    en: { title: "Leo Sees a Doctor", description: "Describing symptoms, understanding advice, and reading a prescription." },
    ru: { title: "Лео у врача", description: "Описать симптомы, понять совет и разобрать рецепт." },
  },
  "easy/leo-moving-day": {
    character: "Leo",
    icon: "🧑",
    en: { title: "Leo Moves Out", description: "Boxes, a rental agreement, and a neighbour with opinions." },
    ru: { title: "Лео переезжает", description: "Коробки, договор аренды и сосед со своим мнением." },
  },
  "medium/maya-interview": {
    character: "Maya",
    icon: "👩",
    en: { title: "Maya's Interview", description: "Talking about experience without either shrinking or bragging." },
    ru: { title: "Собеседование Майи", description: "Рассказать об опыте, не принижая себя и не хвастаясь." },
  },
  "medium/maya-roommates": {
    character: "Maya",
    icon: "👩",
    en: { title: "Maya and the Roommates", description: "Splitting bills, sharing a kitchen, and one difficult conversation." },
    ru: { title: "Майя и соседи", description: "Счета пополам, общая кухня и один трудный разговор." },
  },
  "medium/maya-lost-luggage": {
    character: "Maya",
    icon: "👩",
    en: { title: "Maya's Lost Luggage", description: "Making a complaint politely, and then rather less politely." },
    ru: { title: "Майя потеряла багаж", description: "Жалоба вежливая — и потом не очень вежливая." },
  },
  "hard/daniel-negotiation": {
    character: "Daniel",
    icon: "👨",
    en: { title: "Daniel Negotiates", description: "Hedging, conceding, and the language of holding a position." },
    ru: { title: "Переговоры Дэниела", description: "Смягчение, уступки и язык удержания позиции." },
  },
  "hard/daniel-startup-pitch": {
    character: "Daniel",
    icon: "👨",
    en: { title: "Daniel's Pitch", description: "Making a case under time pressure, and surviving the questions after." },
    ru: { title: "Питч Дэниела", description: "Аргументы в цейтноте и вопросы, которые последуют." },
  },
  "hard/daniel-courtroom": {
    character: "Daniel",
    icon: "👨",
    en: { title: "Daniel in Court", description: "Formal register, precise claims, and listening for what was not said." },
    ru: { title: "Дэниел в суде", description: "Формальный регистр, точные формулировки и то, что не было сказано." },
  },
};

/**
 * Five parts, not three and not ten.
 *
 * Ten would claim more recordings than anyone intends to make soon. Three
 * would leave a 249 ₽ story with only two parts behind the preview, which
 * makes the price look absurd the moment someone reads the card. Five gives a
 * real preview-then-paywall shape to test against and is a plausible length
 * for the finished story.
 */
const PARTS_PER_STORY = 5;

const expectedKeys = Object.values(PACK_STORIES).flat();
const missing = expectedKeys.filter((k) => !PLACEHOLDERS[k]);
if (missing.length) {
  console.error(
    `The price catalog sells stories this script has no text for:\n  ${missing.join("\n  ")}\n` +
      `Add them to PLACEHOLDERS, or the packs would grant access to nothing.`,
  );
  process.exit(2);
}

const conn = await mongoose
  .createConnection(config.mongoUri, { serverSelectionTimeoutMS: 15000 })
  .asPromise();
const StoryModel = conn.model("Story", Story.schema);

console.log(`target: ${conn.name}${dryRun ? "   (DRY RUN)" : ""}`);
console.log(`${expectedKeys.length} placeholder stories, ${PARTS_PER_STORY} parts each\n`);

let created = 0;
let updated = 0;

for (const key of expectedKeys) {
  const [difficulty, storyId] = key.split("/");
  const meta = PLACEHOLDERS[key];
  const existing = await StoryModel.findOne({ difficulty, storyId });

  if (unpublish) {
    if (!existing) continue;
    console.log(`  unpublish  ${key}`);
    if (!dryRun) await StoryModel.updateOne({ _id: existing._id }, { $set: { published: false } });
    updated += 1;
    continue;
  }

  // PRESERVED: parts are only written when the story is new or still empty of
  // audio. Once a real recording has been uploaded through the Story Builder,
  // re-running this script must not throw it away — the placeholder's job is
  // finished at that point.
  const hasRealAudio = existing?.parts?.some((p) => p.audioUrl);
  const parts = Array.from({ length: PARTS_PER_STORY }, (_, i) => ({
    partNumber: i + 1,
    title: `Part ${i + 1}`,
    // Null, not "". models/Story.js defaults it to null, and
    // adaptPublishedStoryToTracks already emits audio: "" for such a part and
    // reports it as unavailable rather than 404ing — the same state
    // news-family-visit has been in on production for months.
    audioUrl: null,
    helpAudio: [],
    comicUrl: null,
    timeMarkers: [],
    vocabulary: [],
    phrasalVerbs: [],
    quiz: [],
  }));

  const doc = {
    difficulty,
    storyId,
    storyName: meta.en.title,
    description: meta.en.description,
    localized: {
      title: { en: meta.en.title, ru: meta.ru.title },
      description: { en: meta.en.description, ru: meta.ru.description },
    },
    characterIcon: meta.icon,
    totalParts: PARTS_PER_STORY,
    category: "general",
    coverUrl: null, // no art yet — List.tsx falls back to the halftone + icon
    published: true,
    ...(hasRealAudio ? {} : { parts }),
  };

  if (hasRealAudio) {
    console.log(`  keep audio ${key}  (metadata only)`);
  } else {
    console.log(`  ${existing ? "update    " : "create    "} ${key}`);
  }

  if (!dryRun) {
    await StoryModel.updateOne({ difficulty, storyId }, { $set: doc }, { upsert: true });
  }
  existing ? (updated += 1) : (created += 1);
}

console.log(`\n${created} created, ${updated} updated${dryRun ? "  (DRY RUN — nothing written)" : ""}`);
await conn.close();
