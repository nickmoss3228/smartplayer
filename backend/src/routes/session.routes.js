import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import { evictLimiter } from "../middleware/rateLimit.js";
import { asyncHandler } from "../helpers/asyncHandler.js";
import {
  listSessions,
  revokeSession,
  evictSession,
  revokeOtherSessions,
} from "../controllers/session.controller.js";

const router = Router();

// asyncHandler on all four: like admin.controller.js, these have no internal
// try/catch, and Express 4 turns an async throw into a hung request.

// Unauthenticated by design — reached only from a 409 DEVICE_LIMIT_REACHED,
// where the caller has proved their password but holds no token. The ticket in
// the body is the authorization, and the limiter is here because this is the
// one route in this file an anonymous caller can reach at all.
router.post("/evict", evictLimiter, asyncHandler(evictSession));

router.get("/", authenticateToken, asyncHandler(listSessions));
router.post("/revoke-others", authenticateToken, asyncHandler(revokeOtherSessions));
// The wildcard is scoped to DELETE, so it cannot swallow the POST routes
// above. Keep it last anyway — if a literal DELETE path is ever added here,
// declaring it after this line would silently make it unreachable.
router.delete("/:deviceId", authenticateToken, asyncHandler(revokeSession));

export default router;
