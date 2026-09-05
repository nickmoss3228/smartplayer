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
import { adminLoginLimiter } from "../middleware/rateLimit.js";
import { asyncHandler } from "../helpers/asyncHandler.js";

const router = Router();

// asyncHandler on every handler below: unlike the story/feedback controllers,
// these have no internal try/catch, and Express 4 turns an async throw into a
// hung request rather than a 500.
// adminLoginLimiter is back on. It had been removed on request, which left one
// shared code word guessable at roughly 4000 attempts/hour/IP — the global
// apiLimiter (1000 per 15 min) was the only ceiling, and a hit grants the Story
// Builder, the ban button and currency granting.
//
// The budget was widened from 5 to 10 when restoring it, specifically so this
// does not get removed a second time: with skipSuccessfulRequests the only
// thing that burns quota is a wrong code, so 10 absorbs a run of typos while
// still leaving brute force nowhere to go.
router.post("/login", adminLoginLimiter, adminLogin);router.post("/grant-currency", adminAuth, asyncHandler(grantCurrency));
router.get("/players", adminAuth, asyncHandler(listPlayers));
router.patch("/players/:userId/ban", adminAuth, asyncHandler(setPlayerBanned));
router.get("/players/:userId/progress", adminAuth, asyncHandler(getPlayerProgress));
router.get("/audit", adminAuth, asyncHandler(listAuditLog));

export default router;