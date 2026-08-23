// controllers/story.controller.js
// Admin Story Builder (create/edit/publish DB-backed stories) plus the one
// public endpoint the player fetches a published story from. See
// helpers/storyLookup.js for how DB stories are merged with the legacy
// static-file stories at read time.
import { Story } from "../models/Story.js";
import { setStoryHidden, hiddenStoryIds } from "../models/StoryVisibility.js";
import {
  rememberPartMarkers,
  recallStoryMarkers,
  restoreMarkersIntoParts,
} from "../models/PartMarkers.js";
import { uploadBuffer } from "../helpers/uploadToStorage.js";
import { storyRegistry } from "../config/storyRegistry.js";
import { getQuizPartsForImport, resolveQuizAudioPath } from "../config/quizData.js";

const MAX_PARTS = 20;
const MAX_QUIZ_QUESTIONS = 10;

// Keeps only the two locales the app ships and coerces to strings, so a
// malformed payload cannot write arbitrary keys into the document.
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

// ─── Admin: create/list/fetch/delete ───────────────────────────────────────

// POST /api/admin/stories
export async function createStory(req, res) {
  try {
    const { difficulty, storyId, storyName, description, characterIcon, totalParts } = req.body;

    if (!["easy", "medium", "hard"].includes(difficulty)) {
      return res.status(400).json({ error: "Invalid difficulty." });
    }
    if (!storyId?.trim() || !storyName?.trim()) {
      return res.status(400).json({ error: "storyId and storyName are required." });
    }
    const parts = Number(totalParts);
    if (!Number.isInteger(parts) || parts < 1 || parts > MAX_PARTS) {
      return res.status(400).json({ error: `totalParts must be between 1 and ${MAX_PARTS}.` });
    }

    const existing = await Story.findOne({ difficulty, storyId: storyId.trim() });
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
    const remembered = await recallStoryMarkers(difficulty, storyId.trim());
    const story = await Story.create({
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
// into a new Story doc. Always created as a draft (published: false) so it
// can't affect players until the admin reviews it and explicitly publishes —
// unlike createStory, matching a static storyId is expected here, not rejected.
export async function importStory(req, res) {
  try {
    const { difficulty, storyId, storyName, description, characterIcon, category, coverUrl, localized, totalParts, parts } = req.body;

    if (!["easy", "medium", "hard"].includes(difficulty)) {
      return res.status(400).json({ error: "Invalid difficulty." });
    }
    if (!storyId?.trim() || !storyName?.trim()) {
      return res.status(400).json({ error: "storyId and storyName are required." });
    }
    const partsCount = Number(totalParts);
    if (!Number.isInteger(partsCount) || partsCount < 1 || partsCount > MAX_PARTS) {
      return res.status(400).json({ error: `totalParts must be between 1 and ${MAX_PARTS}.` });
    }
    if (!Array.isArray(parts) || parts.length !== partsCount) {
      return res.status(400).json({ error: "parts must be an array matching totalParts." });
    }

    const existing = await Story.findOne({ difficulty, storyId: storyId.trim() });
    if (existing) {
      return res.status(409).json({ error: "This story has already been imported." });
    }

    for (const part of parts) {
      if (!Number.isInteger(part.partNumber)) {
        return res.status(400).json({ error: "Every part needs a partNumber." });
      }
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
    const remembered = await recallStoryMarkers(difficulty, storyId.trim());
    const { parts: partsWithMarkers, restoredCount: restoredParts } = restoreMarkersIntoParts(
      parts,
      remembered,
    );

    const story = await Story.create({
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
    const filter = difficulty ? { difficulty } : {};
    const stories = await Story.find(filter)
      .select("difficulty storyId storyName characterIcon category coverUrl totalParts published createdAt")
      .sort({ createdAt: -1 });
    res.json({ stories });
  } catch (error) {
    console.error("listStories error:", error);
    res.status(500).json({ error: "Failed to load stories." });
  }
}

// GET /api/admin/stories/:id
export async function getStory(req, res) {
  try {
    const story = await Story.findById(req.params.id);
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
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: "Story not found." });

    const { storyName, description, characterIcon, category, localized } = req.body;

    if (storyName !== undefined) {
      if (!storyName.trim()) return res.status(400).json({ error: "storyName can't be empty." });
      story.storyName = storyName.trim();
    }
    if (description !== undefined) story.description = description.trim();
    if (characterIcon !== undefined) story.characterIcon = characterIcon.trim() || "📖";
    if (category !== undefined) {
      if (!["general", "news", null].includes(category)) {
        return res.status(400).json({ error: "category must be general, news, or null." });
      }
      story.category = category;
    }
    if (localized !== undefined) story.localized = sanitizeLocalized(localized);

    await story.save();
    res.json({ story });
  } catch (error) {
    console.error("updateStoryMeta error:", error);
    res.status(500).json({ error: "Failed to update story." });
  }
}

// POST /api/admin/stories/:id/parts — appends one empty part (e.g. a "part
// 3" alongside an existing "part 1"/"part 2") and bumps totalParts to match.
export async function addPart(req, res) {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: "Story not found." });

    if (story.parts.length >= MAX_PARTS) {
      return res.status(400).json({ error: `A story can have at most ${MAX_PARTS} parts.` });
    }

    const nextPartNumber = story.parts.reduce((max, p) => Math.max(max, p.partNumber), 0) + 1;
    story.parts.push({ partNumber: nextPartNumber });
    story.totalParts = story.parts.length;
    await story.save();

    res.status(201).json({ story });
  } catch (error) {
    console.error("addPart error:", error);
    res.status(500).json({ error: "Failed to add part." });
  }
}

// DELETE /api/admin/stories/:id
export async function deleteStory(req, res) {
  try {
    // Snapshot the markers before the document goes. saveMarkers already
    // mirrors them as they're placed, so this is a backstop — it's what
    // rescues markers that were saved before PartMarkers existed, and it
    // covers any path that wrote markers without going through saveMarkers.
    const story = await Story.findById(req.params.id);
    if (story) {
      for (const part of story.parts ?? []) {
        if (part.timeMarkers?.length) {
          await rememberPartMarkers(story.difficulty, story.storyId, part.partNumber, part.timeMarkers);
        }
      }
      await story.deleteOne();
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
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: "Story not found." });

    const partNumber = Number(req.params.partNumber);
    const part = story.parts.find((p) => p.partNumber === partNumber);
    if (!part) return res.status(404).json({ error: "Part not found." });

    if (!req.file) return res.status(400).json({ error: "No file uploaded." });

    const { kind, audioKey, index } = req.query;
    if (["vocab", "phrasal"].includes(kind) && !audioKey?.trim()) {
      return res.status(400).json({ error: "audioKey is required for vocab/phrasal uploads." });
    }
    if (["quizFast", "quizSlow"].includes(kind) && (index === undefined || Number.isNaN(Number(index)))) {
      return res.status(400).json({ error: "index is required for quiz audio uploads." });
    }

    let ext;
    if (kind === "comic") {
      ext = COMIC_EXTENSIONS[req.file.mimetype];
      if (!ext) {
        return res.status(400).json({
          error: `A comic page must be a JPEG, PNG, WebP, AVIF or GIF image — got ${req.file.mimetype}.`,
        });
      }
    }

    const key = assetKeyFor(story, partNumber, kind, { audioKey: audioKey?.trim(), index, ext });
    if (!key) return res.status(400).json({ error: "Invalid kind." });

    const url = await uploadBuffer(key, req.file.buffer, req.file.mimetype);
    res.json({ url });
  } catch (error) {
    console.error("uploadPartAsset error:", error);
    res.status(500).json({ error: error.message || "Upload failed." });
  }
}

// POST /api/admin/stories/:id/cover   (multipart, field "file")
// The card art in the story list. Story-level rather than per-part, so it does
// not go through assetKeyFor — the key has no part number in it.
export async function uploadStoryCover(req, res) {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: "Story not found." });
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });

    const ext = COMIC_EXTENSIONS[req.file.mimetype];
    if (!ext) {
      return res.status(400).json({
        error: `A cover must be a JPEG, PNG, WebP, AVIF or GIF image — got ${req.file.mimetype}.`,
      });
    }

    const key = `stories/${story.difficulty}/${story.storyId}/cover.${ext}`;
    story.coverUrl = await uploadBuffer(key, req.file.buffer, req.file.mimetype);
    await story.save();
    res.json({ story });
  } catch (error) {
    console.error("uploadStoryCover error:", error);
    res.status(500).json({ error: error.message || "Cover upload failed." });
  }
}

