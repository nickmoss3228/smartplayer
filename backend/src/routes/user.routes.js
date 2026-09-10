// routes/user.routes.js
import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  getProfile,
  updateProfile,
  heartbeat,
  searchPlayers,
  getEntitlements,
} from "../controllers/user.controller.js";

const router = Router();

router.get("/user/profile", authenticateToken, getProfile);
router.patch("/user/profile", authenticateToken, updateProfile);
router.patch("/user/heartbeat", authenticateToken, heartbeat);
router.get("/user/search", authenticateToken, searchPlayers);
// What this account has paid for. Authenticated: a guest owns nothing by
// definition, and the starter pack is a property of having an account.
router.get("/user/entitlements", authenticateToken, getEntitlements);

export default router;