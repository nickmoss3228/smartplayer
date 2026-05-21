// controllers/progress.controller.js
import { Progress } from "../models/Progress.js";
import { StoryProgress } from "../models/StoryProgress.js";
import { storyRegistry } from "../config/storyRegistry.js";
import { updateAchievements } from "../helpers/updateAchievements.js";
import { User } from "../models/User.js";

const difficulties = ["easy", "medium", "hard"];

// GET /progress/:difficulty
export async function getProgress(req, res) {
  try {
    const { difficulty } = req.params;
    const userId = req.user._id;

    if (!difficulties.includes(difficulty))
      return res.status(400).json({ message: "Invalid difficulty level" });

    let progress = await Progress.findOne({ userId, difficulty });
    if (!progress) {
      progress = await Progress.create({
        userId,
        difficulty,
        completedLevels: [],
        currentLevel: 1,
        levelResults: new Map(),
      });
    }

    res.json({
      completedLevels: progress.completedLevels,
      currentLevel: progress.currentLevel,
      levelResults: Object.fromEntries(progress.levelResults),
      totalLevels: progress.completedLevels.length,
    });
  } catch (error) {
    console.error("Get progress error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// POST /progress/complete  — now handles story parts
// export async function completeLevel(req, res) {
//   try {
//     const { difficulty, storyId, partNumber, correctAnswers, totalQuestions } =
//       req.body;
//     const userId = req.user._id;

//     if (!difficulties.includes(difficulty))
//       return res.status(400).json({ message: "Invalid difficulty level" });

//     if (!storyId || partNumber === undefined || correctAnswers === undefined || !totalQuestions)
//       return res.status(400).json({ message: "Missing required fields" });

//     if (correctAnswers > totalQuestions)
//       return res.status(400).json({
//         message: "Invalid quiz results: correct answers cannot exceed total questions",
//       });

//     // Validate storyId exists in registry
//     const stories = storyRegistry[difficulty] ?? [];
//     const storyMeta = stories.find((s) => s.storyId === storyId);
//     if (!storyMeta)
//       return res.status(400).json({ message: "Unknown storyId for this difficulty" });

//     const minCorrect = Math.ceil(totalQuestions * 0.7);
//     const isCompleted = correctAnswers >= minCorrect;

//     // Update StoryProgress
//     let storyProgress = await StoryProgress.findOne({ userId, difficulty, storyId });
//     if (!storyProgress) {
//       storyProgress = new StoryProgress({
//         userId,
//         difficulty,
//         storyId,
//         completedParts: [],
//         currentPart: 1,
//       });
//     }

//     if (isCompleted) {
//       if (!storyProgress.completedParts.includes(partNumber)) {
//         storyProgress.completedParts.push(partNumber);
//         storyProgress.completedParts.sort((a, b) => a - b);
//       }
//       if (
//         partNumber === storyProgress.currentPart &&
//         partNumber < storyMeta.totalParts
//       ) {
//         storyProgress.currentPart = partNumber + 1;
//       }
//     }

//     await storyProgress.save();

//     // Keep legacy Progress document in sync (total completed parts across all stories)
//     const allStoryProgress = await StoryProgress.find({ userId, difficulty });
//     const totalCompletedParts = allStoryProgress.reduce(
//       (sum, sp) => sum + sp.completedParts.length,
//       0
//     );

//     let progress = await Progress.findOne({ userId, difficulty });
//     if (!progress) {
//       progress = new Progress({
//         userId,
//         difficulty,
//         completedLevels: [],
//         currentLevel: 1,
//         levelResults: new Map(),
//       });
//     }
//     // Store completed part keys as "storyId:partNumber" strings mapped to results
//     progress.levelResults.set(`${storyId}:${partNumber}`, {
//       completed: isCompleted,
//       correctAnswers,
//       totalQuestions,
//       completedAt: new Date(),
//     });
//     await progress.save();

//     res.json({
//       message: isCompleted
//         ? "Part completed successfully"
//         : "Part not completed. Try again!",
//       completed: isCompleted,
//       storyProgress: {
//         completedParts: storyProgress.completedParts,
//         currentPart: storyProgress.currentPart,
//       },
//     });
//   } catch (error) {
//     console.error("Complete level error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// }

// Add to controllers/progress.controller.js

// GET /progress/story/:difficulty/:storyId
export async function getStoryProgress(req, res) {
  try {
    const { difficulty, storyId } = req.params;
    const userId = req.user._id;

    if (!difficulties.includes(difficulty))
      return res.status(400).json({ message: "Invalid difficulty" });

    const stories = storyRegistry[difficulty] ?? [];
    const storyMeta = stories.find((s) => s.storyId === storyId);
    if (!storyMeta)
      return res.status(400).json({ message: "Unknown storyId" });

    let doc = await StoryProgress.findOne({ userId, difficulty, storyId });
    if (!doc) {
      // Return empty progress — don't create a doc yet
      return res.json({
        storyId,
        difficulty,
        completedParts: [],
        currentPart: 1,
        totalParts: storyMeta.totalParts,
      });
    }

    res.json({
      storyId,
      difficulty,
      completedParts: doc.completedParts,
      currentPart: doc.currentPart,
      totalParts: storyMeta.totalParts,
    });
  } catch (error) {
    console.error("Get story progress error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// ── helpers ────────────────────────────────────────────────────────────────

function todayUTC() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function yesterdayUTC() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Reads all Progress docs for a user across all difficulties and returns
 * the total number of questions from uniquely-completed parts.
 */
async function countCompletedQuestions(userId) {
  const docs = await Progress.find({ userId });
  let total = 0;
  for (const doc of docs) {
    for (const [, result] of doc.levelResults) {
      if (result.completed) total += result.totalQuestions;
    }
  }
  return total;
}

/**
 * Counts unique story IDs across all difficulties where at least
 * one part has been completed.
 */
async function countUniqueCompletedStories(userId) {
  const docs = await StoryProgress.find({ userId });
  const uniqueStories = new Set();
  for (const doc of docs) {
    if (doc.completedParts.length > 0) {
      uniqueStories.add(`${doc.difficulty}:${doc.storyId}`);
    }
  }
  return uniqueStories.size;
}

// ── POST /progress/complete ────────────────────────────────────────────────

export async function completeLevel(req, res) {
  try {
    const { difficulty, storyId, partNumber, correctAnswers, totalQuestions } =
      req.body;
    const userId = req.user._id;

    if (!difficulties.includes(difficulty))
      return res.status(400).json({ message: "Invalid difficulty level" });

    if (
      !storyId ||
      partNumber === undefined ||
      correctAnswers === undefined ||
      !totalQuestions
    )
      return res.status(400).json({ message: "Missing required fields" });

    if (correctAnswers > totalQuestions)
      return res.status(400).json({
        message: "Invalid quiz results: correct answers cannot exceed total questions",
      });

    const stories = storyRegistry[difficulty] ?? [];
    const storyMeta = stories.find((s) => s.storyId === storyId);
    if (!storyMeta)
      return res.status(400).json({ message: "Unknown storyId for this difficulty" });

    const minCorrect = Math.ceil(totalQuestions * 0.7);
    const isCompleted = correctAnswers >= minCorrect;

    // ── Update StoryProgress ──────────────────────────────────────────────
    let storyProgress = await StoryProgress.findOne({ userId, difficulty, storyId });
    if (!storyProgress) {
      storyProgress = new StoryProgress({
        userId,
        difficulty,
        storyId,
        completedParts: [],
        currentPart: 1,
      });
    }

    if (isCompleted) {
      if (!storyProgress.completedParts.includes(partNumber)) {
        storyProgress.completedParts.push(partNumber);
        storyProgress.completedParts.sort((a, b) => a - b);
      }
      if (
        partNumber === storyProgress.currentPart &&
        partNumber < storyMeta.totalParts
      ) {
        storyProgress.currentPart = partNumber + 1;
      }
    }

    await storyProgress.save();

    // ── Update legacy Progress doc ────────────────────────────────────────
    let progress = await Progress.findOne({ userId, difficulty });
    if (!progress) {
      progress = new Progress({
        userId,
        difficulty,
        completedLevels: [],
        currentLevel: 1,
        levelResults: new Map(),
      });
    }

    // Only write the result if the part isn't already marked completed,
    // so that re-attempts never overwrite a completed:true entry.
    const resultKey = `${storyId}:${partNumber}`;
    const existing = progress.levelResults.get(resultKey);
    if (!existing?.completed) {
      progress.levelResults.set(resultKey, {
        completed: isCompleted,
        correctAnswers,
        totalQuestions,
        completedAt: new Date(),
      });
      await progress.save();
    }

    // ── Streak update (only on completed submissions) ─────────────────────
    let newStreak = 0;
    if (isCompleted) {
      const user = await User.findById(userId).select("streak totalListeningSeconds");
      const today = todayUTC();
      const yesterday = yesterdayUTC();
      const last = user.streak?.lastSubmittedDate;

      let current = user.streak?.current ?? 0;
      let longest = user.streak?.longest ?? 0;

      if (last === today) {
        // Already counted today — no change
        current = current;
      } else if (last === yesterday) {
        // Consecutive day
        current += 1;
      } else {
        // Streak broken or first ever
        current = 1;
      }

      longest = Math.max(longest, current);
      newStreak = current;

      await User.findByIdAndUpdate(userId, {
        $set: {
          "streak.current": current,
          "streak.longest": longest,
          "streak.lastSubmittedDate": today,
        },
      });

      // ── Achievement check ───────────────────────────────────────────────
      const [questionsAnswered, uniqueStoriesCount] = await Promise.all([
        countCompletedQuestions(userId),
        countUniqueCompletedStories(userId),
      ]);

      await updateAchievements(userId, {
        listeningSeconds: user.totalListeningSeconds ?? 0,
        questionsAnswered,
        currentStreak: current,
        uniqueStoriesCount,
      });
    }

    res.json({
      message: isCompleted
        ? "Part completed successfully"
        : "Part not completed. Try again!",
      completed: isCompleted,
      storyProgress: {
        completedParts: storyProgress.completedParts,
        currentPart: storyProgress.currentPart,
      },
    });
  } catch (error) {
    console.error("Complete level error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// ── PATCH /progress/listening-time ────────────────────────────────────────
// Called by the frontend periodically to sync localStorage seconds to DB.

export async function syncListeningTime(req, res) {
  try {
    const { totalSeconds } = req.body;
    const userId = req.user._id;

    if (typeof totalSeconds !== "number" || totalSeconds < 0)
      return res.status(400).json({ message: "Invalid totalSeconds value" });

    // Only ever increase — never allow the value to go backwards.
    const user = await User.findById(userId).select(
      "totalListeningSeconds achievements"
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    if (totalSeconds <= (user.totalListeningSeconds ?? 0)) {
      // Nothing to update, but still return current value so frontend is in sync
      return res.json({ totalListeningSeconds: user.totalListeningSeconds });
    }

    await User.findByIdAndUpdate(userId, {
      $set: { totalListeningSeconds: totalSeconds },
    });

    // Check listening achievement with updated value
    const [questionsAnswered, uniqueStoriesCount] = await Promise.all([
      countCompletedQuestions(userId),
      countUniqueCompletedStories(userId),
    ]);

    const streakDoc = await User.findById(userId).select("streak");
    await updateAchievements(userId, {
      listeningSeconds: totalSeconds,
      questionsAnswered,
      currentStreak: streakDoc.streak?.current ?? 0,
      uniqueStoriesCount,
    });

    res.json({ totalListeningSeconds: totalSeconds });
  } catch (error) {
    console.error("Sync listening time error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// ── GET /api/user/achievements ─────────────────────────────────────────────

export async function getAchievements(req, res) {
  try {
    const userId = req.user._id;

    const [user, questionsAnswered, uniqueStoriesCount] = await Promise.all([
      User.findById(userId).select(
        "achievements streak totalListeningSeconds"
      ),
      countCompletedQuestions(userId),
      countUniqueCompletedStories(userId),
    ]);

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      achievements: user.achievements,
      stats: {
        listeningSeconds:  user.totalListeningSeconds ?? 0,
        questionsAnswered,
        currentStreak:     user.streak?.current ?? 0,
        longestStreak:     user.streak?.longest ?? 0,
        uniqueStoriesCount,
      },
    });
  } catch (error) {
    console.error("Get achievements error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /progress/overview
export async function getOverview(req, res) {
  try {
    const userId = req.user._id;

    const overview = {};

    for (const difficulty of difficulties) {
      const stories = storyRegistry[difficulty] ?? [];

      // Fetch all story progress docs for this user + difficulty at once
      const allStoryDocs = await StoryProgress.find({ userId, difficulty });
      const storyDocMap = Object.fromEntries(
        allStoryDocs.map((doc) => [doc.storyId, doc])
      );

      let totalCompleted = 0;
      let totalParts = 0;

      const storyOverviews = stories.map((meta) => {
        const doc = storyDocMap[meta.storyId];
        const completedParts = doc ? doc.completedParts : [];
        const currentPart = doc ? doc.currentPart : 1;

        totalCompleted += completedParts.length;
        totalParts += meta.totalParts;

        return {
          storyId: meta.storyId,
          storyName: meta.storyName,
          characterIcon: meta.characterIcon,
          totalParts: meta.totalParts,
          completedParts,
          currentPart,
        };
      });

      overview[difficulty] = {
        completed: totalCompleted,
        total: totalParts,
        stories: storyOverviews,
      };
    }

    res.json(overview);
  } catch (error) {
    console.error("Get overview error:", error);
    res.status(500).json({ message: "Server error" });
  }
}