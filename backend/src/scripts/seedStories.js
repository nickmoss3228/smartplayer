// // scripts/seedStories.js
// import mongoose from "mongoose";
// import { connectDB } from "../config/db.js";
// import { Story } from "../models/Story.js";

// const stories = [
//   // ── EASY ──────────────────────────────────────────
//   {
//     storyId: "leo-easy",
//     storyName: "Leo's Adventure",
//     characterIcon: "🦁",
//     difficulty: "easy",
//     totalParts: 10,
//     order: 1,
//   },
//   // Add more easy stories here later, e.g.:
//   // {
//   //   storyId: "mia-easy",
//   //   storyName: "Mia's Journey",
//   //   characterIcon: "🐭",
//   //   difficulty: "easy",
//   //   totalParts: 8,
//   //   order: 2,
//   // },

//   // ── MEDIUM ────────────────────────────────────────
//   {
//     storyId: "sam-medium",
//     storyName: "Sam's Quest",
//     characterIcon: "🐻",
//     difficulty: "medium",
//     totalParts: 10,
//     order: 1,
//   },

//   // ── HARD ──────────────────────────────────────────
//   {
//     storyId: "zoe-hard",
//     storyName: "Zoe's Challenge",
//     characterIcon: "🦊",
//     difficulty: "hard",
//     totalParts: 10,
//     order: 1,
//   },
// ];

// async function seed() {
//   await connectDB();

//   for (const storyData of stories) {
//     await Story.findOneAndUpdate(
//       { storyId: storyData.storyId },
//       storyData,
//       { upsert: true, new: true }
//     );
//     console.log(`✅ Seeded: ${storyData.storyName}`);
//   }

//   console.log("🌱 Story seeding complete.");
//   await mongoose.disconnect();
// }

// seed().catch((err) => {
//   console.error("Seeding failed:", err);
//   process.exit(1);
// });