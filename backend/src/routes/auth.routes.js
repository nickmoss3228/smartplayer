import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  signup,
  login,
  logout,
  validateToken,
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", authenticateToken, logout);
router.get("/validate-token", authenticateToken, validateToken);

export default router;
