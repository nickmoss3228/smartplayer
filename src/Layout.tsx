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

  return (
    <>
      {!isPlayerRoute && <Navbar />}
      {children}
    </>
  );
}