import { useMemo } from "react";
import { trackFolderMap } from "../../../modules/vocabulary/Vocabulary";

// helper: folder name → readable title, e.g. "1. leo's life" → "Leo's Life"
function formatStoryTitle(folderName: string): string {
  return folderName
    .replace(/^\d+\.\s*/, "") // strip "1. " or "1."
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export const useStoryTitles = (difficulty: string, storySlug: string) =>
  useMemo(
    () =>
      Object.entries(trackFolderMap[difficulty]?.[storySlug] ?? {}).reduce<
        Record<number, string>
      >((acc, [key, folderName]) => {
        acc[Number(key)] = formatStoryTitle(folderName);
        return acc;
      }, {}),
    [difficulty, storySlug],
  );
