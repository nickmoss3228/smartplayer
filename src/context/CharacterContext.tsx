// context/CharacterContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext";
import { useWallet } from "./WalletContext";
import {
  fetchCharacter,
  purchaseCharacterItem,
  equipCharacterItem,
  setSkinTone as setSkinToneRequest,
} from "../services/characterServices";
import { CharacterState } from "../types/Character";

interface ActionResult {
  ok: boolean;
  message?: string;
}

interface CharacterContextValue {
  character: CharacterState | null;
  characterLoading: boolean;
  refreshCharacter: () => Promise<void>;
  buy: (itemId: string) => Promise<ActionResult>;
  equip: (itemId: string) => Promise<ActionResult>;
  setSkinTone: (skinTone: string) => Promise<ActionResult>;
}

const CharacterContext = createContext<CharacterContextValue>({
  character: null,
  characterLoading: true,
  refreshCharacter: async () => {},
  buy: async () => ({ ok: false }),
  equip: async () => ({ ok: false }),
  setSkinTone: async () => ({ ok: false }),
});

// Mounted once above the Router (see App.tsx, alongside ProfileProvider and
// WalletProvider) so the Navbar/Dashboard portrait and the Room's Character
// shop share the exact same state — buying an outfit in Room updates the
// Navbar icon immediately, with no separate re-fetch needed.
export const CharacterProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const { wallet, setWalletDirect } = useWallet();
  const [character, setCharacter] = useState<CharacterState | null>(null);
  const [characterLoading, setCharacterLoading] = useState(true);

  const loadCharacter = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token || !user) {
      setCharacter(null);
      setCharacterLoading(false);
      return;
    }
    try {
      const data = await fetchCharacter(token);
      setCharacter(data.character);
    } catch (err) {
      console.error("[CharacterContext] Failed to load character:", err);
    } finally {
      setCharacterLoading(false);
    }
  }, [user]);

  useEffect(() => {
    setCharacterLoading(true);
    loadCharacter();
  }, [loadCharacter]);

  const buy = useCallback(
    async (itemId: string): Promise<ActionResult> => {
      const token = localStorage.getItem("token");
      if (!token) return { ok: false, message: "Not logged in" };
      try {
        const data = await purchaseCharacterItem(token, itemId);
        setCharacter(data.character);
        setWalletDirect({ bitWord: 0, bitPhrase: 0, ...wallet, bitAward: data.bitAward });
        return { ok: true };
      } catch (err) {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Purchase failed";
        return { ok: false, message };
      }
    },
    [wallet, setWalletDirect],
  );

  const equip = useCallback(async (itemId: string): Promise<ActionResult> => {
    const token = localStorage.getItem("token");
    if (!token) return { ok: false, message: "Not logged in" };
    try {
      const data = await equipCharacterItem(token, itemId);
      setCharacter(data.character);
      return { ok: true };
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Equip failed";
      return { ok: false, message };
    }
  }, []);

  const setSkinTone = useCallback(async (skinTone: string): Promise<ActionResult> => {
    const token = localStorage.getItem("token");
    if (!token) return { ok: false, message: "Not logged in" };
    try {
      const data = await setSkinToneRequest(token, skinTone);
      setCharacter(data.character);
      return { ok: true };
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to update skin tone";
      return { ok: false, message };
    }
  }, []);

  return (
    <CharacterContext.Provider
      value={{ character, characterLoading, refreshCharacter: loadCharacter, buy, equip, setSkinTone }}
    >
      {children}
    </CharacterContext.Provider>
  );
};

export const useCharacter = () => useContext(CharacterContext);
