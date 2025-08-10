import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import { getDashboard } from "../controllers/user.controller.js";

const router = Router();

router.get("/dashboard", authenticateToken, getDashboard);
export default router;
    