// controllers/story.controller.js
// Admin Story Builder (create/edit/publish DB-backed stories) plus the one
// public endpoint the player fetches a published story from. See
// helpers/storyLookup.js for how DB stories are merged with the legacy
// static-file stories at read time.
import { Story } from "../models/Story.js";
import { uploadBuffer } from "../helpers/uploadToStorage.js";
import { storyRegistry } from "../config/storyRegistry.js";
import { quizData } from "../config/quizData.js";

const MAX_PARTS = 20;
const MAX_QUIZ_QUESTIONS = 10;

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

    const story = await Story.create({
      difficulty,
      storyId: storyId.trim(),
      storyName: storyName.trim(),
      description: description?.trim() ?? "",
      characterIcon: characterIcon?.trim() || "📖",
      totalParts: parts,
      parts: buildEmptyParts(parts),
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
  res.json({ parts: quizData[difficulty]?.[storyId] ?? {} });
}

// POST /api/admin/stories/import
// Imports a built-in story's full content (assembled by the frontend from
// audioDataByDifficulty.ts/Vocabulary.ts/quizData.js — see storyBuilder plan)
// into a new Story doc. Always created as a draft (published: false) so it
// can't affect players until the admin reviews it and explicitly publishes —
// unlike createStory, matching a static storyId is expected here, not rejected.
export async function importStory(req, res) {
  try {
    const { difficulty, storyId, storyName, description, characterIcon, totalParts, parts } = req.body;

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

    const story = await Story.create({
      difficulty,
      storyId: storyId.trim(),
      storyName: storyName.trim(),
      description: description?.trim() ?? "",
      characterIcon: characterIcon?.trim() || "📖",
      totalParts: partsCount,
      published: false,
      parts,
    });

    res.status(201).json({ story });
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
      .select("difficulty storyId storyName characterIcon totalParts published createdAt")
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

// DELETE /api/admin/stories/:id
export async function deleteStory(req, res) {
  try {
    await Story.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error("deleteStory error:", error);
    res.status(500).json({ error: "Failed to delete story." });
  }
}

// ─── Admin: per-part asset upload ──────────────────────────────────────────

function assetKeyFor(story, partNumber, kind, extra) {
  const base = `stories/${story.difficulty}/${story.storyId}/${partNumber}`;
  switch (kind) {
    case "audio":
      return `${base}/audio.mp3`;
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

    const key = assetKeyFor(story, partNumber, kind, { audioKey: audioKey?.trim(), index });
    if (!key) return res.status(400).json({ error: "Invalid kind." });

    const url = await uploadBuffer(key, req.file.buffer, req.file.mimetype);
    res.json({ url });
  } catch (error) {
    console.error("uploadPartAsset error:", error);
    res.status(500).json({ error: error.message || "Upload failed." });
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
      const incomplete = story.parts.some((p) => !p.audioUrl || p.timeMarkers.length === 0);
      if (incomplete) {
        return res.status(400).json({ error: "Every part needs audio and at least one marker before publishing." });
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
      totalParts: story.totalParts,
      parts: story.parts.map((part) => ({
        partNumber: part.partNumber,
        audioUrl: part.audioUrl,
        timeMarkers: part.timeMarkers,
        vocabulary: part.vocabulary,
        phrasalVerbs: part.phrasalVerbs,
        // Never send correctAnswer to the client — same rule as getPublicQuiz in quizData.js.
        quiz: part.quiz.map(({ correctAnswer, ...rest }) => rest),
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
    const stories = await Story.find({ difficulty, published: true })
      .select("storyId storyName description characterIcon totalParts")
      .lean();
    res.json({ stories });
  } catch (error) {
    console.error("listPublishedStories error:", error);
    res.status(500).json({ message: "Server error" });
  }
}
