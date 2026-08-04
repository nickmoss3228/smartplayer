// middleware/adminUpload.js
// Single-file multipart upload for the Story Builder admin endpoints. Memory
// storage — files are audio clips (a few MB), fine to hold as a buffer for
// the short time it takes to forward to Yandex Object Storage.
import multer from "multer";

export const adminUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
}).single("file");
