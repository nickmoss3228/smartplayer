import { ShopSlot } from "../config/shopCatalog";
import { RoomPlacement } from "../config/roomLayout";

export interface RoomState {
  apartmentTier: string;
  ownedItemIds: string[];
  lightsOn: boolean;
  placedItems: Record<ShopSlot, string | null>;
  placement: RoomPlacement;
}
