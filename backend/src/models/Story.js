// // models/Story.js
// import mongoose from "mongoose";

// const storySchema = new mongoose.Schema(
//   {
//     storyId: {
//       type: String,
//       required: true,
//       unique: true,
//       trim: true,
//       // e.g. "leo-easy", "mia-medium"
//     },
//     storyName: {
//       type: String,
//       required: true,
//       trim: true,
//       // e.g. "Leo's Adventure"
//     },
//     characterIcon: {
//       type: String,
//       required: true,
//       // e.g. "🦁"
//     },
//     difficulty: {
//       type: String,
//       required: true,
//       enum: ["easy", "medium", "hard"],
//     },
//     totalParts: {
//       type: Number,
//       required: true,
//       min: 1,
//       // e.g. 10
//     },
//     order: {
//       type: Number,
//       required: true,
//       default: 0,
//       // controls display order within a difficulty
//     },
//     isPublished: {
//       type: Boolean,
//       default: true,
//     },
//   },
//   { timestamps: true }
// );

// storySchema.index({ difficulty: 1, order: 1 });

// export const Story = mongoose.model("Story", storySchema);