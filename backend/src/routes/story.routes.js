// routes/story.routes.js
import { Router } from "express";
import { adminAuth } from "../middleware/adminAuth.js";
import { adminUpload } from "../middleware/adminUpload.js";
import {
  createStory,
  importStory,
  getStaticQuizSource,
  listStories,
  getStory,
  deleteStory,
  uploadPartAsset,
  saveMarkers,
  saveVocabulary,
  savePhrasalVerbs,
  saveQuiz,
  setStoryPublished,
  getPublishedStory,
  listPublishedStories,
} from "../controllers/story.controller.js";

const adminRouter = Router();
adminRouter.post("/", adminAuth, createStory);
adminRouter.post("/import", adminAuth, importStory);
adminRouter.get("/quiz-source/:difficulty/:storyId", adminAuth, getStaticQuizSource);
adminRouter.get("/", adminAuth, listStories);
adminRouter.get("/:id", adminAuth, getStory);
adminRouter.delete("/:id", adminAuth, deleteStory);
adminRouter.post("/:id/parts/:partNumber/upload", adminAuth, adminUpload, uploadPartAsset);
adminRouter.patch("/:id/parts/:partNumber/markers", adminAuth, saveMarkers);
adminRouter.put("/:id/parts/:partNumber/vocabulary", adminAuth, saveVocabulary);
adminRouter.put("/:id/parts/:partNumber/phrasal-verbs", adminAuth, savePhrasalVerbs);
adminRouter.put("/:id/parts/:partNumber/quiz", adminAuth, saveQuiz);
adminRouter.patch("/:id/publish", adminAuth, setStoryPublished);

// Public — the player fetches a published story's content here (no auth).
const publicRouter = Router();
publicRouter.get("/:difficulty", listPublishedStories);
publicRouter.get("/:difficulty/:storyId", getPublishedStory);

export { adminRouter as adminStoryRoutes, publicRouter as publicStoryRoutes };
