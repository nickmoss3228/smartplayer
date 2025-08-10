// Aggregate feature routers and mount under a base prefix.

import { Router } from "express";
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import progressRoutes from "./progress.routes.js";
const router = Router();

router.use("/", authRoutes);
router.use("/", userRoutes);
router.use("/", progressRoutes);

export default router;
