import { Router } from "express";
import {
  adminLogin,
  grantCurrency,
  listPlayers,
  setPlayerBanned,
  getPlayerProgress,
} from "../controllers/admin.controller.js";
import { adminAuth } from "../middleware/adminAuth.js";

const router = Router();

router.post("/login", adminLogin);
router.post("/grant-currency", adminAuth, grantCurrency);
router.get("/players", adminAuth, listPlayers);
router.patch("/players/:userId/ban", adminAuth, setPlayerBanned);
router.get("/players/:userId/progress", adminAuth, getPlayerProgress);

export default router;