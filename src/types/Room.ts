import { ShopSlot } from "../config/shopCatalog";

export interface RoomState {
  apartmentTier: string;
  ownedItemIds: string[];
  placedItems: Record<ShopSlot, string | null>;
}
