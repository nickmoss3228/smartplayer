// modules/vocab/vocabBookmarks.ts
//
// The student's bookmarked words, shared by every screen that shows a word:
// the player's word window, the word game, the копилка. One store, so a word
// bookmarked in the game is already marked when the word window opens.
//
// A signed-in student's bookmarks live on the server; a guest's in the
// browser (services/guestProgress.ts), which AuthContext folds into the
// account at signup like learned words. Which of the two is read is decided
// by the session token at load time, and the store reloads when it changes.
//
// Taps are optimistic: the mark flips at once, and a failed request flips it
// back. The server answers with the whole list, which then replaces ours, so
// two tabs cannot drift apart for long.

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { useAuth } from "../../context/AuthContext";
import { getGuestVocabBookmarks, setGuestVocabBookmark } from "../../services/guestProgress";
import { fetchVocabBookmarks, setVocabBookmark } from "../../services/vocabProgressServices";

interface State {
  /** Newest first. */
  keys: string[];
  /** Whose bookmarks these are: a user id, "guest", or null before the first load. */
  owner: string | null;
}

let state: State = { keys: [], owner: null };
let loading: string | null = null;
const listeners = new Set<() => void>();
const NONE: string[] = [];

const emit = (next: State) => {
  state = next;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const snapshot = () => state;

const token = () => {
  try {
    return localStorage.getItem("token");
  } catch {
    return null;
  }
};

async function load(owner: string) {
  if (state.owner === owner || loading === owner) return;
  loading = owner;
  try {
    const t = token();
    const keys = owner !== "guest" && t ? await fetchVocabBookmarks(t) : getGuestVocabBookmarks();
    if (loading === owner) emit({ keys, owner });
  } catch {
    // Leave the marks empty rather than wrong; the next screen that mounts retries.
  } finally {
    if (loading === owner) loading = null;
  }
}

export interface VocabBookmarks {
  /** Newest first. */
  keys: string[];
  has: (key: string) => boolean;
  /** Set a word's bookmark; with no `on`, flip it. */
  toggle: (key: string, on?: boolean) => void;
  ready: boolean;
}

export function useVocabBookmarks(): VocabBookmarks {
  const { user } = useAuth();
  const owner = user ? user.id : "guest";
  const current = useSyncExternalStore(subscribe, snapshot, snapshot);

  useEffect(() => {
    void load(owner);
  }, [owner]);

  const keys = useMemo(() => (current.owner === owner ? current.keys : NONE), [current, owner]);

  const has = useCallback((key: string) => keys.includes(key.toLowerCase()), [keys]);

  const toggle = useCallback(
    (raw: string, on?: boolean) => {
      const key = raw.toLowerCase();
      const before = state.keys;
      const next = on ?? !before.includes(key);
      const rest = before.filter((k) => k !== key);
      emit({ owner, keys: next ? [key, ...rest] : rest });

      const t = token();
      if (owner === "guest" || !t) {
        setGuestVocabBookmark(key, next);
        return;
      }
      setVocabBookmark(t, key, next)
        .then((keys) => {
          if (state.owner === owner) emit({ owner, keys });
        })
        .catch(() => {
          if (state.owner === owner) emit({ owner, keys: before });
        });
    },
    [owner],
  );

  return { keys, has, toggle, ready: current.owner === owner };
}
