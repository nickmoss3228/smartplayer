// controllers/story.controller.js
// Admin Story Builder (create/edit/publish DB-backed stories) plus the one
// public endpoint the player fetches a published story from. See
// helpers/storyLookup.js for how DB stories are merged with the legacy
// static-file stories at read time.
//
// Every edit goes through stories.mutateStory: load, change, write, in one
// transaction holding the story row. That is the Postgres equivalent of the
// find/mutate/save() these handlers were written around, with the lock added so
// two Builder tabs saving different parts cannot overwrite each other.
import { stories as storiesRepo } from "../db/index.js";
import { restoreMarkersIntoParts } from "../helpers/markerRestore.js";
import { uploadBuffer } from "../helpers/uploadToStorage.js";
import { storyRegistry } from "../config/storyRegistry.js";
import { getQuizPartsForImport, resolveQuizAudioPath } from "../config/quizData.js";
import {
  accessFor,
  isPartVisible,
  isPreviewPart,
  storyKey,
} from "../config/entitlements.js";
import { getCatalog, invalidateCatalog } from "../helpers/catalogStore.js";
import { config } from "../config/env.js";
import { signAudioUrl } from "../helpers/signedAudio.js";

const MAX_PARTS = 20;
const MAX_QUIZ_QUESTIONS = 10;

// Keeps only the two locales the app ships and coerces to strings, so a
// malformed payload cannot write arbitrary keys into the story.
function sanitizeLocalized(localized) {
  const pick = (obj) => ({
    en: typeof obj?.en === "string" ? obj.en.trim() : "",
    ru: typeof obj?.ru === "string" ? obj.ru.trim() : "",
  });
  return { title: pick(localized?.title), description: pick(localized?.description) };
}

function buildEmptyParts(totalParts) {
  return Array.from({ length: totalParts }, (_, i) => ({ partNumber: i + 1 }));
}

/** Answer a mutateStory result: 404 for no story, the halt's own response, or `onSaved`. */
function sendMutation(res, result, onSaved) {
  if (!result) return res.status(404).json({ error: "Story not found." });
  if ("halt" in result) return res.status(result.halt.status).json(result.halt.body);
  return onSaved(result.story);
}

/** mutateStory scoped to one part, refusing with 404 when the part is missing. */
function mutatePart(req, apply) {
  const partNumber = Number(req.params.partNumber);
  return storiesRepo.mutateStory(req.params.id, (story) => {
    const part = story.parts.find((p) => p.partNumber === partNumber);
    if (!part) return { halt: { status: 404, body: { error: "Part not found." } } };
    return apply(part, story);
  });
}

const savedPart = (story, req) =>
  story.parts.find((p) => p.partNumber === Number(req.params.partNumber));

// ─── Admin: create/list/fetch/delete ───────────────────────────────────────

// POST /api/admin/stories
export async function createStory(req, res) {
  try {
    invalidateCatalog();
    const { difficulty, storyId, storyName, description, characterIcon, totalParts } = req.body;

    if (!["easy", "medium", "hard"].includes(difficulty)) {
      return res.status(400).json({ error: "Invalid difficulty." });
    }
    if (typeof storyId !== "string" || typeof storyName !== "string" || !storyId.trim() || !storyName.trim()) {
      return res.status(400).json({ error: "storyId and storyName are required." });
    }
    const parts = Number(totalParts);
    if (!Number.isInteger(parts) || parts < 1 || parts > MAX_PARTS) {
      return res.status(400).json({ error: `totalParts must be between 1 and ${MAX_PARTS}.` });
    }

    const existing = await storiesRepo.findByIdentity(difficulty, storyId.trim());
    if (existing) {
      return res.status(409).json({ error: "A story with that id already exists for this difficulty." });
    }

    const staticMeta = (storyRegistry[difficulty] ?? []).find((s) => s.storyId === storyId.trim());
    if (staticMeta) {
      return res.status(409).json({
        error: "This id belongs to a built-in story — use Import instead of creating a new one.",
      });
    }

    // Same rescue as importStory: recreating a story under an id that once had
    // markers gets them back rather than starting from a blank waveform.
    const remembered = await storiesRepo.recallMarkers(difficulty, storyId.trim());
    const story = await storiesRepo.createStoryWithParts({
      difficulty,
      storyId: storyId.trim(),
      storyName: storyName.trim(),
      description: description?.trim() ?? "",
      characterIcon: characterIcon?.trim() || "📖",
      totalParts: parts,
      parts: buildEmptyParts(parts).map((part) => ({
        ...part,
        timeMarkers: remembered[part.partNumber] ?? [],
      })),
    });

    res.status(201).json({ story });
  } catch (error) {
    console.error("createStory error:", error);
    res.status(500).json({ error: "Failed to create story." });
  }
}

