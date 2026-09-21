import { Router } from "express";
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import progressRoutes from "./progress.routes.js";
import passwordRoutes from "./password.routes.js";
import feedbackRoutes from "./feedback.routes.js";
import adminRoutes from "./admin.routes.js";
import { adminStoryRoutes, publicStoryRoutes } from "./story.routes.js";
import sessionRoutes from "./session.routes.js";
import { paymentsRoutes } from "./payments.routes.js";
import { getCatalogConfig } from "../controllers/catalog.controller.js";
import { asyncHandler } from "../helpers/asyncHandler.js";

const router = Router();

router.use("/", authRoutes);
router.use("/", userRoutes);
router.use("/", progressRoutes);
router.use("/", passwordRoutes); // was missing the path
router.use("/sessions", sessionRoutes);   // -> /api/sessions
router.use("/feedback", feedbackRoutes); // -> /api/feedback
router.use("/admin", adminRoutes);       // -> /api/admin/login
router.use("/admin/stories", adminStoryRoutes); // -> /api/admin/stories
// Public: the shop must price itself for visitors who have not signed up.
router.get("/catalog", asyncHandler(getCatalogConfig)); // -> /api/catalog
router.use("/payments", paymentsRoutes);   // -> /api/payments
router.use("/stories", publicStoryRoutes);      // -> /api/stories/:difficulty/:storyId

export default router;