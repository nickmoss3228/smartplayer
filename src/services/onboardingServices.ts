// services/onboardingServices.ts
//
// The /welcome flow's two endpoints. Through `api`, so the bearer token and the
// dead-session sign-out are handled the same way as everywhere else.
import { api } from "./apiClient";
import type { EnglishLevel, ListeningExperience } from "../modules/onboarding/onboardingOptions";

export interface OnboardingState {
  englishLevel: EnglishLevel | null;
  listeningExperience: ListeningExperience | null;
  /** ISO time the flow was finished; null while it is not. */
  onboardedAt: string | null;
}

/** Save whichever answers were given; the flow stays unfinished. */
export const saveOnboardingAnswers = async (answers: {
  englishLevel?: EnglishLevel;
  listeningExperience?: ListeningExperience;
}): Promise<OnboardingState> => {
  const res = await api.patch<{ onboarding: OnboardingState }>("/api/user/onboarding", answers);
  return res.data.onboarding;
};

/** Both answers, and the end of the flow. Safe to repeat. */
export const completeOnboarding = async (answers: {
  englishLevel: EnglishLevel;
  listeningExperience: ListeningExperience;
}): Promise<OnboardingState> => {
  const res = await api.post<{ onboarding: OnboardingState }>(
    "/api/user/onboarding/complete",
    answers,
  );
  return res.data.onboarding;
};

/**
 * "Take the intro again": clears both answers and the finish on the server.
 * The caller then sends the student to /welcome; until it is finished again
 * the gate keeps every other page away.
 */
export const restartOnboarding = async (): Promise<OnboardingState> => {
  const res = await api.post<{ onboarding: OnboardingState }>("/api/user/onboarding/restart");
  return res.data.onboarding;
};
