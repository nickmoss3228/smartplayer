/**
 * The five method scenes by id, with their timing — the data half of
 * MethodScene.tsx (kept apart so that file exports only components).
 */
export type SceneId = 'passes' | 'subtitles' | 'word' | 'comic' | 'loop';

/** One round of each scene, in seconds — matches the keyframe durations in methodScenes.css. */
export const SCENE_CYCLE_S: Record<SceneId, number> = {
  passes: 9,
  subtitles: 7,
  word: 9,
  comic: 7,
  loop: 10,
};

/** The order the login panel plays them in. The order is the argument. */
export const SCENE_ORDER: SceneId[] = ['passes', 'subtitles', 'word', 'comic', 'loop'];
