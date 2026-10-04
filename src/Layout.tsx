import { Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar/Navbar";
import { ReactNode } from "react";
import { useAuth } from "./context/AuthContext";
import { useHeartbeat } from "./hooks/useHeartbeat";
import { forwardedState } from "./auth/returnTo";
import { WELCOME_PATH, shouldRedirectToOnboarding } from "./modules/onboarding/gate";

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user } = useAuth();
  useHeartbeat(!!user);

  // A new account goes through /welcome before anything else. Decided here,
  // before the navbar renders, so the page it was headed for never flashes.
  // Where it was headed rides along in the same state shape Login and SignUp
  // use (auth/returnTo.ts), so a sign-up that began at a paywall still ends
  // back at that paywall once the flow is done.
  if (shouldRedirectToOnboarding(user, location.pathname)) {
    return (
      <Navigate
        to={WELCOME_PATH}
        replace
        state={{
          ...forwardedState(location.state),
          returnTo: location.pathname + location.search,
        }}
      />
    );
  }

  // Matches /levels/:difficulty/:storySlug/:trackNumber (Player route)
  // and the legacy /player route
  const isPlayerRoute =
    /^\/levels\/[^/]+\/[^/]+\/[^/]+$/.test(location.pathname) ||
    location.pathname === "/player";

  // The auth screens are a full-bleed split of their own (auth/authKit.tsx);
  // the fixed navbar floated over their dark panel and repeated the brand.
  // /welcome is a flow with one way out, and a navbar would be a second.
  const isAuthRoute = ["/login", "/signup", "/forgot-password", WELCOME_PATH].includes(
    location.pathname,
  );

  return (
    <>
      {!isPlayerRoute && !isAuthRoute && <Navbar />}
      {children}
    </>
  );
}
