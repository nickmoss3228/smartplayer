import { CharacterSlot } from "../config/characterCatalog";
import type { CharacterLook } from "../modules/character/look";

export interface CharacterState {
  skinTone: string;
  ownedItemIds: string[];
  equipped: Record<CharacterSlot, string | null>;
  /** The character the player made in the dashboard's creator. Null until
   *  they have — `resolveLook` then falls back to the old shop's items. */
  look?: CharacterLook | null;
}
