import axios from "axios";
import { API_BASE } from "./apiClient";
import { RoomPresets } from "../config/schoolCatalog";

// Wire format for the Dream School. The room list really is the whole save —
// it implies every rectangle, prop and person on screen, so there is nothing
// per-item to send. See docs/room-game-concept.md.
export interface SchoolState {
  /** Every room bought so far. Order is not meaningful. */
  ownedRoomIds: string[];
  /**
   * The player's old ten-stage index, which now only ever RAISES their level.
   * On the wire because the client derives the level itself (levelFor) and
   * would otherwise compute a lower one for a migrated player — see the
   * catalog. Zero for anyone who never saw that economy.
   */
  levelFloor: number;
  layoutId: string;
  wallpaperId: string;
  floorId: string;
  /** Per-room overrides of the three above, keyed by room id and sparse — a
   *  room appears only once it has been changed. Everything else falls through
   *  to the school's own setting. */
  presets: RoomPresets;
  /** Wages. All four fields are DERIVED by the server from one stored date;
   *  they are sent rather than computed here so the advisor and the Pay button
   *  never disagree with what the server will actually charge. */
  payroll: {
    lastPaidAt: string | null;
    weeksOwed: number;
    morale: number;
    due: number;
  };
  /** Which of the three campus shapes this player was assigned. Not a
   *  preference — it is fixed per player, so visiting someone shows a
   *  different building rather than a recolour of your own. */
  variantId: string;
}

export interface WalletBalances {
  bitAward: number;
  bitWord: number;
  bitPhrase: number;
}

export interface SchoolResponse {
  school: SchoolState;
  wallet: WalletBalances;
}

// A purchase echoes the wallet back so the UI never has to guess what the price
// left behind. Look changes are free and so return no wallet.
export interface SchoolMutationResponse {
  school: SchoolState;
  wallet?: WalletBalances;
}

const auth = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });

export const fetchSchool = async (token: string): Promise<SchoolResponse> => {
  const res = await axios.get(`${API_BASE}/api/progress/school`, auth(token));
  return res.data;
};

export interface PlayerSchoolResponse {
  school: SchoolState;
  nickname: string | null;
}

// Read-only snapshot of someone else's campus. No wallet: what another player
// can afford is not shown, matching the old room-visit endpoint.
export const fetchPlayerSchool = async (
  token: string,
  userId: string,
): Promise<PlayerSchoolResponse> => {
  const res = await axios.get(`${API_BASE}/api/progress/school/${userId}`, auth(token));
  return res.data;
};

// Buy one room. The body names the room and nothing else: the server reads the
// price, the currency and whether it may be bought at all out of its own
// catalog when the request lands, so there is no price or discount for a client
// to name.
export const buySchoolRoom = async (
  token: string,
  roomId: string,
): Promise<SchoolMutationResponse> => {
  const res = await axios.post(
    `${API_BASE}/api/progress/school/rooms`,
    { roomId },
    auth(token),
  );
  return res.data;
};

// Pay every week owed, at the rate the catalog says when the request lands.
// No body, for the same reason a room purchase has none.
export const paySchoolPayroll = async (token: string): Promise<SchoolMutationResponse> => {
  const res = await axios.post(`${API_BASE}/api/progress/school/payroll`, {}, auth(token));
  return res.data;
};

export interface SchoolLookPatch {
  /** Absent changes the school's default; present changes that one room. */
  roomId?: string;
  /** null clears a room's override back to the school default. Only a room may
   *  be cleared — the school itself always has all three. */
  layoutId?: string | null;
  wallpaperId?: string | null;
  floorId?: string | null;
}

// Free preferences — wallpaper, floor, desk arrangement. Still validated
// server-side against the level that unlocks them.
export const setSchoolLook = async (
  token: string,
  patch: SchoolLookPatch,
): Promise<SchoolMutationResponse> => {
  const res = await axios.patch(`${API_BASE}/api/progress/school/look`, patch, auth(token));
  return res.data;
};
