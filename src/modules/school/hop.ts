// modules/school/hop.ts
//
// The response to a poke, for anybody who can be poked.

import { useCallback, useRef } from "react";

/** Shared poke response: a short hop, decaying. Returns a getter the caller
 *  folds into whatever y offset its pose already uses. */
export function useHop() {
  const t = useRef(0);
  const trigger = useCallback(() => {
    t.current = 1;
  }, []);
  const advance = (dt: number) => {
    if (t.current <= 0) return 0;
    t.current = Math.max(0, t.current - dt * 2.2);
    return Math.sin((1 - t.current) * Math.PI) * 0.18;
  };
  return { trigger, advance };
}
