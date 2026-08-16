import axios from "axios";
import { CharacterState } from "../types/Character";
import { API_BASE } from "./apiClient";


interface CharacterResponse {
  character: CharacterState;
  bitAward: number;
}

export const fetchCharacter = async (token: string): Promise<CharacterResponse> => {
  const res = await axios.get(`${API_BASE}/api/progress/character`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const purchaseCharacterItem = async (
  token: string,
  itemId: string,
): Promise<CharacterResponse> => {
  const res = await axios.post(
    `${API_BASE}/api/progress/character/purchase`,
    { itemId },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.data;
};

// Re-selects an already-owned item into its slot — no currency spent, unlike
// purchaseCharacterItem. Mirrors roomServices.ts's equipItem.
export const equipCharacterItem = async (
  token: string,
  itemId: string,
): Promise<{ character: CharacterState }> => {
  const res = await axios.post(
    `${API_BASE}/api/progress/character/equip`,
    { itemId },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.data;
};

export const setSkinTone = async (
  token: string,
  skinTone: string,
): Promise<{ character: CharacterState }> => {
  const res = await axios.patch(
    `${API_BASE}/api/progress/character/skin-tone`,
    { skinTone },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.data;
};