// GET /api/admin/stories/quiz-source/:difficulty/:storyId
// Admin-only — returns the raw static quizData.js slice for a built-in story,
// INCLUDING correctAnswer (unlike the public quiz endpoints). Used solely by
// the frontend's "Import built-in stories" flow to assemble a full import
// payload, since the frontend never otherwise sees the answer key.
export async function getStaticQuizSource(req, res) {
  const { difficulty, storyId } = req.params;
  // getQuizPartsForImport, not a raw quizData slice: audio paths are stored
  // bucket-relative and only become URLs for THIS environment when resolved.
  res.json({ parts: getQuizPartsForImport(difficulty, storyId) });
}

// POST /api/admin/stories/import
// Imports a built-in story's full content (assembled by the frontend from
// audioDataByDifficulty.ts/Vocabulary.ts/quizData.js — see storyBuilder plan)
// into a new story. Always created as a draft (published: false) so it can't
// affect players until the admin reviews it and explicitly publishes — unlike
// createStory, matching a static storyId is expected here, not rejected.
export async function importStory(req, res) {
  try {
    invalidateCatalog();
    const { difficulty, storyId, storyName, description, characterIcon, category, coverUrl, localized, totalParts, parts } = req.body;

    if (!["easy", "medium", "hard"].includes(difficulty)) {
      return res.status(400).json({ error: "Invalid difficulty." });
    }
    if (typeof storyId !== "string" || typeof storyName !== "string" || !storyId.trim() || !storyName.trim()) {
      return res.status(400).json({ error: "storyId and storyName are required." });
    }
    const partsCount = Number(totalParts);
    if (!Number.isInteger(partsCount) || partsCount < 1 || partsCount > MAX_PARTS) {
      return res.status(400).json({ error: `totalParts must be between 1 and ${MAX_PARTS}.` });
    }
    if (!Array.isArray(parts) || parts.length !== partsCount) {
      return res.status(400).json({ error: "parts must be an array matching totalParts." });
    }

    const existing = await storiesRepo.findByIdentity(difficulty, storyId.trim());
    if (existing) {
      return res.status(409).json({ error: "This story has already been imported." });
    }

    for (const part of parts) {
      if (!Number.isInteger(part.partNumber)) {
        return res.status(400).json({ error: "Every part needs a partNumber." });
      }
      const markerError = validateMarkerList(part.timeMarkers ?? []);
      if (markerError) return res.status(400).json({ error: `Part ${part.partNumber} markers: ${markerError}.` });
      const vocabError = validateVocabList(part.vocabulary ?? []);
      if (vocabError) return res.status(400).json({ error: `Part ${part.partNumber} vocabulary: ${vocabError}.` });
      const phrasalError = validateVocabList(part.phrasalVerbs ?? []);
      if (phrasalError) return res.status(400).json({ error: `Part ${part.partNumber} phrasal verbs: ${phrasalError}.` });
      const quizError = validateQuizList(part.quiz ?? []);
      if (quizError) return res.status(400).json({ error: `Part ${part.partNumber} quiz: ${quizError}.` });
    }

    // Restore markers this story had before it was last deleted.
    //
    // Only ever FILLS A GAP: a part that arrives with markers keeps them, so
    // the static repo files (src/modules/audiodata/markers/*.json) still win
    // when they have an opinion, and nothing the caller sent is overwritten.
    // A part that arrives empty means "no opinion", which is exactly the case
    // where the remembered copy is the best answer available — and it is the
    // case that used to silently discard hours of work.
    const remembered = await storiesRepo.recallMarkers(difficulty, storyId.trim());
    const { parts: partsWithMarkers, restoredCount: restoredParts } = restoreMarkersIntoParts(
      parts,
      remembered,
    );

    const story = await storiesRepo.createStoryWithParts({
      difficulty,
      storyId: storyId.trim(),
      storyName: storyName.trim(),
      description: description?.trim() ?? "",
      characterIcon: characterIcon?.trim() || "📖",
      // Carried from the static entry so an imported story keeps its shelf and
      // its card art. Without these the DB copy replaces the built-in one and
      // both are silently lost the moment it is published.
      category: category === "news" || category === "general" ? category : null,
      coverUrl: typeof coverUrl === "string" && coverUrl.trim() ? coverUrl.trim() : null,
      localized: sanitizeLocalized(localized),
      totalParts: partsCount,
      published: false,
      parts: partsWithMarkers,
    });

    res.status(201).json({ story, markersRestoredForParts: restoredParts });
  } catch (error) {
    console.error("importStory error:", error);
    res.status(500).json({ error: "Failed to import story." });
  }
}

