// services/adminServices.ts
// Centralizes the admin panel's fetch calls. Uses the separate admin_token
// (sessionStorage, code-word JWT) rather than the regular user JWT services.

// Re-exported (rather than re-derived) so the admin panel and the player app
// can never disagree about which backend they're talking to.
export { API_BASE as API_URL } from "./apiClient";
import { API_BASE as API_URL } from "./apiClient";

export const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

/**
 * Fired when the 12h admin token is rejected. AdminPanel listens and drops
 * back to the code-word form.
 *
 * Deliberately separate from apiClient's `auth:unauthorized`, and the admin
 * modules deliberately stay on fetch rather than moving to the shared axios
 * client: this is a different token (admin_token), different storage
 * (sessionStorage, so it dies with the tab), different lifetime, and a
 * different recovery path. Routing them through `api` would mean tagging every
 * admin call with skipAuthRedirect, and one slip would sign a *user* out
 * because an *admin* token expired.
 */
export const ADMIN_UNAUTHORIZED_EVENT = "admin:unauthorized";

export async function parseOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}));
  // Every admin call in both admin service modules funnels through here, which
  // makes this the one place that needs to notice an expired admin token.
  // Without it the panel stays rendered and shows "Invalid or expired admin
  // token." on every action, and the only way out is spotting the Log out button.
  if (res.status === 401) {
    sessionStorage.removeItem("admin_token");
    window.dispatchEvent(new Event(ADMIN_UNAUTHORIZED_EVENT));
  }
  if (!res.ok) throw new Error(data.error ?? data.message ?? "Request failed");
  return data;
}

export interface AdminFeedbackItem {
  _id: string;
  name: string;
  message: string;
  createdAt: string;
}

export const fetchFeedback = async (
  token: string
): Promise<AdminFeedbackItem[]> => {
  const res = await fetch(`${API_URL}/api/feedback`, {
    headers: authHeaders(token),
  });
  const data = await parseOrThrow(res);
  return data.feedback ?? [];
};

export const deleteFeedback = async (
  token: string,
  id: string
): Promise<void> => {
  const res = await fetch(`${API_URL}/api/feedback/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  await parseOrThrow(res);
};

export interface AdminPlayer {
  id: string;
  username: string;
  email: string;
  nickname: string;
  avatar: string;
  banned: boolean;
  wallet: { bitAward: number; bitWord: number; bitPhrase: number };
  createdAt: string;
  lastActiveAt: string;
}

interface AdminPlayersResponse {
  players: AdminPlayer[];
  page: number;
  hasMore: boolean;
}

export const fetchAdminPlayers = async (
  token: string,
  { q = "", page = 1 }: { q?: string; page?: number } = {}
): Promise<AdminPlayersResponse> => {
  const params = new URLSearchParams({ page: String(page) });
  if (q) params.set("q", q);
  const res = await fetch(`${API_URL}/api/admin/players?${params}`, {
    headers: authHeaders(token),
  });
  return parseOrThrow(res);
};

export const setPlayerBanned = async (
  token: string,
  userId: string,
  banned: boolean
): Promise<AdminPlayer> => {
  const res = await fetch(`${API_URL}/api/admin/players/${userId}/ban`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ banned }),
  });
  const data = await parseOrThrow(res);
  return data.user;
};

export const grantCurrency = async (
  token: string,
  payload: {
    userId: string;
    bitAward?: number;
    bitWord?: number;
    bitPhrase?: number;
  }
): Promise<{ bitAward: number; bitWord: number; bitPhrase: number }> => {
  const res = await fetch(`${API_URL}/api/admin/grant-currency`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(payload),
  });
  const data = await parseOrThrow(res);
  return data.wallet;
};

export interface AdminPlayerProgress {
  username: string;
  email: string;
  nickname: string;
  wallet: { bitAward: number; bitWord: number; bitPhrase: number };
  streak: { current: number; longest: number; lastSubmittedDate: string | null };
  achievements: Record<string, string | null>;
  totalListeningSeconds: number;
  learnedWordsCount: number;
  apartmentTier: string;
  levelProgress: {
    difficulty: string;
    completedLevels: number[];
    currentLevel: number;
  }[];
  storyProgress: {
    difficulty: string;
    storyId: string;
    completedParts: number[];
    currentPart: number;
  }[];
}

export const fetchPlayerProgress = async (
  token: string,
  userId: string
): Promise<AdminPlayerProgress> => {
  const res = await fetch(`${API_URL}/api/admin/players/${userId}/progress`, {
    headers: authHeaders(token),
  });
  return parseOrThrow(res);
};

export interface AdminAuditEntry {
  _id: string;
  createdAt: string;
  actor: { name: string; sessionId: string | null; tokenIssuedAt: string | null };
  ip: string | null;
  userAgent: string | null;
  action: string;
  method: string;
  path: string;
  targetType: string | null;
  targetId: string | null;
  statusCode: number;
  outcome: "success" | "client_error" | "server_error";
  durationMs: number | null;
  summary: unknown;
}

interface AdminAuditResponse {
  entries: AdminAuditEntry[];
  page: number;
  hasMore: boolean;
  /** Distinct action labels present in the log — powers the filter dropdown. */
  actions: string[];
}

export const fetchAuditLog = async (
  token: string,
  { page = 1, action = "", actor = "" }: { page?: number; action?: string; actor?: string } = {}
): Promise<AdminAuditResponse> => {
  const params = new URLSearchParams({ page: String(page) });
  if (action) params.set("action", action);
  if (actor) params.set("actor", actor);
  const res = await fetch(`${API_URL}/api/admin/audit?${params}`, {
    headers: authHeaders(token),
  });
  return parseOrThrow(res);
};
