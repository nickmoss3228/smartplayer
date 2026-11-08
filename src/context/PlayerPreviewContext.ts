import { createContext, useContext, type Dispatch, type SetStateAction } from "react";

interface PreviewState {
  bookmarkKeys: string[];
  setBookmarkKeys: Dispatch<SetStateAction<string[]>>;
}

/** Preview practice stays in memory and never changes a learner's account. */
export const PlayerPreviewContext = createContext<PreviewState | null>(null);
export const usePlayerPreview = () => useContext(PlayerPreviewContext);
