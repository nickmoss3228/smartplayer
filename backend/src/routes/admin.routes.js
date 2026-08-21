import { Router } from "express";
import {
  adminLogin,
  grantCurrency,
  listPlayers,
  setPlayerBanned,
  getPlayerProgress,
  listAuditLog,
} from "../controllers/admin.controller.js";
import { adminAuth } from "../middleware/adminAuth.js";
import { asyncHandler } from "../helpers/asyncHandler.js";

const router = Router();

// asyncHandler on every handler below: unlike the story/feedback controllers,
// these have no internal try/catch, and Express 4 turns an async throw into a
// hung request rather than a 500.
// Rate limiting deliberately removed from this route on request. The limiter
// itself still exists in middleware/rateLimit.js — re-add adminLoginLimiter
// here to restore it. See the note there about what this exposes.
router.post("/login", adminLogin);
router.post("/grant-currency", adminAuth, asyncHandler(grantCurrency));
router.get("/players", adminAuth, asyncHandler(listPlayers));
router.patch("/players/:userId/ban", adminAuth, asyncHandler(setPlayerBanned));
router.get("/players/:userId/progress", adminAuth, asyncHandler(getPlayerProgress));
router.get("/audit", adminAuth, asyncHandler(listAuditLog));

export default router;