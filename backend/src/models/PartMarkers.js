// models/PartMarkers.js
// Time markers, kept OUTSIDE the Story document so deleting a story cannot
// destroy them.
//
// Markers are the one piece of story content that can only be authored in the
// app — you need the waveform to place them — and they are also the piece that
// takes longest to produce. Everything else in a draft can be regenerated from
// the static config, so the normal fix for stale content is to delete the story
// and re-import it (importStory 409s while a doc exists, so delete-then-import
// is the only route). That workflow used to destroy every marker, every time.
//
// This collection is the durable copy. It is keyed by the story's IDENTITY
// rather than by its Mongo _id, precisely so it outlives the document: delete
// the story, re-import it, and the markers are still addressable under the same
// (difficulty, storyId, partNumber).
//
// It is deliberately never deleted by any story operation. Markers are small,
// a stale row costs nothing, and the whole point is that they survive.
import mongoose from "mongoose";

const partMarkersSchema = new mongoose.Schema({
  difficulty: { type: String, required: true, enum: ["easy", "medium", "hard"] },
  storyId: { type: String, required: true, trim: true },
  partNumber: { type: Number, required: true },
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
  updatedAt: { type: Date, default: Date.now },
});

// One row per part, and the lookup key for both saving and restoring.
partMarkersSchema.index({ difficulty: 1, storyId: 1, partNumber: 1 }, { unique: true });

export const PartMarkers = mongoose.model("PartMarkers", partMarkersSchema);

/**
 * Remember a part's markers. Called whenever they're saved in the Story
 * Builder, and once more for every part when a story is deleted — that second
 * call is what rescues markers placed before this collection existed.
 *
 * An empty list is stored as readily as a full one: clearing markers is a real
 * edit, and refusing to record it would resurrect deleted markers on the next
 * import. Protection against *accidental* loss belongs at the restore end,
 * which only ever fills a gap and never overwrites.
 */
export async function rememberPartMarkers(difficulty, storyId, partNumber, timeMarkers) {
  await PartMarkers.updateOne(
    { difficulty, storyId, partNumber },
    { $set: { timeMarkers: timeMarkers ?? [], updatedAt: new Date() } },
    { upsert: true },
  );
}

/**
 * Markers previously saved for these parts, as partNumber -> markers. Only
 * parts that have a remembered row appear.
 */
export async function recallStoryMarkers(difficulty, storyId) {
  const rows = await PartMarkers.find({ difficulty, storyId }).lean();
  return Object.fromEntries(rows.map((r) => [r.partNumber, r.timeMarkers ?? []]));
}

// Moved to helpers/markerRestore.js so it survives this model's removal.
// Re-exported here only because the frontend's markerRestore.test.ts still
// imports it from this path; delete this line with the model.
export { restoreMarkersIntoParts } from "../helpers/markerRestore.js";
