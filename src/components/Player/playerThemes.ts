import type { Difficulty } from "../../types/Player";

/** Shared by the student page and its admin preview. */
export const playerThemes: Record<Difficulty, { background: string }> = {
  easy: { background: "from-green-500 via-emerald-500 to-teal-500" },
  medium: { background: "from-yellow-300 via-orange-400 to-red-500" },
  hard: { background: "from-red-500 via-purple-500 to-pink-500" },
};
