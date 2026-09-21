// routes/story.routes.js
import { Router } from "express";
import { adminAuth } from "../middleware/adminAuth.js";
import { optionalAuth } from "../middleware/auth.js";
import { adminUpload } from "../middleware/adminUpload.js";
import {
  createStory,
  importStory,
  getStaticQuizSource,
  listStories,
  getStory,
  updateStoryMeta,
  deleteStory,
  addPart,
  uploadPartAsset,
  saveMarkers,
  saveComic,
  getStoryVisibility,
  setStoryVisibility,
  uploadStoryCover,
  clearStoryCover,
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
// Before "/:id", or Express matches "visibility" as a story id and the lookup
// fails with a cast error instead of routing here.
adminRouter.get("/visibility/:difficulty", adminAuth, getStoryVisibility);
adminRouter.put("/visibility/:difficulty/:storyId", adminAuth, setStoryVisibility);
adminRouter.get("/:id", adminAuth, getStory);
adminRouter.patch("/:id", adminAuth, updateStoryMeta);
adminRouter.delete("/:id", adminAuth, deleteStory);
adminRouter.post("/:id/cover", adminAuth, adminUpload, uploadStoryCover);
adminRouter.delete("/:id/cover", adminAuth, clearStoryCover);
adminRouter.post("/:id/parts", adminAuth, addPart);
adminRouter.post("/:id/parts/:partNumber/upload", adminAuth, adminUpload, uploadPartAsset);
adminRouter.patch("/:id/parts/:partNumber/markers", adminAuth, saveMarkers);
adminRouter.put("/:id/parts/:partNumber/comic", adminAuth, saveComic);
adminRouter.put("/:id/parts/:partNumber/vocabulary", adminAuth, saveVocabulary);
adminRouter.put("/:id/parts/:partNumber/phrasal-verbs", adminAuth, savePhrasalVerbs);
adminRouter.put("/:id/parts/:partNumber/quiz", adminAuth, saveQuiz);
adminRouter.patch("/:id/publish", adminAuth, setStoryPublished);

// Public — the player fetches a published story's content here.
//
// optionalAuth, NOT authenticateToken: both routes must keep serving guests
// (the level list and the two-part trial are open by design), but a signed-in
// caller has to be identified or a paying customer is served the locked,
// audio-stripped version of a story they own. optionalAuth verifies a token
// when one is present — including the ban and session-revocation checks — and
// falls through to req.user = null when it is not.
const publicRouter = Router();
publicRouter.get("/:difficulty", optionalAuth, listPublishedStories);
publicRouter.get("/:difficulty/:storyId", optionalAuth, getPublishedStory);

export { adminRouter as adminStoryRoutes, publicRouter as publicStoryRoutes };
