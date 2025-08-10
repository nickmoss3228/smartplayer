import mongoose from "mongoose";

const progressSchema = new mongoose.Schema(
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
    completedLevels: [
      {
        type: Number,
      },
    ],
    currentLevel: {
      type: Number,
      default: 1,
    },
    levelResults: {
      type: Map,
      of: {
        completed: Boolean,
        correctAnswers: Number,
        totalQuestions: Number,
        completedAt: Date,
      },
    },
  },
  { timestamps: true }
);
progressSchema.index({ userId: 1, difficulty: 1 }, { unique: true });
export const Progress = mongoose.model("Progress", progressSchema);
