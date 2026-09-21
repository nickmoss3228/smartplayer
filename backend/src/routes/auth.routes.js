import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import { loginLimiter, signupLimiter, phoneVerificationLimiter } from "../middleware/rateLimit.js";
import {
  signup,
  login,
  logout,
  validateToken,
  verifyPhone,
  resendPhoneCode,
  startPhoneVerification,
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/signup", signupLimiter, signup);
router.post("/login", loginLimiter, login);
router.post("/logout", authenticateToken, logout);
router.get("/validate-token", authenticateToken, validateToken);
router.post("/verify-phone", phoneVerificationLimiter, verifyPhone);
router.post("/resend-phone-code", phoneVerificationLimiter, resendPhoneCode);
router.post("/start-phone-verification", phoneVerificationLimiter, startPhoneVerification);

export default router;
