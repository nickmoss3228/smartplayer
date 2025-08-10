import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  getProgress,
  completeLevel,
  getOverview,
} from "../controllers/progress.controller.js";

const router = Router();

router.get("/progress/:difficulty", authenticateToken, getProgress);
router.post("/progress/complete", authenticateToken, completeLevel);
router.get("/progress/overview", authenticateToken, getOverview);

export default router;
