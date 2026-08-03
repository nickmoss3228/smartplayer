import { useEffect, useRef, useState } from "react";
import { searchPlayers, PlayerListItem } from "../../services/profileServices";

const DEBOUNCE_MS = 350;
export const SEARCH_MIN_LENGTH = 2;

interface UsePlayerSearchResult {
  query: string;
  setQuery: (q: string) => void;
  players: PlayerListItem[];
  loading: boolean;
  error: string | null;
  searched: boolean;
}

export function usePlayerSearch(): UsePlayerSearchResult {
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<PlayerListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < SEARCH_MIN_LENGTH) {
      setPlayers([]);
      setError(null);
      setSearched(false);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    const requestId = ++requestIdRef.current;
    setLoading(true);
    const timeoutId = setTimeout(async () => {
      try {
        const data = await searchPlayers(token, trimmed);
        if (requestId !== requestIdRef.current) return; // stale response
        setPlayers(data.players);
        setError(null);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        console.error("Failed to search players:", err);
        setError("Failed to search players");
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setSearched(true);
        }
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [query]);

  return { query, setQuery, players, loading, error, searched };
}
