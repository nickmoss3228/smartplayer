import { useLocation } from "react-router-dom";
import Navbar from "./components/Navbar/Navbar";
import { ReactNode } from "react";
import { useAuth } from "./context/AuthContext";
import { useHeartbeat } from "./hooks/useHeartbeat";

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user } = useAuth();
  useHeartbeat(!!user);

  // Matches /levels/:difficulty/:storySlug/:trackNumber (Player route)
  // and the legacy /player route
  const isPlayerRoute =
    /^\/levels\/[^/]+\/[^/]+\/[^/]+$/.test(location.pathname) ||
    location.pathname === "/player";

  // The auth screens are a full-bleed split of their own (auth/authKit.tsx);
  // the fixed navbar floated over their dark panel and repeated the brand.
  const isAuthRoute = ["/login", "/signup", "/forgot-password"].includes(location.pathname);

  return (
    <>
      {!isPlayerRoute && !isAuthRoute && <Navbar />}
      {children}
    </>
  );
}