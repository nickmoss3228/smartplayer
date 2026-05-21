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
} from "../controllers/progress.controller.js";

const router = Router();

router.get("/progress/overview",                   authenticateToken, getOverview);
router.get("/progress/story/:difficulty/:storyId", authenticateToken, getStoryProgress);
router.get("/progress/achievements",               authenticateToken, getAchievements);
router.post("/progress/complete",                  authenticateToken, completeLevel);
router.patch("/progress/listening-time",           authenticateToken, syncListeningTime);
router.get("/progress/:difficulty",                authenticateToken, getProgress);

export default router;