// DELETE /api/admin/stories/:id/cover
// Clears the field only; the object is left in the bucket. Nothing else can
// reach that key, and a re-upload overwrites it, so deleting buys nothing and
// risks removing art a rolled-back story still points at.
export async function clearStoryCover(req, res) {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: "Story not found." });
    story.coverUrl = null;
    await story.save();
    res.json({ story });
  } catch (error) {
    console.error("clearStoryCover error:", error);
    res.status(500).json({ error: "Failed to clear cover." });
  }
}

// ─── Admin: per-part content ────────────────────────────────────────────────

async function findPartOr404(req, res) {
  const story = await Story.findById(req.params.id);
  if (!story) {
    res.status(404).json({ error: "Story not found." });
    return null;
  }
  const partNumber = Number(req.params.partNumber);
  const part = story.parts.find((p) => p.partNumber === partNumber);
  if (!part) {
    res.status(404).json({ error: "Part not found." });
    return null;
  }
  return { story, part };
}

// PATCH /api/admin/stories/:id/parts/:partNumber/markers  { timeMarkers, audioUrl? }
export async function saveMarkers(req, res) {
  try {
    const found = await findPartOr404(req, res);
    if (!found) return;
    const { story, part } = found;

    const { timeMarkers, audioUrl } = req.body;
    if (!Array.isArray(timeMarkers) || timeMarkers.some((m) => typeof m.time !== "number")) {
      return res.status(400).json({ error: "timeMarkers must be an array of { time, label, color }." });
    }
    const sorted = [...timeMarkers].sort((a, b) => a.time - b.time);

    part.timeMarkers = sorted;
    if (audioUrl) part.audioUrl = audioUrl;
    await story.save();

    // Mirror into the durable copy, so deleting this story to re-import it
    // doesn't throw the markers away. Keyed by story identity, not _id — see
    // models/PartMarkers.js.
    await rememberPartMarkers(story.difficulty, story.storyId, part.partNumber, sorted);

    res.json({ part });
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
    const found = await findPartOr404(req, res);
    if (!found) return;
    const { story, part } = found;

    const error = validateVocabList(req.body.vocabulary);
    if (error) return res.status(400).json({ error: `Invalid vocabulary: ${error}.` });

    part.vocabulary = req.body.vocabulary;
    await story.save();
    res.json({ part });
  } catch (error) {
    console.error("saveVocabulary error:", error);
    res.status(500).json({ error: "Failed to save vocabulary." });
  }
}

