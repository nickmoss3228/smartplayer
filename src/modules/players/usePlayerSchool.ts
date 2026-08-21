import { useCallback, useEffect, useState } from "react";
import { fetchPlayerSchool, SchoolState } from "../../services/schoolServices";
import { fetchPlayerRoom } from "../../services/roomServices";
import { CharacterState } from "../../types/Character";

interface UsePlayerSchoolResult {
  school: SchoolState | null;
  character: Pick<CharacterState, "skinTone" | "equipped"> | null;
  nickname: string;
  loading: boolean;
  error: string | null;
}

// Visiting someone else's Dream School. Two requests rather than one because
// the character lives on its own endpoint and is shared with the old room
// view — the school endpoint deliberately returns no wallet and no character,
// keeping "what they own" separate from "what they can afford".
//
// The character request is allowed to fail softly: a school with a default
// avatar in it is still worth looking at, which is the whole point of visiting.
export function usePlayerSchool(userId: string | undefined): UsePlayerSchoolResult {
  const [school, setSchool] = useState<SchoolState | null>(null);
  const [character, setCharacter] = useState<Pick<CharacterState, "skinTone" | "equipped"> | null>(null);
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token || !userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchPlayerSchool(token, userId);
      setSchool(result.school);
      setNickname(result.nickname ?? "");

      try {
        const room = await fetchPlayerRoom(token, userId);
        setCharacter({ skinTone: room.character.skinTone, equipped: room.character.equipped });
        if (room.nickname) setNickname(room.nickname);
      } catch {
        setCharacter(null);
      }
    } catch (err) {
      console.error("Failed to load player school:", err);
      setError("Failed to load player school");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { school, character, nickname, loading, error };
}
