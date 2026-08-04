import { CharacterSlot } from "../config/characterCatalog";

export interface CharacterState {
  skinTone: string;
  ownedItemIds: string[];
  equipped: Record<CharacterSlot, string | null>;
}
