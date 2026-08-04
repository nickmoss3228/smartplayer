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
    audioUrl: { type: String, default: null },
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
    storyName: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    characterIcon: { type: String, default: "📖" },
    totalParts: { type: Number, required: true, min: 1, max: 20 },
    // Hidden from players until the admin explicitly publishes it.
    published: { type: Boolean, default: false },
    parts: { type: [partSchema], default: [] },
  },
  { timestamps: true }
);

storySchema.index({ difficulty: 1, storyId: 1 }, { unique: true });

export const Story = mongoose.model("Story", storySchema);
