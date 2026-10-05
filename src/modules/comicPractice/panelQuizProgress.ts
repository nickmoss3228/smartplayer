// Whether a part's comic quiz has been done, for the tick in the practice
// window.
//
// On this device only, like the player's "listened to the end" flag: the game
// is unscored practice and the server keeps no record of it. If it ever earns
// anything, this moves server-side with its grading.

/** The quiz's own pass mark (Quiz.tsx, completeLevel on the server). */
export const PASS_SHARE = 0.7;

export const passed = (score: number, total: number) => total > 0 && score >= Math.ceil(total * PASS_SHARE);

const key = (difficulty: string, storySlug: string, part: number) =>
  `panelQuizDone_${difficulty}_${storySlug}_${part}`;

export function isPanelQuizDone(difficulty: string, storySlug: string, part: number): boolean {
  try {
    return localStorage.getItem(key(difficulty, storySlug, part)) === "true";
  } catch {
    return false;
  }
}

export function markPanelQuizDone(difficulty: string, storySlug: string, part: number): void {
  try {
    localStorage.setItem(key(difficulty, storySlug, part), "true");
  } catch {
    // Storage blocked (private mode): the tick just won't stick.
  }
}
