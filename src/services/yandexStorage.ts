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