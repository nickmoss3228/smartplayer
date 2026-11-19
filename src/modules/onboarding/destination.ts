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
  // '/home' is the sign-in default while the hub is on (auth/returnTo.ts). The
  // first session should be spent listening, not browsing, so it is treated as
  // "nowhere specific" too.
  if (path === '/levels' || path === '/' || path === '/welcome' || path === '/home') {
    return { to: `/levels/${suggested}`, state: { onboardingPick: suggested } };
  }
  return { to: path, state: forwardedState(routerState) };
};

/**
 * Where «Пропустить» goes: wherever the student was headed, and otherwise the
 * hub. No suggested shelf — someone who skipped chose to look around first.
 */
export const skipDestination = (
  routerState: unknown,
): { to: string; state: AuthReturnState | undefined } => {
  const path = returnPathFrom(routerState);
  if (path === '/welcome' || path === '/') return { to: '/home', state: undefined };
  return { to: path, state: forwardedState(routerState) };
};