// GET /api/admin/stories?difficulty=
export async function listStories(req, res) {
  try {
    const { difficulty } = req.query;
    const stories = await storiesRepo.listStoryJson({
      difficulty: typeof difficulty === "string" && difficulty ? difficulty : undefined,
    });
    res.json({ stories });
  } catch (error) {
    console.error("listStories error:", error);
    res.status(500).json({ error: "Failed to load stories." });
  }
}

// GET /api/admin/stories/:id
export async function getStory(req, res) {
  try {
    const story = await storiesRepo.loadStoryJson(req.params.id);
    if (!story) return res.status(404).json({ error: "Story not found." });
    res.json({ story });
  } catch (error) {
    console.error("getStory error:", error);
    res.status(500).json({ error: "Failed to load story." });
  }
}

// PATCH /api/admin/stories/:id  { storyName?, description?, characterIcon? }
// Deliberately doesn't allow changing difficulty/storyId/totalParts here —
// those are identity/structural fields tied to lookups (storyLookup.js),
// public URLs, and the static-registry collision check; changing them after
// creation would orphan progress/quiz data keyed by the old values.
export async function updateStoryMeta(req, res) {
  try {
    invalidateCatalog();
    const {
      storyName,
      description,
      characterIcon,
      category,
      localized,
      // Catalog. These decide what a customer is charged, so each is validated
      // here rather than trusted — the story table is the paywall's only input.
      character,
      paid,
      ready,
      priceMinor,
      freeParts,
      previewSeconds,
    } = req.body;

    if (storyName !== undefined && !storyName.trim()) {
      return res.status(400).json({ error: "storyName can't be empty." });
    }
    if (category !== undefined && !["general", "news", null].includes(category)) {
      return res.status(400).json({ error: "category must be general, news, or null." });
    }
    for (const [name, value] of [
      ["paid", paid],
      ["ready", ready],
    ]) {
      if (value !== undefined && typeof value !== "boolean") {
        return res.status(400).json({ error: `${name} must be true or false.` });
      }
    }
    // null is meaningful on all three — "derive it" — so it is allowed through
    // and only non-null values are range-checked.
    for (const [name, value, min] of [
      ["priceMinor", priceMinor, 0],
      ["freeParts", freeParts, 0],
      ["previewSeconds", previewSeconds, 1],
    ]) {
      if (value === undefined || value === null) continue;
      if (!Number.isInteger(value) || value < min) {
        return res.status(400).json({ error: `${name} must be a whole number of at least ${min}.` });
      }
    }

    const result = await storiesRepo.mutateStory(req.params.id, (story) => {
      if (freeParts !== undefined && freeParts !== null && freeParts > story.totalParts) {
        return {
          halt: {
            status: 400,
            body: { error: `freeParts cannot exceed the story's ${story.totalParts} parts.` },
          },
        };
      }
      if (storyName !== undefined) story.storyName = storyName.trim();
      if (description !== undefined) story.description = description.trim();
      if (characterIcon !== undefined) story.characterIcon = characterIcon.trim() || "📖";
      if (category !== undefined) story.category = category;
      if (localized !== undefined) story.localized = sanitizeLocalized(localized);
      if (character !== undefined) story.character = String(character ?? "").trim();
      if (paid !== undefined) story.paid = paid;
      if (ready !== undefined) story.ready = ready;
      if (priceMinor !== undefined) story.priceMinor = priceMinor;
      if (freeParts !== undefined) story.freeParts = freeParts;
      if (previewSeconds !== undefined) story.previewSeconds = previewSeconds;
    });

    sendMutation(res, result, (story) => res.json({ story }));
  } catch (error) {
    console.error("updateStoryMeta error:", error);
    res.status(500).json({ error: "Failed to update story." });
  }
}

// POST /api/admin/stories/:id/parts — appends one empty part (e.g. a "part
// 3" alongside an existing "part 1"/"part 2") and bumps totalParts to match.
export async function addPart(req, res) {
  try {
    invalidateCatalog();
    const result = await storiesRepo.mutateStory(req.params.id, (story) => {
      if (story.parts.length >= MAX_PARTS) {
        return { halt: { status: 400, body: { error: `A story can have at most ${MAX_PARTS} parts.` } } };
      }
      const nextPartNumber = story.parts.reduce((max, p) => Math.max(max, p.partNumber), 0) + 1;
      story.parts.push({ partNumber: nextPartNumber });
      story.totalParts = story.parts.length;
    });

    sendMutation(res, result, (story) => res.status(201).json({ story }));
  } catch (error) {
    console.error("addPart error:", error);
    res.status(500).json({ error: "Failed to add part." });
  }
}

