// routes/progress.routes.js
import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import { publicQuizLimiter } from "../middleware/rateLimit.js";
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
  getPlayerRoom,
  purchaseItem,
  equipItem,
  toggleRoomLights,
  updateRoomPlacement,
  getQuiz,
  checkQuizAnswer,
  getCharacter,
  purchaseCharacterItem,
  equipCharacterItem,
  setSkinTone,
} from "../controllers/progress.controller.js";

const router = Router();

// Public — no auth. Guests take quizzes before ever signing up, and these
// never expose the answer key (see controller comments).
router.get("/progress/quiz/:difficulty/:storyId/:partNumber",              publicQuizLimiter, getQuiz);
router.post("/progress/quiz/:difficulty/:storyId/:partNumber/check-answer", publicQuizLimiter, checkQuizAnswer);

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
router.get("/progress/room/:userId",               authenticateToken, getPlayerRoom);
router.post("/progress/room/purchase",             authenticateToken, purchaseItem);
router.post("/progress/room/equip",                authenticateToken, equipItem);
router.patch("/progress/room/lights",               authenticateToken, toggleRoomLights);
router.patch("/progress/room/placement",             authenticateToken, updateRoomPlacement);
router.get("/progress/character",                  authenticateToken, getCharacter);
router.post("/progress/character/purchase",        authenticateToken, purchaseCharacterItem);
router.post("/progress/character/equip",           authenticateToken, equipCharacterItem);
router.patch("/progress/character/skin-tone",      authenticateToken, setSkinTone);
router.get("/progress/:difficulty",                authenticateToken, getProgress);

export default router;