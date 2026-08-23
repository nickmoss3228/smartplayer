// models/Story.js
// DB-backed stories authored via the admin Story Builder. Existing hardcoded
// stories (leo, leo-additional, maya, daniel) stay in the static config files
// (storyRegistry.js, audioDataByDifficulty.ts, Vocabulary.ts, quizData.js) —
// this model is only for new stories going forward. See helpers/storyLookup.js
// for how the two sources are merged at read time.

import mongoose from "mongoose";

const vocabEntrySchema = new mongoose.Schema(
  {
    word: { type: String, required: true, trim: true }, // Russian text shown to the student
    definition: { type: String, default: "" },
    audioKey: { type: String, required: true, trim: true }, // English filename stem, also the progress key
    audioUrl: { type: String, default: null },
  },
  { _id: false }
);

const quizQuestionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    options: {
      type: [String],
      validate: (arr) => arr.length === 4,
    },
    correctAnswer: { type: Number, required: true, min: 0, max: 3 },
    referenceTime: { type: Number, default: 0 },
    audio: {
      fast: { type: String, default: null },
      slow: { type: String, default: null },
    },
  },
  { _id: false }
);

const partSchema = new mongoose.Schema(
  {
    partNumber: { type: Number, required: true },
    // Shown as the track name. Static stories name their parts ("Story",
    // "Discussion", "Meet Leo"); without this the adapter had to invent
    // `${storyName} — ${n}`, so publishing renamed every track.
    title: { type: String, default: "", trim: true },
    audioUrl: { type: String, default: null },
    // Per-marker help clips. Only leo part 1 has real ones today, but the
    // adapter dropped them entirely, leaving the Help modal silent for any
    // published story.
    helpAudio: { type: [String], default: [] },
    // The comic page for this part. Static stories keep theirs in the
    // comicManifest in Player/Comics/comicsData.ts, which is keyed by
    // difficulty and therefore cannot describe a second story on the same
    // level — a DB story has to carry its own.
    comicUrl: { type: String, default: null },
    timeMarkers: {
      type: [
        {
          time: { type: Number, required: true },
          label: { type: String, default: "" },
          color: { type: String, default: "red" },
        },
      ],
      default: [],
      _id: false,
    },
    vocabulary: { type: [vocabEntrySchema], default: [] },
    phrasalVerbs: { type: [vocabEntrySchema], default: [] },
    quiz: {
      type: [quizQuestionSchema],
      default: [],
      validate: (arr) => arr.length <= 10,
    },
  },
  { _id: false }
);

const storySchema = new mongoose.Schema(
  {
    difficulty: { type: String, required: true, enum: ["easy", "medium", "hard"] },
    storyId: { type: String, required: true, trim: true }, // slug, unique per difficulty
    // Admin-facing identifier, shown in the Story Builder lists.
    storyName: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    // What STUDENTS see, per locale. The static stories these replace are
    // bilingual (locales/{en,ru}/translation.json), so a single storyName
    // meant publishing showed one language to everyone. Empty strings fall
    // back to storyName/description, which is what keeps stories imported
    // before this field existed working unchanged.
    localized: {
      title: { en: { type: String, default: "" }, ru: { type: String, default: "" } },
      description: { en: { type: String, default: "" }, ru: { type: String, default: "" } },
    },
    characterIcon: { type: String, default: "📖" },
    totalParts: { type: Number, required: true, min: 1, max: 20 },
    // Which heading the story sits under in the list ("Stories" vs
    // "News & Interesting Things"). A published DB story REPLACES its static
    // counterpart wholesale, so without carrying the category the replacement
    // silently moved every news story onto the general shelf the moment it was
    // published. Null means "no opinion" — the frontend then falls back to the
    // static entry's category, which is what keeps stories imported before this
    // field existed on the right shelf.
    category: { type: String, enum: ["general", "news", null], default: null },
    // 4:5 card art for the story list. Same reasoning as `category`: a
    // published DB story replaces its static entry outright, so without
    // carrying this, publishing dropped the artwork and the card fell back to
    // the halftone + emoji placeholder. Null means "no opinion" and the
    // frontend uses the static entry's cover.
    coverUrl: { type: String, default: null },
    // Hidden from players until the admin explicitly publishes it.
    published: { type: Boolean, default: false },
    parts: { type: [partSchema], default: [] },
  },
  { timestamps: true }
);

storySchema.index({ difficulty: 1, storyId: 1 }, { unique: true });

export const Story = mongoose.model("Story", storySchema);