// DELETE /api/admin/stories/:id
export async function deleteStory(req, res) {
  try {
    invalidateCatalog();
    // Snapshot the markers before the story goes. saveMarkers already mirrors
    // them as they're placed, so this is a backstop — it rescues markers saved
    // before the durable copy existed, and covers any path that wrote markers
    // without going through saveMarkers.
    const story = await storiesRepo.loadStoryJson(req.params.id);
    if (story) {
      for (const part of story.parts ?? []) {
        if (part.timeMarkers?.length) {
          await storiesRepo.rememberMarkers(story.difficulty, story.storyId, part.partNumber, part.timeMarkers);
        }
      }
      await storiesRepo.remove(story._id);
    }
    res.json({ success: true });
  } catch (error) {
    console.error("deleteStory error:", error);
    res.status(500).json({ error: "Failed to delete story." });
  }
}

// ─── Admin: per-part asset upload ──────────────────────────────────────────

// Comic pages are the only non-audio asset the builder uploads, so the key
// needs a real extension rather than the hardcoded .mp3 the others use. The
// object's Content-Type is set from the upload either way; the extension keeps
// the bucket browsable and the key deterministic per format.
const COMIC_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

// Every non-comic kind is audio. Browsers are not consistent about which of
// these they attach to a .mp3, so the allowlist is wide on the way in — but
// whatever arrives, the object is stored as a single normalised type below.
const AUDIO_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/mpeg3",
  "audio/x-mpeg-3",
]);

// Mirrors ENGLISH_KEY_PATTERN in components/Admin/StoryBuilder/
// PartVocabWordsEditor.tsx. The client already refuses anything else; this is
// the half of that check an attacker cannot skip. Note what it excludes: no
// dots and no slashes, so the value cannot walk out of the story's folder.
const AUDIO_KEY_PATTERN = /^[a-zA-Z0-9 _-]+$/;

const UPLOAD_KINDS = new Set([
  "audio",
  "comic",
  "vocab",
  "phrasal",
  "quizFast",
  "quizSlow",
]);

function assetKeyFor(story, partNumber, kind, extra) {
  const base = `stories/${story.difficulty}/${story.storyId}/${partNumber}`;
  switch (kind) {
    case "audio":
      return `${base}/audio.mp3`;
    case "comic":
      return `${base}/comic.${extra.ext}`;
    case "vocab":
      return `${base}/vocab/${extra.audioKey}.mp3`;
    case "phrasal":
      return `${base}/phrasal/${extra.audioKey}.mp3`;
    case "quizFast":
      return `${base}/quiz/q${extra.index}-fast.mp3`;
    case "quizSlow":
      return `${base}/quiz/q${extra.index}-slow.mp3`;
    default:
      return null;
  }
}

