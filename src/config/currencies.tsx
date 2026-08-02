// Shared source of truth for the 3 in-app currencies (Dashboard wallet, Navbar
// chips, StoryPreviewModal "earn" blurb, Quiz/VocabQuiz reward badges) so the
// icon/color per currency never drifts between surfaces.
import {
  IoDiamondOutline,
  IoBookmarkOutline,
  IoChatbubbleEllipsesOutline,
} from "react-icons/io5";
import { Wallet } from "../types/Wallet";

export interface CurrencyMeta {
  key: keyof Wallet;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  /** bg+text classes for a filled chip (Dashboard-style) */
  chipClasses: string;
  /** text-only color for compact badges/inline mentions */
  textClasses: string;
}

export const CURRENCIES: CurrencyMeta[] = [
  {
    key: "bitAward",
    label: "BitAward",
    icon: IoDiamondOutline,
    chipClasses: "bg-amber-50 text-amber-600",
    textClasses: "text-amber-600",
  },
  {
    key: "bitWord",
    label: "BitWord",
    icon: IoBookmarkOutline,
    chipClasses: "bg-sky-50 text-sky-600",
    textClasses: "text-sky-600",
  },
  {
    key: "bitPhrase",
    label: "BitPhrase",
    icon: IoChatbubbleEllipsesOutline,
    chipClasses: "bg-emerald-50 text-emerald-600",
    textClasses: "text-emerald-600",
  },
];

// Must stay in sync with backend/src/config/currency.js — the server is the
// source of truth for actual awards, this is only for the pre-earn UI blurb
// and the post-quiz reward badge.
export const QUIZ_PASS_BITAWARD = 5;
export const PHRASE_REPEAT_BITPHRASE: Record<number, number> = { 1: 0, 2: 1, 3: 2 };
