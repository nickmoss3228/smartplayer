import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxLength: 100,
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxLength: 2000,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Feedback = mongoose.model("Feedback", feedbackSchema);