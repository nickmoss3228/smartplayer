// services/voiceShareServices.ts
// «Послушай себя» share links (backend: controllers/voiceShare.controller.js).
// A recording leaves the device only through uploadVoiceShare, and only when
// the student presses «Создать ссылку».

import { api, API_BASE } from "./apiClient";

export type VoiceShareKind = "me" | "dialogue";

export interface VoiceShare {
  id: string;
  storyTitle: string;
  partTitle: string;
  part: number;
  difficulty: "easy" | "medium" | "hard";
  kind: VoiceShareKind;
  durationSec: number;
  createdAt: string;
  expiresAt: string;
}

export interface VoiceShareCaption {
  storyTitle: string;
  partTitle: string;
  part: number;
  difficulty: string;
  kind: VoiceShareKind;
}

export async function uploadVoiceShare(wav: Blob, caption: VoiceShareCaption): Promise<VoiceShare> {
  const { data } = await api.post<VoiceShare>("/api/voice-shares", wav, {
    params: caption,
    headers: { "Content-Type": "audio/wav" },
    // A few MB on a phone connection.
    timeout: 120000,
    // A guest's share is fine; a stale token must not end the session here.
    skipAuthRedirect: true,
  });
  return data;
}

/** null when the link is unknown or has expired. */
export async function fetchVoiceShare(id: string): Promise<VoiceShare | null> {
  try {
    const { data } = await api.get<VoiceShare>(`/api/voice-shares/${encodeURIComponent(id)}`, { skipAuth: true });
    return data;
  } catch (error) {
    if ((error as { response?: { status?: number } }).response?.status === 404) return null;
    throw error;
  }
}

export const voiceShareAudioUrl = (id: string) => `${API_BASE}/api/voice-shares/${encodeURIComponent(id)}/audio`;

/** The page a share link opens (pages/ListenShared.tsx). */
export const voiceSharePageUrl = (id: string) => `${window.location.origin}/listen/${id}`;
