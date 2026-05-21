// routes/user.routes.js
import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import { getProfile, updateProfile } from "../controllers/user.controller.js";

const router = Router();

router.get("/user/profile", authenticateToken, getProfile);
router.patch("/user/profile", authenticateToken, updateProfile);

export default router;