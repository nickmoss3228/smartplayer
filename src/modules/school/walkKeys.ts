// modules/school/walkKeys.ts
//
// The keyboard half of walking the player's character: arrow keys and WASD,
// held, steer it directly (avatar.ts turns them into a direction on the
// ground). The tap half is Walking.tsx.

import { useEffect } from "react";
import { AvatarState, keysToGround } from "./avatar";

const KEYS: Record<string, string> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
};

/** Arrow keys and WASD steer the character directly, on a keyboard. Ignored
 *  while typing into a field, and released if the window loses focus with a
 *  key still down — or the character walks on into the wall forever. */
export function useWalkKeys(state: AvatarState | null) {
  useEffect(() => {
    if (!state) return;
    const held = new Set<string>();
    const update = () => {
      state.keys = keysToGround(held);
      if (held.size) state.follow = true;
    };
    const typing = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
    };
    const down = (e: KeyboardEvent) => {
      const dir = KEYS[e.code];
      if (!dir || typing(e)) return;
      e.preventDefault();
      held.add(dir);
      update();
    };
    const up = (e: KeyboardEvent) => {
      const dir = KEYS[e.code];
      if (!dir) return;
      held.delete(dir);
      update();
    };
    const blur = () => {
      held.clear();
      update();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      held.clear();
      update();
    };
  }, [state]);
}
