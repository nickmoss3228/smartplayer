import { Router } from "express";
import { adminLogin, grantCurrency } from "../controllers/admin.controller.js";
import { adminAuth } from "../middleware/adminAuth.js";

const router = Router();

router.post("/login", adminLogin);
router.post("/grant-currency", adminAuth, grantCurrency);

export default router;