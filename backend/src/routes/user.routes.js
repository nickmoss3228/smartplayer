// routes/user.routes.js
import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  getProfile,
  updateProfile,
  heartbeat,
  listPlayers,
} from "../controllers/user.controller.js";

const router = Router();

router.get("/user/profile", authenticateToken, getProfile);
router.patch("/user/profile", authenticateToken, updateProfile);
router.patch("/user/heartbeat", authenticateToken, heartbeat);
router.get("/user/players", authenticateToken, listPlayers);

export default router;