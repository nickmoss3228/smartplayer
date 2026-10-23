import express, { Router } from "express";
import { createShare, getShare, getShareAudio } from "../controllers/voiceShare.controller.js";
import { optionalAuth } from "../middleware/auth.js";
import { voiceShareLimiter } from "../middleware/rateLimit.js";
import { asyncHandler } from "../helpers/asyncHandler.js";

const router = Router();

// Public on purpose: guests practise too. The limiter and the WAV checks in
// the controller are what keep it from being a free file host. The body is
// raw audio, so it gets its own parser and ceiling (a 10-minute 22 kHz WAV is
// ~26 MB; a real part is a few MB).
router.post(
  "/",
  voiceShareLimiter,
  optionalAuth,
  express.raw({ type: "audio/wav", limit: "30mb" }),
  asyncHandler(createShare),
);
router.get("/:id", asyncHandler(getShare));
router.get("/:id/audio", asyncHandler(getShareAudio));

export default router;
