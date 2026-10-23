// modules/handout/fonts.ts
//
// Manrope for the PDF, from src/assets/fonts/handout. @fontsource ships the
// font split by alphabet, and a PDF font has no unicode-range; registered as
// two families, react-pdf broke lines and drew a missing-glyph box wherever a
// Russian word met punctuation. So each weight there is ONE file: fontsource's
// latin, latin-ext and cyrillic halves merged with fontTools
// (`fontTools.merge.Merger`, woff -> ttf). Manrope is OFL-licensed.
import { Font } from "@react-pdf/renderer";

export const HANDOUT_FONT = "Manrope";
export const HANDOUT_WEIGHTS = [400, 700, 800] as const;
export type HandoutWeight = (typeof HANDOUT_WEIGHTS)[number];

let registered = false;

export function registerHandoutFonts(srcFor: (weight: HandoutWeight) => string) {
  if (registered) return;
  registered = true;
  Font.register({
    family: HANDOUT_FONT,
    fonts: HANDOUT_WEIGHTS.map((fontWeight) => ({ src: srcFor(fontWeight), fontWeight })),
  });
  // Break lines between words only. The default hyphenator splits English
  // words, which is the last thing a learner needs on the page.
  Font.registerHyphenationCallback((word) => [word]);
}