// POST /api/admin/stories/:id/parts/:partNumber/upload?kind=audio|vocab|phrasal|quizFast|quizSlow[&audioKey=][&index=]
export async function uploadPartAsset(req, res) {
  try {
    const story = await storiesRepo.loadStoryJson(req.params.id);
    if (!story) return res.status(404).json({ error: "Story not found." });

    const partNumber = Number(req.params.partNumber);
    const part = story.parts.find((p) => p.partNumber === partNumber);
    if (!part) return res.status(404).json({ error: "Part not found." });

    if (!req.file) return res.status(400).json({ error: "No file uploaded." });

    const { kind, audioKey, index } = req.query;
    if (!UPLOAD_KINDS.has(kind)) {
      return res.status(400).json({ error: "Invalid kind." });
    }
    if (["vocab", "phrasal"].includes(kind) && !audioKey?.trim()) {
      return res.status(400).json({ error: "audioKey is required for vocab/phrasal uploads." });
    }
    // audioKey is interpolated straight into the object key by assetKeyFor, so
    // it has to be constrained before it gets there — otherwise "../../" walks
    // out of this story's folder and overwrites another story's asset.
    if (["vocab", "phrasal"].includes(kind) && !AUDIO_KEY_PATTERN.test(audioKey.trim())) {
      return res.status(400).json({
        error:
          "audioKey may contain only letters, numbers, spaces, hyphens and underscores.",
      });
    }
    if (["quizFast", "quizSlow"].includes(kind) && (index === undefined || Number.isNaN(Number(index)))) {
      return res.status(400).json({ error: "index is required for quiz audio uploads." });
    }

    // Content-Type is the only thing deciding how a browser treats one of these
    // objects, and every one of them is written ACL public-read on the same
    // origin the player loads media from. Echoing req.file.mimetype meant an
    // upload keyed as .mp3 could be *stored* as text/html and then served as a
    // rendered page — stored XSS on the media domain. Only the comic branch
    // ever validated. So: the type is picked from an allowlist here, never
    // taken from the request.
    let ext;
    let contentType;
    if (kind === "comic") {
      ext = COMIC_EXTENSIONS[req.file.mimetype];
      if (!ext) {
        return res.status(400).json({
          error: `A comic page must be a JPEG, PNG, WebP, AVIF or GIF image — got ${req.file.mimetype}.`,
        });
      }
      // Safe to reuse: it matched a COMIC_EXTENSIONS key, so it is one of five
      // known image types rather than arbitrary client input.
      contentType = req.file.mimetype;
    } else {
      if (!AUDIO_MIME_TYPES.has(req.file.mimetype)) {
        return res.status(400).json({
          error: `This upload must be an MP3 — got ${req.file.mimetype}.`,
        });
      }
      // Normalised, not echoed: assetKeyFor hardcodes a .mp3 key for every
      // non-comic kind, so the stored type has to agree with the key.
      contentType = "audio/mpeg";
    }

    const key = assetKeyFor(story, partNumber, kind, { audioKey: audioKey?.trim(), index, ext });
    if (!key) return res.status(400).json({ error: "Invalid kind." });

    const url = await uploadBuffer(key, req.file.buffer, contentType);
    res.json({ url });
  } catch (error) {
    // error.message is deliberately not forwarded: these are AWS SDK errors and
    // they name the bucket, the endpoint and the internal object key.
    console.error("uploadPartAsset error:", error);
    res.status(500).json({ error: "Upload failed." });
  }
}

// POST /api/admin/stories/:id/cover   (multipart, field "file")
// The card art in the story list. Story-level rather than per-part, so it does
// not go through assetKeyFor — the key has no part number in it.
export async function uploadStoryCover(req, res) {
  try {
    const story = await storiesRepo.loadStoryJson(req.params.id);
    if (!story) return res.status(404).json({ error: "Story not found." });
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });

    const ext = COMIC_EXTENSIONS[req.file.mimetype];
    if (!ext) {
      return res.status(400).json({
        error: `A cover must be a JPEG, PNG, WebP, AVIF or GIF image — got ${req.file.mimetype}.`,
      });
    }

    const key = `stories/${story.difficulty}/${story.storyId}/cover.${ext}`;
    const coverUrl = await uploadBuffer(key, req.file.buffer, req.file.mimetype);

    const result = await storiesRepo.mutateStory(story._id, (s) => {
      s.coverUrl = coverUrl;
    });
    sendMutation(res, result, (saved) => res.json({ story: saved }));
  } catch (error) {
    // Same reasoning as uploadPartAsset: SDK errors name internals.
    console.error("uploadStoryCover error:", error);
    res.status(500).json({ error: "Cover upload failed." });
  }
}

// DELETE /api/admin/stories/:id/cover
// Clears the field only; the object is left in the bucket. Nothing else can
// reach that key, and a re-upload overwrites it, so deleting buys nothing and
// risks removing art a rolled-back story still points at.
export async function clearStoryCover(req, res) {
  try {
    const result = await storiesRepo.mutateStory(req.params.id, (story) => {
      story.coverUrl = null;
    });
    sendMutation(res, result, (story) => res.json({ story }));
  } catch (error) {
    console.error("clearStoryCover error:", error);
    res.status(500).json({ error: "Failed to clear cover." });
  }
}

// ─── Admin: per-part content ────────────────────────────────────────────────

function validateMarkerList(list) {
  if (!Array.isArray(list)) return "must be an array";
  if (list.some((m) => typeof m?.time !== "number" || !Number.isFinite(m.time))) {
    return "every marker needs a numeric time";
  }
  return null;
}

// PATCH /api/admin/stories/:id/parts/:partNumber/markers  { timeMarkers, audioUrl? }
export async function saveMarkers(req, res) {
  try {
    const { timeMarkers, audioUrl } = req.body;
    if (validateMarkerList(timeMarkers)) {
      return res.status(400).json({ error: "timeMarkers must be an array of { time, label, color }." });
    }
    const sorted = [...timeMarkers].sort((a, b) => a.time - b.time);

    const result = await mutatePart(req, (part) => {
      part.timeMarkers = sorted;
      if (audioUrl) part.audioUrl = audioUrl;
    });

    await sendMutation(res, result, async (story) => {
      // Mirror into the durable copy, so deleting this story to re-import it
      // doesn't throw the markers away. Keyed by story identity, not by row id
      // — see the part_markers table.
      await storiesRepo.rememberMarkers(story.difficulty, story.storyId, Number(req.params.partNumber), sorted);
      res.json({ part: savedPart(story, req) });
    });
  } catch (error) {
    console.error("saveMarkers error:", error);
    res.status(500).json({ error: "Failed to save markers." });
  }
}

