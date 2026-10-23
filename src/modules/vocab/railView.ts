// modules/vocab/railView.ts
//
// The desktop word column shows the part's words as a list (the default) or
// as the word window's page of text. The student switches with the control at
// the top of the column; the choice is remembered on this device. Phones are
// not involved: they open the text from one button (WordsButton).

import { useSyncExternalStore } from "react";

export type RailView = "list" | "text";

const STORAGE_KEY = "wordRailView";
const listeners = new Set<() => void>();

const read = (): RailView => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "text" ? "text" : "list";
  } catch {
    return "list";
  }
};

let current: RailView = read();

function setRailView(view: RailView) {
  current = view;
  try {
    localStorage.setItem(STORAGE_KEY, view);
  } catch {
    // Private mode: the choice lasts this visit only.
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useRailView(): [RailView, (view: RailView) => void] {
  const view = useSyncExternalStore(subscribe, () => current, () => current);
  return [view, setRailView];
}
