import { Router } from "express";
import { createFeedback, getAllFeedback } from "../controllers/feedback.controller.js";
import { adminAuth } from "../middleware/adminAuth.js";

const router = Router();

router.post("/", createFeedback);          // public — anyone can submit
router.get("/", adminAuth, getAllFeedback); // admin only — read all messages

export default router;