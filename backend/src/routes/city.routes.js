// routes/city.routes.js
import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  getCity,
  createCity,
  placeTile,
  bulldozeTile,
  setTaxRates,
} from "../controllers/city.controller.js";

const router = Router();

router.get("/city", authenticateToken, getCity);
router.post("/city", authenticateToken, createCity);
router.post("/city/tiles", authenticateToken, placeTile);
router.delete("/city/tiles", authenticateToken, bulldozeTile);
router.patch("/city/tax", authenticateToken, setTaxRates);

export default router;