// PUT /api/admin/stories/:id/parts/:partNumber/phrasal-verbs  { phrasalVerbs }
export async function savePhrasalVerbs(req, res) {
  try {
    const found = await findPartOr404(req, res);
    if (!found) return;
    const { story, part } = found;

    const error = validateVocabList(req.body.phrasalVerbs);
    if (error) return res.status(400).json({ error: `Invalid phrasal verbs: ${error}.` });

    part.phrasalVerbs = req.body.phrasalVerbs;
    await story.save();
    res.json({ part });
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
    const found = await findPartOr404(req, res);
    if (!found) return;
    const { story, part } = found;

    const { comicUrl } = req.body;
    if (comicUrl !== null && typeof comicUrl !== "string") {
      return res.status(400).json({ error: "comicUrl must be a string, or null to clear it." });
    }

    part.comicUrl = comicUrl || null;
    await story.save();
    res.json({ part });
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
    const found = await findPartOr404(req, res);
    if (!found) return;
    const { story, part } = found;

    const error = validateQuizList(req.body.quiz);
    if (error) return res.status(400).json({ error: `Invalid quiz: ${error}.` });

    part.quiz = req.body.quiz;
    await story.save();
    res.json({ part });
  } catch (error) {
    console.error("saveQuiz error:", error);
    res.status(500).json({ error: "Failed to save quiz." });
  }
}

// PATCH /api/admin/stories/:id/publish  { published }
export async function setStoryPublished(req, res) {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: "Story not found." });

    const { published } = req.body;
    if (typeof published !== "boolean") {
      return res.status(400).json({ error: "published must be a boolean." });
    }

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
        return res.status(400).json({ error: "Cannot publish yet: " + problems.join("; ") + "." });
      }
    }

    story.published = published;
    await story.save();
    res.json({ story });
  } catch (error) {
    console.error("setStoryPublished error:", error);
    res.status(500).json({ error: "Failed to update story." });
  }
}

// ─── Public: fetch a published story for playback ──────────────────────────

// GET /api/stories/:difficulty/:storyId
export async function getPublishedStory(req, res) {
  try {
    const { difficulty, storyId } = req.params;
    const story = await Story.findOne({ difficulty, storyId, published: true }).lean();
    if (!story) return res.status(404).json({ message: "Story not found." });

    res.json({
      storyId: story.storyId,
      storyName: story.storyName,
      description: story.description,
      characterIcon: story.characterIcon,
      category: story.category ?? null,
      coverUrl: story.coverUrl ?? null,
      localized: story.localized ?? null,
      totalParts: story.totalParts,
      parts: story.parts.map((part) => ({
        partNumber: part.partNumber,
        title: part.title ?? "",
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
      })),
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
    const [stories, hidden] = await Promise.all([
      Story.find({ difficulty, published: true })
        .select("storyId storyName description characterIcon category coverUrl localized totalParts")
        .lean(),
      hiddenStoryIds(difficulty),
    ]);
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
    res.json({ hidden: await hiddenStoryIds(req.params.difficulty) });
  } catch (error) {
    console.error("getStoryVisibility error:", error);
    res.status(500).json({ error: "Failed to read story visibility." });
  }
}

// PUT /api/admin/stories/visibility/:difficulty/:storyId  { hidden }
// By slug, not by Mongo _id — a built-in story has no document to address.
export async function setStoryVisibility(req, res) {
  try {
    const { difficulty, storyId } = req.params;
    if (!["easy", "medium", "hard"].includes(difficulty)) {
      return res.status(400).json({ error: "Invalid difficulty." });
    }
    if (typeof req.body?.hidden !== "boolean") {
      return res.status(400).json({ error: "hidden must be true or false." });
    }
    await setStoryHidden(difficulty, storyId, req.body.hidden);
    res.json({ success: true, difficulty, storyId, hidden: req.body.hidden });
  } catch (error) {
    console.error("setStoryVisibility error:", error);
    res.status(500).json({ error: "Failed to update story visibility." });
  }
}
