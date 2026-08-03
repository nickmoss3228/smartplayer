// routes/progress.routes.js
import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  getProgress,
  completeLevel,
  getOverview,
  getStoryProgress,
  syncListeningTime,
  getAchievements,
  getLearnedWords,
  completeVocabQuiz,
  migrateGuestProgress,
  getWallet,
  recordPhraseRepeat,
  getRoom,
  purchaseItem,
  equipItem,
  getQuiz,
  checkQuizAnswer,
} from "../controllers/progress.controller.js";

const router = Router();

// Public — no auth. Guests take quizzes before ever signing up, and these
// never expose the answer key (see controller comments).
router.get("/progress/quiz/:difficulty/:storyId/:partNumber",              getQuiz);
router.post("/progress/quiz/:difficulty/:storyId/:partNumber/check-answer", checkQuizAnswer);

router.get("/progress/overview",                   authenticateToken, getOverview);
router.get("/progress/story/:difficulty/:storyId", authenticateToken, getStoryProgress);
router.get("/progress/achievements",               authenticateToken, getAchievements);
router.get("/progress/vocab-learned",              authenticateToken, getLearnedWords);
router.post("/progress/vocab-complete",            authenticateToken, completeVocabQuiz);
router.post("/progress/complete",                  authenticateToken, completeLevel);
router.post("/progress/migrate-guest",             authenticateToken, migrateGuestProgress);
router.patch("/progress/listening-time",           authenticateToken, syncListeningTime);
router.get("/progress/wallet",                     authenticateToken, getWallet);
router.post("/progress/phrase-repeat",             authenticateToken, recordPhraseRepeat);
router.get("/progress/room",                       authenticateToken, getRoom);
router.post("/progress/room/purchase",             authenticateToken, purchaseItem);
router.post("/progress/room/equip",                authenticateToken, equipItem);
router.get("/progress/:difficulty",                authenticateToken, getProgress);

export default router;