function validateVocabList(list) {
  if (!Array.isArray(list)) return "must be an array";
  const keys = list.map((w) => w.audioKey?.toLowerCase());
  if (keys.some((k) => !k)) return "every entry needs an audioKey";
  if (new Set(keys).size !== keys.length) return "audioKey must be unique within the part";
  if (list.some((w) => !w.word?.trim())) return "every entry needs a word (Russian text)";
  return null;
}

// PUT /api/admin/stories/:id/parts/:partNumber/vocabulary  { vocabulary }
export async function saveVocabulary(req, res) {
  try {
    const error = validateVocabList(req.body.vocabulary);
    if (error) return res.status(400).json({ error: `Invalid vocabulary: ${error}.` });

    const result = await mutatePart(req, (part) => {
      part.vocabulary = req.body.vocabulary;
    });
    sendMutation(res, result, (story) => res.json({ part: savedPart(story, req) }));
  } catch (error) {
    console.error("saveVocabulary error:", error);
    res.status(500).json({ error: "Failed to save vocabulary." });
  }
}

// PUT /api/admin/stories/:id/parts/:partNumber/phrasal-verbs  { phrasalVerbs }
export async function savePhrasalVerbs(req, res) {
  try {
    const error = validateVocabList(req.body.phrasalVerbs);
    if (error) return res.status(400).json({ error: `Invalid phrasal verbs: ${error}.` });

    const result = await mutatePart(req, (part) => {
      part.phrasalVerbs = req.body.phrasalVerbs;
    });
    sendMutation(res, result, (story) => res.json({ part: savedPart(story, req) }));
  } catch (error) {
    console.error("savePhrasalVerbs error:", error);
    res.status(500).json({ error: "Failed to save phrasal verbs." });
  }
}

// PUT /api/admin/stories/:id/parts/:partNumber/comic
// Persists the URL returned by an upload?kind=comic. Sending null clears the
// page, which is how the admin removes a comic they uploaded by mistake.
export async function saveComic(req, res) {
  try {
    const { comicUrl } = req.body;
    if (comicUrl !== null && typeof comicUrl !== "string") {
      return res.status(400).json({ error: "comicUrl must be a string, or null to clear it." });
    }

    const result = await mutatePart(req, (part) => {
      part.comicUrl = comicUrl || null;
    });
    sendMutation(res, result, (story) => res.json({ part: savedPart(story, req) }));
  } catch (error) {
    console.error("saveComic error:", error);
    res.status(500).json({ error: "Failed to save the comic page." });
  }
}

function validateQuizList(quiz) {
  if (!Array.isArray(quiz)) return "must be an array";
  if (quiz.length > MAX_QUIZ_QUESTIONS) return `at most ${MAX_QUIZ_QUESTIONS} questions`;
  for (const q of quiz) {
    if (!q.question?.trim()) return "every question needs text";
    if (!Array.isArray(q.options) || q.options.length !== 4) return "every question needs exactly 4 options";
    if (!Number.isInteger(q.correctAnswer) || q.correctAnswer < 0 || q.correctAnswer > 3) {
      return "correctAnswer must be an index 0-3";
    }
  }
  return null;
}

// PUT /api/admin/stories/:id/parts/:partNumber/quiz  { quiz }
export async function saveQuiz(req, res) {
  try {
    const error = validateQuizList(req.body.quiz);
    if (error) return res.status(400).json({ error: `Invalid quiz: ${error}.` });

    const result = await mutatePart(req, (part) => {
      part.quiz = req.body.quiz;
    });
    sendMutation(res, result, (story) => res.json({ part: savedPart(story, req) }));
  } catch (error) {
    console.error("saveQuiz error:", error);
    res.status(500).json({ error: "Failed to save quiz." });
  }
}

