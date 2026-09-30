import { Router } from "express";
import { 
  requestPasswordReset, 
  resetPassword,
  changePassword,
} from "../controllers/password.controller.js";

import { authenticateToken } from "../middleware/auth.js";
import {
  passwordResetLimiter,
  passwordChangeLimiter,
} from "../middleware/rateLimit.js";

const router = Router();

router.post("/request-reset", passwordResetLimiter, requestPasswordReset);
// /reset is left on the global apiLimiter only: it's already gated by a
// 32-byte single-use token with a 1h expiry, so there's no guessable secret
// to throttle, and a strict tier here would let one attacker lock a genuine
// user out of finishing their own reset.
router.post("/reset", resetPassword);
// The limiter keys by user, so it must come AFTER authenticateToken.
router.post("/change-password", authenticateToken, passwordChangeLimiter, changePassword);

export default router;