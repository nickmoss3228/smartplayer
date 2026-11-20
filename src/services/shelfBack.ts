// services/shelfBack.ts
//
// Where a level's story shelf (/levels/:difficulty) goes back to. A shelf is
// reached two ways: from the hub's levels card, and from the full-screen level
// picker (the «Уровни» tab). Back should return to whichever it was, and it
// still should after a detour into a story and out again, which drops router
// state — so the way in is kept for the browser tab instead.

export type ShelfBack = '/home' | '/levels';

const KEY = 'malako:shelfBack';

export function saveShelfBack(to: ShelfBack): void {
  try {
    sessionStorage.setItem(KEY, to);
  } catch {
    // Storage blocked: the shelf falls back to the picker.
  }
}

export function readShelfBack(): ShelfBack | null {
  try {
    const v = sessionStorage.getItem(KEY);
    return v === '/home' || v === '/levels' ? v : null;
  } catch {
    return null;
  }
}
