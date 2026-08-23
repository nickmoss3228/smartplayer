// models/StoryVisibility.js
// Whether a story appears in the app, for ANY story — including the built-in
// ones that live in the static config and have no Story document of their own.
//
// Why this is separate from Story.published:
//
//   published  = "the DB copy of this story is authoritative, use it instead of
//                 the static files"
//   hidden     = "do not show this story to students at all"
//
// They are genuinely different questions, and conflating them breaks both. The
// built-in stories (leo, leo-additional, maya, daniel, the news set) are
// declared in src/types/storyGroups.ts and rendered whether or not the database
// knows anything about them, so deleting a draft never removed one from the
// list — the static entry underneath simply reappeared. Hiding therefore cannot
// live on the Story document: a story you have never imported has no document
// to put the flag on, and "import it before you can hide it" is a nonsense
// workflow.
//
// Keyed by identity (difficulty, storyId) rather than by _id for the same
// reason PartMarkers is: it has to outlive, and exist without, any document.
import mongoose from "mongoose";

const storyVisibilitySchema = new mongoose.Schema({
  difficulty: { type: String, required: true, enum: ["easy", "medium", "hard"] },
  storyId: { type: String, required: true, trim: true },
  hidden: { type: Boolean, default: false },
  updatedAt: { type: Date, default: Date.now },
});

storyVisibilitySchema.index({ difficulty: 1, storyId: 1 }, { unique: true });

export const StoryVisibility = mongoose.model("StoryVisibility", storyVisibilitySchema);

/** Set or clear the hidden flag for one story. */
export async function setStoryHidden(difficulty, storyId, hidden) {
  await StoryVisibility.updateOne(
    { difficulty, storyId },
    { $set: { hidden: Boolean(hidden), updatedAt: new Date() } },
    { upsert: true },
  );
}

/**
 * Slugs hidden for a difficulty. Absent rows mean visible, so the default for
 * anything nobody has touched is "shown" — a new story appears without needing
 * a row, and losing this collection makes everything visible rather than
 * making the app look empty.
 */
export async function hiddenStoryIds(difficulty) {
  const rows = await StoryVisibility.find({ difficulty, hidden: true }).select("storyId").lean();
  return rows.map((r) => r.storyId);
}
