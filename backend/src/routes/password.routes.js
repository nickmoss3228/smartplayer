import { Router } from "express";
import { 
  requestPasswordReset, 
  resetPassword 
} from "../controllers/password.controller.js";

const router = Router();

router.post("/request-reset", requestPasswordReset);
router.post("/reset", resetPassword);

export default router;