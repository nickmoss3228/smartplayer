// controllers/progress.controller.js
import {
  db,
  progress as progressRepo,
  userDocs,
  users as usersRepo,
  wallet as walletRepo,
} from "../db/index.js";
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
import { partitionVocabKeys } from "../helpers/vocabKeyCatalog.js";
import { spendCurrency } from "../helpers/spendCurrency.js";
import { QUIZ_PASS_BITAWARD, PHRASE_REPEAT_BITPHRASE } from "../config/currency.js";
import { getShopItem } from "../config/shopCatalog.js";
import { getCharacterItem } from "../config/characterCatalog.js";
import {
  FLOOR_SLOTS,
  WALL_SLOTS,
  BACK_WALL_SLOTS,
  SIDE_WALL_SLOTS,
  clampFloorPlacement,
  clampWallPlacement,
  floorOverlaps,
  wallOverlaps,
} from "../config/roomLayout.js";
import { accessFor, isPartVisible, isPreviewPart } from "../config/entitlements.js";
import { getCatalog } from "../helpers/catalogStore.js";
import { config } from "../config/env.js";

const difficulties = ["easy", "medium", "hard"];

// GET /progress/:difficulty
export async function getProgress(req, res) {
  try {
    const { difficulty } = req.params;
    const userId = req.user._id;

    if (!difficulties.includes(difficulty))
      return res.status(400).json({ message: "Invalid difficulty level" });

    // Created on first read, as before.
    const progress = await progressRepo.ensure(userId, difficulty);

    res.json({
      completedLevels: progress.completedLevels,
      currentLevel: progress.currentLevel,
      levelResults: await progressRepo.levelResultsMap(progress.id),
      totalLevels: progress.completedLevels.length,
    });
  } catch (error) {
    console.error("Get progress error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

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

    const doc = await progressRepo.storyProgressFor(userId, difficulty, storyId);
    if (!doc) {
      // Return empty progress — don't create a row yet
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

/** The achievement tiers of a users row, in the shape the API returns. */
function achievementsOf(row) {
  return {
    listeningTime: row.achievementListeningTime,
    questionsAnswered: row.achievementQuestionsAnswered,
    studyStreak: row.achievementStudyStreak,
    storiesListened: row.achievementStoriesListened,
    wordsLearned: row.achievementWordsLearned,
  };
}

/**
 * Run `fn` in a transaction holding the user's row lock.
 *
 * Every shop handler below is read-check-write: "is this owned? no — charge,
 * then record it". Mongo ran those as separate writes, so two taps could both
 * pass the check and both be charged. Holding the row makes the second tap
 * wait for the first to commit, and then it sees the item as owned.
 *
 * `fn` returns { status, body }; the transaction commits either way, and a
 * refusal has simply written nothing.
 */
function withLockedUser(userId, fn) {
  return db().transaction(async (tx) => {
    const user = await userDocs.loadUser(userId, { lock: true }, tx);
    if (!user) return { status: 404, body: { message: "User not found" } };
    return fn(user, tx);
  });
}

/**
 * Shared gate for the two public quiz endpoints.
 *
 * These are the sibling leak to getPublishedStory: they take the same
 * (difficulty, storyId, partNumber) and hand back question text and a
 * right/wrong oracle for ANY part of ANY story, with no auth at all. Gating
 * the story endpoint while leaving these open would mean a locked part's quiz
 * still played — and, through completeLevel, still paid out BitAward.
 *
 * Returns null when the caller may proceed, or a {status, body} to send.
 */
async function refuseIfLocked(req, difficulty, storyId, partNumber) {
  const access = accessFor(req.user?.entitlements, difficulty, storyId, {
    authenticated: Boolean(req.user),
    catalog: await getCatalog(),
    paywallEnabled: config.payments.paywallEnabled,
  });
  // A preview part is audible for 30 seconds, which is not enough to be quizzed
  // on — and a pass would pay out BitAward for a part nobody has bought.
  if (isPartVisible(access, partNumber) && !isPreviewPart(access, partNumber)) return null;
  return {
    status: 403,
    body: {
      message: "This part has not been unlocked.",
      // Distinct from ACCOUNT_BANNED so the client shows a paywall rather than
      // signing the user out — services/apiClient.ts branches on `code`.
      code: "PART_LOCKED",
    },
  };
}

// ── GET /progress/quiz/:difficulty/:storyId/:partNumber ────────────────────
// Public, behind optionalAuth — serves quiz questions with `correctAnswer`
// stripped out, so the answer key never reaches the client. Guests need this
// too (they take quizzes before ever signing up), which is why it is not
// behind authenticateToken; but the caller is identified when possible so a
// locked part's quiz can be refused. See refuseIfLocked above.
export async function getQuiz(req, res) {
  try {
    const { difficulty, storyId, partNumber } = req.params;

    if (!difficulties.includes(difficulty))
      return res.status(400).json({ message: "Invalid difficulty level" });

    const storyMeta = await getStoryMeta(difficulty, storyId);
    if (!storyMeta)
      return res.status(400).json({ message: "Unknown storyId for this difficulty" });

    const refusal = await refuseIfLocked(req, difficulty, storyId, partNumber);
    if (refusal) return res.status(refusal.status).json(refusal.body);

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
// Public behind optionalAuth, same reasoning as getQuiz above. This only ever answers
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

    const refusal = await refuseIfLocked(req, difficulty, storyId, partNumber);
    if (refusal) return res.status(refusal.status).json(refusal.body);

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

    // The part number lands in integer columns and an array of integers, where
    // "2" or 2.5 would be a query error rather than a 400.
    if (!Number.isInteger(partNumber) || partNumber < 1)
      return res.status(400).json({ message: "Missing required fields" });

    const storyMeta = await getStoryMeta(difficulty, storyId);
    if (!storyMeta)
      return res.status(400).json({ message: "Unknown storyId for this difficulty" });

    // Completing a part marks progress AND mints BitAward, so it has to honour
    // the paywall too. Without this, the quiz endpoints could be locked down
    // and a direct POST here would still pay out for a part the user never
    // unlocked — the answer key is fetched server-side, so it does not even
    // need the quiz endpoints to succeed first.
    const refusal = await refuseIfLocked(req, difficulty, storyId, partNumber);
    if (refusal) return res.status(refusal.status).json(refusal.body);

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
    let wallet = null;
    if (isCompleted) {
      const user = await usersRepo.findById(userId);
      const today = todayUTC();
      const yesterday = yesterdayUTC();
      const last = user.streakLastSubmittedDate;

      let current = user.streakCurrent ?? 0;
      let longest = user.streakLongest ?? 0;

      if (last === today) {
        // Already counted today — no change
      } else if (last === yesterday) {
        // Consecutive day
        current += 1;
      } else {
        // Streak broken or first ever
        current = 1;
      }

      longest = Math.max(longest, current);

      await usersRepo.update(userId, {
        streakCurrent: current,
        streakLongest: longest,
        streakLastSubmittedDate: today,
      });

      // ── Achievement check ───────────────────────────────────────────────
      const [questionsAnswered, uniqueStoriesCount] = await Promise.all([
        progressRepo.questionsAnsweredTotal(userId),
        progressRepo.uniqueCompletedStoriesCount(userId),
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
// partNumber: a guest could only ever have taken the quiz on parts the
// paywall gives away in full (see accessFor in config/entitlements.js).

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

      const guestAccess = accessFor(null, difficulty, storyId, {
        authenticated: false,
        catalog: await getCatalog(),
      });

      for (const r of results) {
        const { partNumber, correctAnswers, totalQuestions } = r ?? {};
        const isValid =
          Number.isInteger(partNumber) &&
          partNumber >= 1 &&
          isPartVisible(guestAccess, partNumber) &&
          !isPreviewPart(guestAccess, partNumber) &&
          partNumber <= storyMeta.totalParts &&
          Number.isInteger(correctAnswers) &&
          Number.isInteger(totalQuestions) &&
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

    if (learnedWords && learnedWords.length > 0) {
      await progressRepo.addLearnedWords(userId, learnedWords);
    }

    const [user, wordsLearned, questionsAnswered, uniqueStoriesCount] = await Promise.all([
      usersRepo.findById(userId),
      progressRepo.learnedWordCount(userId),
      progressRepo.questionsAnsweredTotal(userId),
      progressRepo.uniqueCompletedStoriesCount(userId),
    ]);

    await updateAchievements(userId, {
      listeningSeconds: user?.totalListeningSeconds ?? 0,
      questionsAnswered,
      currentStreak: user?.streakCurrent ?? 0,
      uniqueStoriesCount,
      wordsLearned,
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

    if (typeof totalSeconds !== "number" || !Number.isFinite(totalSeconds) || totalSeconds < 0)
      return res.status(400).json({ message: "Invalid totalSeconds value" });

    const before = await usersRepo.findById(userId);
    if (!before) return res.status(404).json({ message: "User not found" });

    if (Math.floor(totalSeconds) <= (before.totalListeningSeconds ?? 0)) {
      // Nothing to update, but still return current value so frontend is in sync
      return res.json({ totalListeningSeconds: before.totalListeningSeconds });
    }

    // Only ever increases — enforced inside the UPDATE, not by the check above.
    const stored = await usersRepo.raiseListeningSeconds(userId, totalSeconds);

    // Check listening achievement with updated value
    const [questionsAnswered, uniqueStoriesCount] = await Promise.all([
      progressRepo.questionsAnsweredTotal(userId),
      progressRepo.uniqueCompletedStoriesCount(userId),
    ]);

    await updateAchievements(userId, {
      listeningSeconds: stored ?? 0,
      questionsAnswered,
      currentStreak: before.streakCurrent ?? 0,
      uniqueStoriesCount,
    });

    res.json({ totalListeningSeconds: stored });
  } catch (error) {
    console.error("Sync listening time error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// ── GET /api/user/achievements ─────────────────────────────────────────────

export async function getAchievements(req, res) {
  try {
    const userId = req.user._id;

    const [user, wordsLearned, questionsAnswered, uniqueStoriesCount] = await Promise.all([
      usersRepo.findById(userId),
      progressRepo.learnedWordCount(userId),
      progressRepo.questionsAnsweredTotal(userId),
      progressRepo.uniqueCompletedStoriesCount(userId),
    ]);

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      achievements: achievementsOf(user),
      stats: {
        listeningSeconds:  user.totalListeningSeconds ?? 0,
        questionsAnswered,
        currentStreak:     user.streakCurrent ?? 0,
        longestStreak:     user.streakLongest ?? 0,
        uniqueStoriesCount,
        wordsLearned,
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
    res.json({ learnedWords: await progressRepo.learnedWords(req.user._id) });
  } catch (error) {
    console.error("Get learned words error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// ── POST /progress/vocab-complete ───────────────────────────────────────────
// Called when a VocabQuiz round finishes; merges the newly-correct word keys
// into the student's permanent learned-words set (no duplicates, no loss on
// retries) and recomputes the "Words Learned" achievement tier.

// A vocab round is a handful of words; the largest legitimate deck in the app
// is well under this. The cap exists so one request cannot carry a dictionary.
const MAX_WORDS_PER_SUBMISSION = 60;
// Longest real key is a short phrase ("a lot of friends"). Anything past this
// is not a vocabulary key.
const MAX_WORD_LENGTH = 80;

export async function completeVocabQuiz(req, res) {
  try {
    const { words } = req.body;
    const userId = req.user._id;

    if (
      !Array.isArray(words) ||
      words.length === 0 ||
      words.length > MAX_WORDS_PER_SUBMISSION ||
      !words.every((w) => typeof w === "string" && w.length <= MAX_WORD_LENGTH)
    ) {
      return res.status(400).json({
        message: `words must be a non-empty array of at most ${MAX_WORDS_PER_SUBMISSION} strings`,
      });
    }

    // Normalise to the shape the player reports and the catalogue stores:
    // lowercased, trimmed, no duplicates. De-duplicating here also means a body
    // repeating one word 60 times can't be counted 60 times.
    const submitted = [...new Set(words.map((w) => w.toLowerCase().trim()).filter(Boolean))];
    if (submitted.length === 0) {
      return res.status(400).json({ message: "words must contain a real value" });
    }

    // THE check this endpoint was missing. Without it every string in the body
    // minted a BitWord and counted toward the wordsLearned achievement, so a
    // few thousand invented words bought a maxed achievement and a full wallet
    // in one request. Unknown words are dropped rather than 400'd: a rejection
    // would turn this into an oracle for probing the catalogue, and a student
    // must not lose a whole round because one key drifted.
    const { known, unknown } = await partitionVocabKeys(submitted);

    if (unknown.length > 0) {
      // Loud on purpose. In normal use this should never fire, so if it starts
      // appearing it means either abuse or — more likely — that
      // config/vocabKeys.js is stale after a Vocabulary.ts edit and real
      // students are silently not being credited. Regenerate it:
      // `node scripts/generate-vocab-keys.mjs`.
      console.warn(
        `[vocab] user=${userId} ignored ${unknown.length} unknown key(s):`,
        unknown.slice(0, 10)
      );
    }

    if (known.length === 0) {
      const [learnedWords, wallet] = await Promise.all([
        progressRepo.learnedWords(userId),
        walletRepo.get(userId),
      ]);
      return res.json({ learnedWords, wallet });
    }

    // The merge and the payout are one transaction, and the payout is sized by
    // what the INSERT actually added — not by a snapshot diffed in JavaScript.
    // The Mongo version read the set, counted "new" words, then $addToSet-ed,
    // so two racing submissions both counted the same word as new and it was
    // paid for twice. ON CONFLICT DO NOTHING RETURNING cannot be fooled that way.
    const wallet = await db().transaction(async (tx) => {
      const added = await progressRepo.addLearnedWords(userId, known, tx);
      // awardCurrency returns null for a zero award, which is what a re-sent
      // round of already-learned words produces. The response still owes the
      // client its balance, as the known.length === 0 branch above gives it.
      return (
        (await awardCurrency(userId, { bitWord: added.length }, tx)) ??
        walletRepo.get(userId, tx)
      );
    });

    const learnedWords = await progressRepo.learnedWords(userId);
    await updateAchievements(userId, { wordsLearned: learnedWords.length });

    res.json({ learnedWords, wallet });
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
      : await walletRepo.get(userId);

    res.json({ wallet });
  } catch (error) {
    console.error("Record phrase repeat error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// ── GET /progress/wallet ─────────────────────────────────────────────────────

export async function getWallet(req, res) {
  try {
    const wallet = await walletRepo.get(req.user._id);
    if (!wallet) return res.status(404).json({ message: "User not found" });
    res.json({ wallet });
  } catch (error) {
    console.error("Get wallet error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /progress/room
export async function getRoom(req, res) {
  try {
    const user = await userDocs.loadUser(req.user._id);
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
    const user = await userDocs.loadUser(req.params.userId);
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

    const { status, body } = await withLockedUser(userId, async (user, tx) => {
      if (user.room.ownedItemIds.includes(itemId)) {
        return { status: 400, body: { message: "Item already owned" } };
      }

      const wallet = await spendCurrency(userId, item.priceBitAward, tx);
      if (!wallet) {
        return { status: 400, body: { message: "Insufficient BitAward balance" } };
      }

      user.room = {
        ...user.room,
        ownedItemIds: [...user.room.ownedItemIds, itemId],
        placedItems: { ...user.room.placedItems, [item.slot]: itemId },
      };
      await user.save(tx);

      return { status: 200, body: { room: user.room, bitAward: wallet.bitAward } };
    });

    res.status(status).json(body);
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

    const { status, body } = await withLockedUser(userId, async (user, tx) => {
      if (!user.room.ownedItemIds.includes(itemId)) {
        return { status: 400, body: { message: "Item not owned" } };
      }
      user.room = { ...user.room, placedItems: { ...user.room.placedItems, [item.slot]: itemId } };
      await user.save(tx);
      return { status: 200, body: { room: user.room } };
    });

    res.status(status).json(body);
  } catch (error) {
    console.error("Equip item error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// PATCH /progress/room/lights — flips the room's lights on/off. Free
// preference toggle, not a purchase, so no currency/ownership check. Under the
// row lock, two quick taps flip twice rather than both reading "on".
export async function toggleRoomLights(req, res) {
  try {
    const { status, body } = await withLockedUser(req.user._id, async (user, tx) => {
      user.room = { ...user.room, lightsOn: !user.room.lightsOn };
      await user.save(tx);
      return { status: 200, body: { room: user.room } };
    });

    res.status(status).json(body);
  } catch (error) {
    console.error("Toggle room lights error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// PATCH /progress/room/placement — "arrange mode". Floor items send
// { slot, x, z, rotation }; wall items (fixed to their wall, only slide
// along it) send { slot, along, height }. Re-validates bounds/overlap
// server-side (see config/roomLayout.js) even though the client already
// checks the same rules live while dragging — defense in depth, not a
// trust boundary that matters much for cosmetic data, but cheap to keep.
export async function updateRoomPlacement(req, res) {
  try {
    const userId = req.user._id;
    const { slot } = req.body;

    const isFloor = FLOOR_SLOTS.includes(slot);
    const isWall = WALL_SLOTS.includes(slot);
    if (!isFloor && !isWall) {
      return res.status(400).json({ message: "This item can't be repositioned." });
    }

    const { status, body } = await withLockedUser(userId, async (user, tx) => {
      if (!user.room.placedItems[slot]) {
        return { status: 400, body: { message: "Nothing is placed in this slot." } };
      }

      let placement;

      if (isFloor) {
        const { x, z, rotation } = req.body;
        if (typeof x !== "number" || typeof z !== "number") {
          return { status: 400, body: { message: "Invalid placement." } };
        }
        placement = clampFloorPlacement(slot, x, z, rotation);
        const occupied = FLOOR_SLOTS
          .filter((s) => s !== slot && user.room.placedItems[s])
          .map((s) => ({ slot: s, placement: user.room.placement[s] }));
        if (floorOverlaps(slot, placement, occupied)) {
          return { status: 409, body: { message: "That spot overlaps another item." } };
        }
      } else {
        const { along, height } = req.body;
        if (typeof along !== "number" || typeof height !== "number") {
          return { status: 400, body: { message: "Invalid placement." } };
        }
        placement = clampWallPlacement(slot, along, height);
        const wallGroup = BACK_WALL_SLOTS.includes(slot) ? BACK_WALL_SLOTS : SIDE_WALL_SLOTS;
        const occupied = wallGroup
          .filter((s) => s !== slot && user.room.placedItems[s])
          .map((s) => ({ slot: s, placement: user.room.placement[s] }));
        if (wallOverlaps(slot, placement, occupied)) {
          return { status: 409, body: { message: "That spot overlaps another item." } };
        }
      }

      user.room = { ...user.room, placement: { ...user.room.placement, [slot]: placement } };
      await user.save(tx);
      return { status: 200, body: { room: user.room } };
    });

    res.status(status).json(body);
  } catch (error) {
    console.error("Update room placement error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// ── Character customization — sibling to the room shop above, same pattern,
// separate catalog (see config/characterCatalog.js, user.character). ──

// GET /progress/character
export async function getCharacter(req, res) {
  try {
    const user = await userDocs.loadUser(req.user._id);
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

    const { status, body } = await withLockedUser(userId, async (user, tx) => {
      if (user.character.ownedItemIds.includes(itemId)) {
        return { status: 400, body: { message: "Item already owned" } };
      }

      const wallet = await spendCurrency(userId, item.priceBitAward, tx);
      if (!wallet) {
        return { status: 400, body: { message: "Insufficient BitAward balance" } };
      }

      user.character = {
        ...user.character,
        ownedItemIds: [...user.character.ownedItemIds, itemId],
        equipped: { ...user.character.equipped, [item.slot]: itemId },
      };
      await user.save(tx);

      return { status: 200, body: { character: user.character, bitAward: wallet.bitAward } };
    });

    res.status(status).json(body);
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

    const { status, body } = await withLockedUser(userId, async (user, tx) => {
      if (!user.character.ownedItemIds.includes(itemId)) {
        return { status: 400, body: { message: "Item not owned" } };
      }
      user.character = {
        ...user.character,
        equipped: { ...user.character.equipped, [item.slot]: itemId },
      };
      await user.save(tx);
      return { status: 200, body: { character: user.character } };
    });

    res.status(status).json(body);
  } catch (error) {
    console.error("Equip character item error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// PATCH /progress/character/skin-tone  { skinTone }
// Free personalization (identity, not a purchasable cosmetic) — no currency involved.
export async function setSkinTone(req, res) {
  try {
    const { skinTone } = req.body;

    if (typeof skinTone !== "string" || !/^#[0-9a-fA-F]{6}$/.test(skinTone)) {
      return res.status(400).json({ message: "skinTone must be a hex color string" });
    }

    await usersRepo.update(req.user._id, { characterSkinTone: skinTone });
    const user = await userDocs.loadUser(req.user._id);
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

    // One read for every difficulty, rather than one per difficulty.
    const allStoryDocs = await progressRepo.allStoryProgressFor(userId);

    const overview = {};

    for (const difficulty of difficulties) {
      const stories = await getAllStoryMeta(difficulty);

      const storyDocMap = Object.fromEntries(
        allStoryDocs
          .filter((doc) => doc.difficulty === difficulty)
          .map((doc) => [doc.storyId, doc])
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
