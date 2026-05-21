// models/StoryProgress.js
import mongoose from "mongoose";

const storyProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    difficulty: {
      type: String,
      required: true,
      enum: ["easy", "medium", "hard"],
    },
    storyId: {
      type: String,
      required: true, // e.g. "leo", "anna" — matches your frontend story IDs
    },
    completedParts: [{ type: Number }],
    currentPart: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

storyProgressSchema.index(
  { userId: 1, difficulty: 1, storyId: 1 },
  { unique: true }
);

export const StoryProgress = mongoose.model("StoryProgress", storyProgressSchema);