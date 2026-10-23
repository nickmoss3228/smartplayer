// modules/vocab/wordLook.ts
//
// The word window comes as an ink page or a paper page, and the student picks.
// Remembered on this device; the phone's sheet and the desktop's word column
// read the same choice, so switching in one switches the other.

import { useSyncExternalStore } from "react";

export type WordLook = "ink" | "paper";

const STORAGE_KEY = "wordWindowLook";
const listeners = new Set<() => void>();

const read = (): WordLook => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "paper" ? "paper" : "ink";
  } catch {
    return "ink";
  }
};

let current: WordLook = read();

export function setWordLook(look: WordLook) {
  current = look;
  try {
    localStorage.setItem(STORAGE_KEY, look);
  } catch {
    // Private mode: the choice lasts this visit only.
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** The surface a page of this look is drawn on (the sheet, the desktop column). */
export const wordPageClass = (look: WordLook) => (look === "ink" ? "bg-ink" : "bg-white");

export function useWordLook(): [WordLook, (look: WordLook) => void] {
  const look = useSyncExternalStore(subscribe, () => current, () => current);
  return [look, setWordLook];
}
