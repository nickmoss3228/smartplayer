// controllers/progress.controller.js
import { Progress } from "../models/Progress.js";
import { StoryProgress } from "../models/StoryProgress.js";
import { updateAchievements } from "../helpers/updateAchievements.js";
import { applyLevelCompletion } from "../helpers/applyLevelCompletion.js";
import {
  getStoryMeta,
  getAllStoryMeta,
  getPublicQuizAsync,
  getQuizAnswerKeyAsync,
  scoreQuizSubmissionAsync,
} from "../helpers/storyLookup.js";
import { awardCurrency } from "../helpers/awardCurrency.js";
import { spendCurrency } from "../helpers/spendCurrency.js";
import { QUIZ_PASS_BITAWARD, PHRASE_REPEAT_BITPHRASE } from "../config/currency.js";
import { getShopItem } from "../config/shopCatalog.js";
import { getCharacterItem } from "../config/characterCatalog.js";
import { FREE_TRIAL_STORIES } from "../config/trial.js";
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

    const storyMeta = await getStoryMeta(difficulty, storyId);
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

// ── GET /progress/quiz/:difficulty/:storyId/:partNumber ────────────────────
// Public (no auth) — serves quiz questions with `correctAnswer` stripped out,
// so the answer key never reaches the client. Guests need this too (they take
// quizzes before ever signing up), which is why this isn't behind auth.
export async function getQuiz(req, res) {
  try {
    const { difficulty, storyId, partNumber } = req.params;

    if (!difficulties.includes(difficulty))
      return res.status(400).json({ message: "Invalid difficulty level" });

    const storyMeta = await getStoryMeta(difficulty, storyId);
    if (!storyMeta)
      return res.status(400).json({ message: "Unknown storyId for this difficulty" });

    const questions = await getPublicQuizAsync(difficulty, storyId, partNumber);
    if (!questions)
      return res.status(404).json({ message: "No quiz available for this part" });

    res.json({ questions });
  } catch (error) {
    console.error("Get quiz error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// ── POST /progress/quiz/:difficulty/:storyId/:partNumber/check-answer ──────
// Public (no auth), same reasoning as getQuiz above. This only ever answers
// "was that one option right or wrong" — it never reveals the full answer
// key, and it doesn't touch progress/rewards on its own. The authoritative,
// reward-granting grading still happens in completeLevel below, which
// re-scores the whole submission server-side regardless of what this
// endpoint said during the quiz.
export async function checkQuizAnswer(req, res) {
  try {
    const { difficulty, storyId, partNumber } = req.params;
    const { questionIndex, selectedOption } = req.body;

    if (!difficulties.includes(difficulty))
      return res.status(400).json({ message: "Invalid difficulty level" });

    if (typeof questionIndex !== "number" || typeof selectedOption !== "number")
      return res.status(400).json({ message: "Missing required fields" });

    const answerKey = await getQuizAnswerKeyAsync(difficulty, storyId, partNumber);
    if (!answerKey || questionIndex < 0 || questionIndex >= answerKey.length)
      return res.status(400).json({ message: "Invalid question for this part" });

    res.json({ correct: selectedOption === answerKey[questionIndex] });
  } catch (error) {
    console.error("Check quiz answer error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// ── POST /progress/complete ────────────────────────────────────────────────

export async function completeLevel(req, res) {
  try {
    const { difficulty, storyId, partNumber, answers } = req.body;
    const userId = req.user._id;

    if (!difficulties.includes(difficulty))
      return res.status(400).json({ message: "Invalid difficulty level" });

    if (!storyId || partNumber === undefined || !Array.isArray(answers))
      return res.status(400).json({ message: "Missing required fields" });

    const storyMeta = await getStoryMeta(difficulty, storyId);
    if (!storyMeta)
      return res.status(400).json({ message: "Unknown storyId for this difficulty" });

    // Grade against the server-held answer key — never trust a client-reported
    // score, since a direct API call could otherwise forge a passing result.
    const scored = await scoreQuizSubmissionAsync(difficulty, storyId, partNumber, answers);
    if (!scored)
      return res.status(400).json({ message: "Invalid quiz submission for this part" });
    const { correctAnswers, totalQuestions } = scored;

    const { isCompleted, storyProgress } = await applyLevelCompletion({
      userId,
      difficulty,
      storyId,
      partNumber,
      correctAnswers,
      totalQuestions,
      storyMeta,
    });

    // ── Streak update (only on completed submissions) ─────────────────────
    let newStreak = 0;
    let wallet = null;
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

      // ── BitAward: flat payout for passing the quiz ───────────────────────
      wallet = await awardCurrency(userId, { bitAward: QUIZ_PASS_BITAWARD });
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
      wallet,
    });
  } catch (error) {
    console.error("Complete level error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// ── POST /progress/migrate-guest ───────────────────────────────────────────
// Folds a guest's locally-saved trial-level progress (from before they had
// an account) into their freshly created/logged-in account. Never trusts
// the client's claims blindly — every entry is re-validated the same way a
// real-time /progress/complete submission would be, plus a hard bound on
// partNumber, since a guest could only ever have legitimately unlocked
// levels 1..FREE_TRIAL_STORIES.

export async function migrateGuestProgress(req, res) {
  try {
    const { stories, learnedWords } = req.body;
    const userId = req.user._id;

    if (stories !== undefined && !Array.isArray(stories))
      return res.status(400).json({ message: "stories must be an array" });
    if (
      learnedWords !== undefined &&
      (!Array.isArray(learnedWords) || !learnedWords.every((w) => typeof w === "string"))
    )
      return res.status(400).json({ message: "learnedWords must be an array of strings" });

    for (const entry of stories ?? []) {
      const { difficulty, storyId, results } = entry ?? {};
      if (!difficulties.includes(difficulty)) continue;

      const storyMeta = await getStoryMeta(difficulty, storyId);
      if (!storyMeta) continue;
      if (!Array.isArray(results)) continue;

      for (const r of results) {
        const { partNumber, correctAnswers, totalQuestions } = r ?? {};
        const isValid =
          typeof partNumber === "number" &&
          partNumber >= 1 &&
          partNumber <= FREE_TRIAL_STORIES &&
          partNumber <= storyMeta.totalParts &&
          typeof correctAnswers === "number" &&
          typeof totalQuestions === "number" &&
          totalQuestions > 0 &&
          correctAnswers >= 0 &&
          correctAnswers <= totalQuestions;

        if (!isValid) continue; // skip anything out of trial bounds or malformed

        await applyLevelCompletion({
          userId,
          difficulty,
          storyId,
          partNumber,
          correctAnswers,
          totalQuestions,
          storyMeta,
        });
      }
    }

    let updatedUser;
    if (learnedWords && learnedWords.length > 0) {
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { $addToSet: { learnedWords: { $each: learnedWords } } },
        { new: true, select: "learnedWords totalListeningSeconds streak" }
      );
    } else {
      updatedUser = await User.findById(userId).select(
        "learnedWords totalListeningSeconds streak"
      );
    }

    const [questionsAnswered, uniqueStoriesCount] = await Promise.all([
      countCompletedQuestions(userId),
      countUniqueCompletedStories(userId),
    ]);

    await updateAchievements(userId, {
      listeningSeconds: updatedUser?.totalListeningSeconds ?? 0,
      questionsAnswered,
      currentStreak: updatedUser?.streak?.current ?? 0,
      uniqueStoriesCount,
      wordsLearned: updatedUser?.learnedWords?.length ?? 0,
    });

    res.json({ migrated: true });
  } catch (error) {
    console.error("Migrate guest progress error:", error);
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
        "achievements streak totalListeningSeconds learnedWords"
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
        wordsLearned:      user.learnedWords?.length ?? 0,
      },
    });
  } catch (error) {
    console.error("Get achievements error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// ── GET /progress/vocab-learned ─────────────────────────────────────────────
// Returns every vocab word key the student has ever correctly identified, so
// the Player can pre-color already-learned words on load.

export async function getLearnedWords(req, res) {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select("learnedWords");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ learnedWords: user.learnedWords ?? [] });
  } catch (error) {
    console.error("Get learned words error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// ── POST /progress/vocab-complete ───────────────────────────────────────────
// Called when a VocabQuiz round finishes; merges the newly-correct word keys
// into the student's permanent learned-words set (no duplicates, no loss on
// retries) and recomputes the "Words Learned" achievement tier.

export async function completeVocabQuiz(req, res) {
  try {
    const { words } = req.body;
    const userId = req.user._id;

    if (
      !Array.isArray(words) ||
      words.length === 0 ||
      !words.every((w) => typeof w === "string")
    ) {
      return res
        .status(400)
        .json({ message: "words must be a non-empty array of strings" });
    }

    // Snapshot before the merge so we can tell which words are genuinely new —
    // $addToSet silently no-ops on repeats, so it can't tell us the diff itself,
    // and re-answering already-learned words must not mint more BitWord.
    const existingUser = await User.findById(userId).select("learnedWords");
    if (!existingUser) return res.status(404).json({ message: "User not found" });
    const alreadyLearned = new Set(existingUser.learnedWords ?? []);
    const newlyLearnedCount = words.filter((w) => !alreadyLearned.has(w)).length;

    const user = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { learnedWords: { $each: words } } },
      { new: true, select: "learnedWords" }
    );

    await updateAchievements(userId, { wordsLearned: user.learnedWords.length });

    const wallet = await awardCurrency(userId, { bitWord: newlyLearnedCount });

    res.json({ learnedWords: user.learnedWords, wallet });
  } catch (error) {
    console.error("Complete vocab quiz error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// ── POST /progress/phrase-repeat ────────────────────────────────────────────
// Called when a marker-to-marker segment finishes its full auto-repeat cycle
// in Enhanced mode. Coins are keyed by which repeat-count setting (1x/2x/3x)
// was active for that cycle — 1x mints nothing since nothing was repeated,
// and staying in Free (non-enhanced) mode never fires this at all.

export async function recordPhraseRepeat(req, res) {
  try {
    const { repeatCount } = req.body;
    const userId = req.user._id;

    if (![1, 2, 3].includes(repeatCount)) {
      return res.status(400).json({ message: "repeatCount must be 1, 2, or 3" });
    }

    const bitPhrase = PHRASE_REPEAT_BITPHRASE[repeatCount] ?? 0;
    const wallet = bitPhrase > 0
      ? await awardCurrency(userId, { bitPhrase })
      : (await User.findById(userId).select("wallet"))?.wallet ?? null;

    res.json({ wallet });
  } catch (error) {
    console.error("Record phrase repeat error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// ── GET /progress/wallet ─────────────────────────────────────────────────────

export async function getWallet(req, res) {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select("wallet");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ wallet: user.wallet });
  } catch (error) {
    console.error("Get wallet error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /progress/room
export async function getRoom(req, res) {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select("room wallet.bitAward");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ room: user.room, bitAward: user.wallet.bitAward });
  } catch (error) {
    console.error("Get room error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /progress/room/:userId — read-only snapshot of another player's room
// for the multiplayer "visit" view. No bitAward/ownedItemIds exposure since
// only placedItems/character.equipped is needed to render RoomScene, plus
// identity for the header (portrait is derived client-side from `character`).
export async function getPlayerRoom(req, res) {
  try {
    const user = await User.findById(req.params.userId).select(
      "username nickname room character"
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({
      username: user.username,
      nickname: user.nickname ?? user.username,
      room: user.room,
      character: user.character,
    });
  } catch (error) {
    console.error("Get player room error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// POST /progress/room/purchase  { itemId }
export async function purchaseItem(req, res) {
  try {
    const userId = req.user._id;
    const { itemId } = req.body;

    const item = getShopItem(itemId);
    if (!item) return res.status(400).json({ message: "Unknown item" });

    const existing = await User.findById(userId).select("room");
    if (!existing) return res.status(404).json({ message: "User not found" });
    if (existing.room.ownedItemIds.includes(itemId)) {
      return res.status(400).json({ message: "Item already owned" });
    }

    const wallet = await spendCurrency(userId, item.priceBitAward);
    if (!wallet) {
      return res.status(400).json({ message: "Insufficient BitAward balance" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $addToSet: { "room.ownedItemIds": itemId },
        $set: { [`room.placedItems.${item.slot}`]: itemId },
      },
      { new: true, select: "room" },
    );

    res.json({ room: user.room, bitAward: wallet.bitAward });
  } catch (error) {
    console.error("Purchase item error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// POST /progress/room/equip  { itemId }
// Re-selects an already-owned item into its slot — no currency involved,
// unlike purchaseItem. This is how a player switches back to something they
// bought earlier instead of whatever is currently placed.
export async function equipItem(req, res) {
  try {
    const userId = req.user._id;
    const { itemId } = req.body;

    const item = getShopItem(itemId);
    if (!item) return res.status(400).json({ message: "Unknown item" });

    const existing = await User.findById(userId).select("room");
    if (!existing) return res.status(404).json({ message: "User not found" });
    if (!existing.room.ownedItemIds.includes(itemId)) {
      return res.status(400).json({ message: "Item not owned" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { [`room.placedItems.${item.slot}`]: itemId } },
      { new: true, select: "room" },
    );

    res.json({ room: user.room });
  } catch (error) {
    console.error("Equip item error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// ── Character customization — sibling to the room shop above, same pattern,
// separate catalog/doc path (see config/characterCatalog.js, User.character). ──

// GET /progress/character
export async function getCharacter(req, res) {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select("character wallet.bitAward");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ character: user.character, bitAward: user.wallet.bitAward });
  } catch (error) {
    console.error("Get character error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// POST /progress/character/purchase  { itemId }
export async function purchaseCharacterItem(req, res) {
  try {
    const userId = req.user._id;
    const { itemId } = req.body;

    const item = getCharacterItem(itemId);
    if (!item) return res.status(400).json({ message: "Unknown item" });

    const existing = await User.findById(userId).select("character");
    if (!existing) return res.status(404).json({ message: "User not found" });
    if (existing.character.ownedItemIds.includes(itemId)) {
      return res.status(400).json({ message: "Item already owned" });
    }

    const wallet = await spendCurrency(userId, item.priceBitAward);
    if (!wallet) {
      return res.status(400).json({ message: "Insufficient BitAward balance" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $addToSet: { "character.ownedItemIds": itemId },
        $set: { [`character.equipped.${item.slot}`]: itemId },
      },
      { new: true, select: "character" },
    );

    res.json({ character: user.character, bitAward: wallet.bitAward });
  } catch (error) {
    console.error("Purchase character item error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// POST /progress/character/equip  { itemId }
export async function equipCharacterItem(req, res) {
  try {
    const userId = req.user._id;
    const { itemId } = req.body;

    const item = getCharacterItem(itemId);
    if (!item) return res.status(400).json({ message: "Unknown item" });

    const existing = await User.findById(userId).select("character");
    if (!existing) return res.status(404).json({ message: "User not found" });
    if (!existing.character.ownedItemIds.includes(itemId)) {
      return res.status(400).json({ message: "Item not owned" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { [`character.equipped.${item.slot}`]: itemId } },
      { new: true, select: "character" },
    );

    res.json({ character: user.character });
  } catch (error) {
    console.error("Equip character item error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// PATCH /progress/character/skin-tone  { skinTone }
// Free personalization (identity, not a purchasable cosmetic) — no currency involved.
export async function setSkinTone(req, res) {
  try {
    const userId = req.user._id;
    const { skinTone } = req.body;

    if (typeof skinTone !== "string" || !/^#[0-9a-fA-F]{6}$/.test(skinTone)) {
      return res.status(400).json({ message: "skinTone must be a hex color string" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { "character.skinTone": skinTone } },
      { new: true, select: "character" },
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ character: user.character });
  } catch (error) {
    console.error("Set skin tone error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /progress/overview
export async function getOverview(req, res) {
  try {
    const userId = req.user._id;

    const overview = {};

    for (const difficulty of difficulties) {
      const stories = await getAllStoryMeta(difficulty);

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