// PATCH /api/admin/stories/:id/publish  { published }
export async function setStoryPublished(req, res) {
  try {
    invalidateCatalog();
    const { published } = req.body;
    if (typeof published !== "boolean") {
      return res.status(400).json({ error: "published must be a boolean." });
    }

    const result = await storiesRepo.mutateStory(req.params.id, (story) => {
      if (published) {
        // Two markers, not one. A single marker cannot describe a segment:
        // useSegmentEngine looks for the NEXT marker to find the segment end,
        // finds none, and stops playback at the first boundary, so the track
        // reports itself complete seconds in. Name the offending parts so the
        // error says what to fix rather than just refusing.
        const noAudio = story.parts.filter((p) => !p.audioUrl).map((p) => p.partNumber);
        const thinMarkers = story.parts
          .filter((p) => p.audioUrl && (p.timeMarkers?.length ?? 0) < 2)
          .map((p) => p.partNumber);
        if (noAudio.length || thinMarkers.length) {
          const problems = [];
          if (noAudio.length) problems.push("no audio on part " + noAudio.join(", "));
          if (thinMarkers.length) {
            problems.push(
              "fewer than 2 time markers on part " + thinMarkers.join(", ") +
                " (a single marker makes the track end at that marker)"
            );
          }
          return {
            halt: { status: 400, body: { error: "Cannot publish yet: " + problems.join("; ") + "." } },
          };
        }
      }

      story.published = published;
    });

    sendMutation(res, result, (story) => res.json({ story }));
  } catch (error) {
    console.error("setStoryPublished error:", error);
    res.status(500).json({ error: "Failed to update story." });
  }
}

// ─── Public: fetch a published story for playback ──────────────────────────

/**
 * A part the caller has not paid for. Emptied, NOT dropped.
 *
 * Numbering is load-bearing: adaptPublishedStoryToTracks (services/storyServices.ts)
 * says so in its own comment — filtering a part out renumbers every part after
 * it, so requesting part 5 silently plays a different one while the vocabulary
 * panel still shows part 5. A locked part therefore keeps its number and its
 * title (the level grid needs both to draw a padlocked card) and loses
 * everything that costs money to produce.
 */
const lockPart = (part) => ({
  partNumber: part.partNumber,
  title: part.title ?? "",
  locked: true,
  audioUrl: null,
  helpAudio: [],
  timeMarkers: [],
  comicUrl: null,
  vocabulary: [],
  phrasalVerbs: [],
  quiz: [],
});

const openPart = (part) => ({
  partNumber: part.partNumber,
  title: part.title ?? "",
  locked: false,
  audioUrl: part.audioUrl,
  helpAudio: part.helpAudio ?? [],
  timeMarkers: part.timeMarkers,
  comicUrl: part.comicUrl ?? null,
  vocabulary: part.vocabulary,
  phrasalVerbs: part.phrasalVerbs,
  // Never send correctAnswer to the client — same rule as getPublicQuiz in quizData.js.
  // Stored bucket-relative; resolved for THIS environment on the way out.
  quiz: part.quiz.map(({ correctAnswer, ...rest }) => ({
    ...rest,
    audio: {
      fast: resolveQuizAudioPath(rest.audio?.fast),
      slow: resolveQuizAudioPath(rest.audio?.slow),
    },
  })),
});

