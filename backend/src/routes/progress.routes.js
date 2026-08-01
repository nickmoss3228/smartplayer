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
} from "../controllers/progress.controller.js";

const router = Router();

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
router.get("/progress/:difficulty",                authenticateToken, getProgress);

export default router;