import { Router } from "express";
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import progressRoutes from "./progress.routes.js";
import passwordRoutes from "./password.routes.js";
import feedbackRoutes from "./feedback.js";
import adminRoutes from "./admin.js";

const router = Router();

router.use("/", authRoutes);
router.use("/", userRoutes);
router.use("/", progressRoutes);
router.use("/", passwordRoutes); // was missing the path
router.use("/feedback", feedbackRoutes); // -> /api/feedback
router.use("/admin", adminRoutes);       // -> /api/admin/login

export default router;