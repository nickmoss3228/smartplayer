// auth/returnTo.ts
//
// Where Login and SignUp send someone once they are signed in.
//
// Two shapes of router state reach those pages. ProtectedRoute-style redirects
// carry `from: Location`; everything the paywall and the shop send carries
// `returnTo: string`. Login and SignUp used to read only `from`, so a guest who
// clicked "buy" signed in and landed on /levels instead of back on the story
// they were about to pay for.

export interface AuthReturnState {
  returnTo?: string;
  from?: { pathname?: string };
  /** Re-open the paywall on the page we return to. */
  openPaywall?: boolean;
  /** Scroll the shop to this item. */
  highlightSku?: string;
}

const FALLBACK = "/levels";

/** Only a path inside this app — never "//evil.example" or a full URL. */
const isInternalPath = (path: unknown): path is string =>
  typeof path === "string" && path.startsWith("/") && !path.startsWith("//");

export const returnPathFrom = (state: unknown): string => {
  const s = state as AuthReturnState | null;
  if (isInternalPath(s?.returnTo)) return s.returnTo;
  if (isInternalPath(s?.from?.pathname)) return s.from.pathname;
  return FALLBACK;
};

/** The part of the state that should survive the trip back. */
export const forwardedState = (state: unknown): AuthReturnState | undefined => {
  const s = state as AuthReturnState | null;
  if (!s?.openPaywall && !s?.highlightSku) return undefined;
  return { openPaywall: s.openPaywall, highlightSku: s.highlightSku };
};
