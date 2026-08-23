import axios from "axios";

const YOS_BASE_URL = import.meta.env.VITE_YOS_BASE_URL;

// console.log("ENV CHECK:", import.meta.env);
// console.log("YOS:", import.meta.env.VITE_YOS_BASE_URL);

if (!YOS_BASE_URL) {
  console.warn("VITE_YOS_BASE_URL is not defined in your .env file");
}

/**
 * Builds a full Yandex Object Storage URL for a given path.
 * Example: getStorageUrl("leo/1. Meet Leo.mp3")
 * → "https://storage.yandexcloud.net/your-bucket/leo/1. Meet Leo.mp3"
 */
export const getStorageUrl = (path: string): string => {
  // Remove leading slash if present
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${YOS_BASE_URL}/${encodeURIComponent(cleanPath).replace(/%2F/g, "/")}`;
};

/**
 * Resolves a quiz clip's STORED path to something actually playable.
 *
 * Mirrors backend/src/config/quizData.js's resolveQuizAudioPath exactly,
 * because it's resolving the same data: quiz audio is kept bucket-relative
 * and already percent-encoded in both quizData.js and an imported Story
 * draft (see assembleImportPayload.ts), specifically so a story keeps
 * working if it's ever copied between environments with different buckets.
 * A freshly (re-)uploaded clip is already absolute (uploadToStorage.js
 * returns a full URL), so that case is passed through untouched.
 *
 * Skipping this step is exactly the bug that made Story Builder quiz
 * previews report perfectly good clips as "damaged": handed the bare
 * relative path, `<audio src>` resolves it against the ADMIN PAGE's own
 * origin, not the bucket — the dev server has no such file, falls back to
 * serving index.html, and that 200-OK HTML "arrives" in full and then fails
 * to decode as audio. getPublishedStory already does this same resolution
 * server-side for players; the admin's own draft-editing view (getStory)
 * deliberately returns the raw stored value, so the client has to do it too.
 */
export const resolveQuizAudioUrl = (path: string | null | undefined): string => {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  return `${YOS_BASE_URL.replace(/\/$/, "")}/${path}`;
};

/**
 * Checks that a file actually exists in the bucket (HEAD request).
 * Useful for debugging missing assets.
 */
export const checkFileExists = async (path: string): Promise<boolean> => {
  try {
    await axios.head(getStorageUrl(path));
    return true;
  } catch {
    return false;
  }
};