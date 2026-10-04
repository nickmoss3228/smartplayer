import { forwardedState, returnPathFrom, type AuthReturnState } from '../../auth/returnTo';
import type { DifficultySlug } from '../../types/storyGroups';

/** Router state the level shelf reads to say "we picked this from your answer". */
export interface OnboardingPickState {
  onboardingPick: DifficultySlug;
}

/**
 * Where the last slide's button goes.
 *
 * Someone who was on their way somewhere specific — the paywall of a story,
 * a deep link — is sent on there, with the paywall flag intact. Everyone else
 * (sign-up's default is the level picker) lands straight on the shelf their
 * answer suggested, which is the point of asking.
 */
export const onboardingDestination = (
  routerState: unknown,
  suggested: DifficultySlug,
): { to: string; state: AuthReturnState | OnboardingPickState | undefined } => {
  const path = returnPathFrom(routerState);
  if (path === '/levels' || path === '/' || path === '/welcome') {
    return { to: `/levels/${suggested}`, state: { onboardingPick: suggested } };
  }
  return { to: path, state: forwardedState(routerState) };
};
