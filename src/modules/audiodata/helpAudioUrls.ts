// src/modules/audiodata/helpAudioUrls.ts
import { getStorageUrl } from "../../services/yandexStorage";

// ─── URL factory ──────────────────────────────────────────────────────────────
// When you're ready to move to Yandex Storage, swap ONLY this one function:
//   Before:  const helpUrl = (path: string) => `/help-audio/${path}`;
//   After:   import { getStorageUrl } from "../../services/yandexStorage";
//            const helpUrl = (path: string) => getStorageUrl(`help-audio/${path}`);
const helpUrl = (path: string) => getStorageUrl(`help-audio/${path}`)

/**
 * Generates the N sequential URLs for one track's help-audio segments.
 * File pattern:  public/help-audio/{difficulty}/{trackId}/{1…N}.mp3
 */
const makeUrls = (difficulty: string, trackId: string, count: number): string[] =>
  Array.from({ length: count }, (_, i) =>
    helpUrl(`${difficulty}/${trackId}/${i + 1}.mp3`)
  );

/**
 * Placeholder for tracks not yet recorded.
 * Empty string is falsy → HelpModal shows "No help audio for this segment yet."
 * and keeps the play button disabled, so no 404 noise in the network tab.
 */
const pending = (count = 16): string[] => Array<string>(count).fill("");

// ── Easy — Leo ────────────────────────────────────────────────────────────────
const easy1  = makeUrls("easy", "1", 16); // ✅ Leo's Life — recorded
const easy2  = pending(); // Leo's Mornings
const easy3  = pending();
const easy4  = pending();
const easy5  = pending();
const easy6  = pending();
const easy7  = pending();
const easy8  = pending();
const easy9  = pending();
const easy10 = pending();

// ── Medium — Maya ─────────────────────────────────────────────────────────────
const medium1 = pending();

// ── Hard — Daniel ─────────────────────────────────────────────────────────────
const hard1 = pending();

// ─────────────────────────────────────────────────────────────────────────────

export const helpUrlsByDifficulty: Record<string, Record<string, string[]>> = {
  easy:   { "1": easy1, "2": easy2, "3": easy3, "4": easy4, "5": easy5,
            "6": easy6, "7": easy7, "8": easy8, "9": easy9, "10": easy10 },
  medium: { "1": medium1 },
  hard:   { "1": hard1 },
};

export const getHelpAudioUrls = (
  difficulty: string,
  trackId: string,
): string[] | undefined => helpUrlsByDifficulty[difficulty]?.[trackId];