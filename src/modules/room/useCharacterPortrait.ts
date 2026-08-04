import { useMemo } from "react";
import { CharacterState } from "../../types/Character";
import { drawCharacterPortrait } from "./characterPortrait";

// Memoized so ProfileEditor/Navbar/PlayerRoom don't redraw the canvas on
// every render — only when the customization actually changed.
export function useCharacterPortrait(
  character: Pick<CharacterState, "skinTone" | "equipped"> | null | undefined,
): string {
  const { skinTone, hairstyle, outfit, hat } = character
    ? { skinTone: character.skinTone, ...character.equipped }
    : { skinTone: null, hairstyle: null, outfit: null, hat: null };

  return useMemo(() => {
    if (!character) return "";
    return drawCharacterPortrait(character);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skinTone, hairstyle, outfit, hat]);
}