// GET /api/stories/:difficulty/:storyId
//
// Mounted behind optionalAuth, not authenticateToken: this URL serves guests
// and members alike, and WHO is asking decides how much comes back. This is
// the only endpoint that ever hands out a paid audioUrl, which is what makes
// the paywall enforceable at all — see config/entitlements.js.
export async function getPublishedStory(req, res) {
  try {
    const { difficulty, storyId } = req.params;
    const aggregate = await storiesRepo.loadPublishedAggregate(difficulty, storyId);
    if (!aggregate) return res.status(404).json({ message: "Story not found." });
    const story = storiesRepo.toStoryJson(aggregate, aggregate.parts);

    const catalog = await getCatalog();
    const access = accessFor(req.user?.entitlements, difficulty, storyId, {
      authenticated: Boolean(req.user),
      catalog,
      // Read per request, never captured in a module const: config is mutable
      // and the API tests flip this between describes.
      paywallEnabled: config.payments.paywallEnabled,
    });

    const parts = await Promise.all(
      story.parts.map(async (part) => {
        if (!isPartVisible(access, part.partNumber)) return lockPart(part);
        // A preview is a listen, not a lesson: the quiz stays closed.
        const open = isPreviewPart(access, part.partNumber)
          ? { ...openPart(part), preview: true, quiz: [] }
          : openPart(part);
        // Only audio this caller is allowed to hear is ever signed — a locked
        // part left above with no URL at all. See helpers/signedAudio.js.
        return {
          ...open,
          audioUrl: open.audioUrl ? await signAudioUrl(open.audioUrl) : open.audioUrl,
          helpAudio: await Promise.all((open.helpAudio ?? []).map((url) => signAudioUrl(url))),
        };
      }),
    );

    res.json({
      storyId: story.storyId,
      storyName: story.storyName,
      description: story.description,
      characterIcon: story.characterIcon,
      category: story.category ?? null,
      coverUrl: story.coverUrl ?? null,
      localized: story.localized ?? null,
      totalParts: story.totalParts,
      // The client locks its grid from these rather than recomputing the rule.
      owned: access.owned,
      locked: !access.owned,
      // Infinity does not survive JSON.stringify (it becomes null), so send a
      // number the client can compare against.
      freeParts: access.owned ? story.totalParts : access.freeParts,
      // Part 1 of a short story plays for this long, then the player stops it.
      previewSeconds: access.owned ? null : access.previewSeconds,
      requiredSkus: access.owned ? [] : catalog.skusGranting(storyKey(difficulty, storyId)),
      parts,
    });
  } catch (error) {
    console.error("getPublishedStory error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /api/stories/:difficulty — lightweight roster of published DB stories
// for a difficulty, so the level-list UI knows they exist (merged with the
// static storyGroups.ts list on the frontend).
export async function listPublishedStories(req, res) {
  try {
    const { difficulty } = req.params;
    const [rows, hidden] = await Promise.all([
      storiesRepo.listStoryJson({ difficulty, publishedOnly: true }),
      storiesRepo.hiddenStoryIds(difficulty),
    ]);

    // The list is the ONE place that knows about stories the caller does not
    // own, so it carries the lock rather than letting the client infer it.
    // No part data is exposed here (and never was), so this is presentation
    // only — the real gate is getPublishedStory above.
    const authenticated = Boolean(req.user);
    const catalog = await getCatalog();
    const stories = rows.map((story) => {
      const key = storyKey(difficulty, story.storyId);
      const access = accessFor(req.user?.entitlements, difficulty, story.storyId, {
        authenticated,
        catalog,
        paywallEnabled: config.payments.paywallEnabled,
      });
      return {
        // Exactly the fields this roster has always carried.
        _id: story._id,
        storyId: story.storyId,
        storyName: story.storyName,
        description: story.description,
        characterIcon: story.characterIcon,
        category: story.category,
        coverUrl: story.coverUrl,
        localized: story.localized,
        totalParts: story.totalParts,
        // The access decision, not a second opinion about it. This used to be
        // `isPaidStory(key) && !access.owned`, which disagreed with accessFor
        // for exactly the stories the Story Builder creates: they were in no
        // catalog, so isPaidStory was false, so `locked` was false, so the
        // card rendered as OWNED on a logged-out shelf — while accessFor gave
        // it zero free parts and the audio endpoint refused to serve it. One
        // source for the lock, and it is the same one that gates the audio.
        locked: !access.owned,
        freeParts: access.owned ? story.totalParts : access.freeParts,
        previewSeconds: access.owned ? null : access.previewSeconds,
        requiredSkus: access.owned ? [] : catalog.skusGranting(key),
      };
    });
    // `hidden` covers the BUILT-IN stories too, which is the point: they are
    // declared in the frontend's static config and rendered regardless of what
    // the database holds, so this list is the only way the admin panel can
    // remove one. Sent on the same request the list already makes rather than
    // as a second round trip.
    res.json({ stories, hidden });
  } catch (error) {
    console.error("listPublishedStories error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// ─── Admin: story visibility ───────────────────────────────────────────────

// GET /api/admin/stories/visibility/:difficulty  -> { hidden: [storyId] }
export async function getStoryVisibility(req, res) {
  try {
    res.json({ hidden: await storiesRepo.hiddenStoryIds(req.params.difficulty) });
  } catch (error) {
    console.error("getStoryVisibility error:", error);
    res.status(500).json({ error: "Failed to read story visibility." });
  }
}

// PUT /api/admin/stories/visibility/:difficulty/:storyId  { hidden }
// By slug, not by row id — a built-in story has no row to address.
export async function setStoryVisibility(req, res) {
  try {
    invalidateCatalog();
    const { difficulty, storyId } = req.params;
    if (!["easy", "medium", "hard"].includes(difficulty)) {
      return res.status(400).json({ error: "Invalid difficulty." });
    }
    if (typeof req.body?.hidden !== "boolean") {
      return res.status(400).json({ error: "hidden must be true or false." });
    }
    await storiesRepo.setHidden(difficulty, storyId, req.body.hidden);
    res.json({ success: true, difficulty, storyId, hidden: req.body.hidden });
  } catch (error) {
    console.error("setStoryVisibility error:", error);
    res.status(500).json({ error: "Failed to update story visibility." });
  }
}
