import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  getProgress,
  completeLevel,
  getOverview,
} from "../controllers/progress.controller.js";

const router = Router();

router.post("/progress/complete", authenticateToken, completeLevel);
router.get("/progress/overview", authenticateToken, getOverview);
router.get("/progress/:difficulty", authenticateToken, getProgress);
// this parametric path piece of shit, as it turned out - we have to put these :fuckshit parametric paths at the end of the list of paths.

export default router;
