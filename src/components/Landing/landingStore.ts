import { useSyncExternalStore } from 'react';
import type { DifficultySlug } from '../../types/storyGroups';

/**
 * What the landing's cards and its 3D scene share.
 *
 * The scene runs its own animation loop and reads this every frame, so it is a
 * plain object rather than React state; the cards that show part of it
 * subscribe through `useLanding` and re-render only when their slice changes.
 * Writers replace the slice they change (never mutate it in place), which is
 * what lets a selector compare by reference.
 */

export interface LandingState {
  /** The 3D scene is on. Off for reduced motion, or when WebGL would not start: the cards then show stills. */
  is3d: boolean;
  /**
   * A demo control keeps its scene in the 3D band for a while, even after the
   * next card has scrolled into the reading line. `until` is a performance.now() time.
   */
  focus: { ch: number; until: number } | null;
  /** Problem 2. `user`: the switch was pressed, so it stops flipping on its own. */
  subs: { on: boolean; user: boolean };
  /**
   * Problem 3: the AUTUMN step — 0 how it is written, 1 how the eye reads it,
   * 2 how it sounds, 3 how malako shows it. `user` is when it was last chosen
   * by hand (performance.now()), 0 if never; the scene steps on by itself otherwise.
   */
  tiles: { step: number; user: number };
  /**
   * «Послушать фразу так же»: Leo's phrase at 0.65, then 0.8, then 1.0, which
   * the dancer follows. `start` is when the current pass began (performance.now());
   * `gap` is the pause between passes.
   */
  ladder: { on: boolean; pass: number; start: number; gap: boolean };
  /** What the dancer's clock shows, for the speed card's ladder and four counts. */
  ladderUI: { pass: number; beat: number };
  level: DifficultySlug;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const initial = (): LandingState => ({
  is3d: !prefersReducedMotion(),
  focus: null,
  subs: { on: false, user: false },
  tiles: { step: 0, user: 0 },
  ladder: { on: false, pass: 0, start: 0, gap: true },
  ladderUI: { pass: -1, beat: -1 },
  level: 'easy',
});

let state = initial();
const listeners = new Set<() => void>();

export const landingStore = {
  get: (): LandingState => state,
  set(patch: Partial<LandingState>) {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  /** Back to the first visit's state, when the landing unmounts. */
  reset() {
    state = initial();
    listeners.forEach((l) => l());
  },
};

// For the scripted browser checks (dev builds only).
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __landingStore?: typeof landingStore }).__landingStore = landingStore;
}

/** One slice of the landing state; re-renders when that slice is replaced. */
export function useLanding<T>(select: (s: LandingState) => T): T {
  return useSyncExternalStore(
    landingStore.subscribe,
    () => select(landingStore.get()),
    () => select(landingStore.get()),
  );
}

/** Pin a chapter's scene in the 3D band for `ms`, after someone used its demo. */
export const focusChapter = (ch: number, ms: number) =>
  landingStore.set({ focus: { ch, until: performance.now() + ms } });

export const setSubs = (on: boolean, byUser = false) =>
  landingStore.set({ subs: { on, user: byUser || landingStore.get().subs.user } });

export const setTilesStep = (step: number, byUser = false) =>
  landingStore.set({ tiles: { step, user: byUser ? performance.now() : landingStore.get().tiles.user } });

/**
 * What a tap in the 3D scene asks the cards to do. Each card that owns one of
 * these registers it while it is mounted, so the scene never imports a card.
 */
export const landingActions: {
  /** Problem 3: play «аутумн» or «о́тэм», moving the tiles to that step. */
  sayAutumn?: (which: 'ru' | 'en') => void;
} = {};
