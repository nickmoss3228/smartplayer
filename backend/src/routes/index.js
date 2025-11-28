import { Router } from "express";
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import progressRoutes from "./progress.routes.js";
import passwordRoutes from "./password.routes.js"; 

const router = Router();

router.use("/", authRoutes);
router.use("/", userRoutes);
router.use("/", progressRoutes)
router.use(passwordRoutes);

export default router;
