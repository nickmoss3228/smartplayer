import type { User } from '../../types/Auth';

export const WELCOME_PATH = '/welcome';

/**
 * Pages a not-yet-onboarded account may still open. The auth screens (they
 * redirect a signed-in user on by themselves), the legal documents the sign-up
 * form links to, the admin panel (its own login, nothing to do with this
 * account) and the payment provider's return pages, which must land whatever
 * state the account is in.
 */
const EXEMPT = [
  /^\/welcome\/?$/,
  /^\/login\/?$/,
  /^\/signup\/?$/,
  /^\/forgot-password\/?$/,
  /^\/admin(\/|$)/,
  /^\/legal\//,
  /^\/checkout\//,
];

/**
 * Whether this page should send its viewer to /welcome first.
 *
 * Only a strict `null` gates. The server sends `onboardedAt: null` for an
 * account that has not been through the flow; an absent field means a server
 * from before the flow existed, and that must never trap anyone on a page
 * whose endpoints are not there.
 */
export const shouldRedirectToOnboarding = (user: User | null, pathname: string): boolean => {
  if (!user || user.onboardedAt !== null) return false;
  return !EXEMPT.some((re) => re.test(pathname));
};
