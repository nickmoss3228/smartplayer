import { useEffect, useMemo, useState } from "react";
import { CharacterState } from "../../types/Character";
import { drawCharacterPortrait } from "./characterPortrait";
import { CharacterLook, lookKey, resolveLook } from "./look";

// The picture of a character for the navbar, the dashboard and the players
// list: the 3D figure, rendered once per look (portrait.ts) and kept.
//
// Kept twice. In memory, so a look drawn once is never drawn again this
// session; and the last few in localStorage, so the navbar on a fresh page
// load shows your picture at once instead of loading three.js to redraw it.

const STORE = "portrait.v1";
const KEEP = 6;
const memory = new Map<string, string>();

function stored(): { key: string; url: string }[] {
  try {
    const raw = localStorage.getItem(STORE);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function cached(key: string): string | null {
  const hit = memory.get(key);
  if (hit) return hit;
  const found = stored().find((e) => e.key === key);
  if (found?.url) memory.set(key, found.url);
  return found?.url ?? null;
}

function remember(key: string, url: string) {
  memory.set(key, url);
  try {
    const list = [{ key, url }, ...stored().filter((e) => e.key !== key)].slice(0, KEEP);
    localStorage.setItem(STORE, JSON.stringify(list));
  } catch {
    // Full or blocked storage: the memory copy still serves this session.
  }
}

/** Renders `look` in 3D if it is not cached, and caches it. */
function render(key: string, look: CharacterLook): Promise<string> {
  return import("./portrait").then(({ renderPortrait }) => {
    const url = renderPortrait(look);
    if (url) remember(key, url);
    return url;
  });
}

export function useCharacterPortrait(
  character: Pick<CharacterState, "skinTone" | "equipped" | "look"> | null | undefined,
): string {
  const look = useMemo(() => (character ? resolveLook(character) : null), [character]);
  const key = look ? lookKey(look) : null;
  const [url, setUrl] = useState(() => (key ? (cached(key) ?? "") : ""));

  useEffect(() => {
    if (!look || !key) {
      setUrl("");
      return;
    }
    const hit = cached(key);
    if (hit) {
      setUrl(hit);
      return;
    }
    // Something to show while three.js loads, the first time only.
    setUrl(drawCharacterPortrait(look));
    let live = true;
    render(key, look)
      .then((u) => {
        if (live && u) setUrl(u);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
    // The key is the look.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return url;
}
