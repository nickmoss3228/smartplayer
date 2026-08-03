// services/adminServices.ts
// Centralizes the admin panel's fetch calls. Uses the separate admin_token
// (sessionStorage, code-word JWT) rather than the regular user JWT services.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

async function parseOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}));
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
