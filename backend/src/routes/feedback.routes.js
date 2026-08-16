import { Router } from "express";
import { createFeedback, getAllFeedback, deleteFeedback } from "../controllers/feedback.controller.js";
import { adminAuth } from "../middleware/adminAuth.js";
import { feedbackLimiter } from "../middleware/rateLimit.js";

const router = Router();

router.post("/", feedbackLimiter, createFeedback); // public — anyone can submit
router.get("/", adminAuth, getAllFeedback);    // admin only — read all messages
router.delete("/:id", adminAuth, deleteFeedback); // admin only — delete a message

export default router;