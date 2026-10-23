// modules/handout/handoutModel.ts
//
// From the server's handout to what a page draws: every string already in the
// reader's language, paragraphs paired with their translation, and the words
// numbered so the text can point at the glossary. Pure, so HandoutDocument.tsx
// only lays it out.
import type { HandoutWord, PartHandout } from "./handoutApi";

export type HandoutLocale = "en" | "ru";

/** Interface strings, from i18n (`handout.*`). */
export interface HandoutLabels {
  site: string;
  level: string;
  fat: string;
  part: string;
  grammar: string;
  tip: string;
  text: string;
  vocabulary: string;
  phrasal: string;
  english: string;
  russian: string;
}

/**
 * The level's hue, as print colours. They mirror Tailwind's green / orange /
 * purple (600, 800, 100, 50), the same hues as themes[level].accent: a PDF
 * cannot read the app's CSS variables.
 */
export interface HandoutPalette {
  accent: string;
  ink: string;
  tint: string;
  wash: string;
}

const PALETTES: Record<string, HandoutPalette> = {
  easy: { accent: "#00a63e", ink: "#016630", tint: "#dcfce7", wash: "#f0fdf4" },
  medium: { accent: "#f54900", ink: "#9f2d00", tint: "#ffedd4", wash: "#fff7ed" },
  hard: { accent: "#9810fa", ink: "#6e11b0", tint: "#f3e8ff", wash: "#faf5ff" },
};

export interface NumberedWord {
  /** 1-based, across vocabulary and phrasal verbs, as the text's marks show it. */
  n: number;
  en: string;
  ru: string;
}

export interface HandoutParagraph {
  n: number;
  runs: { text: string; word?: number }[];
  /** The paragraph's translation; empty when there is none. */
  translation: string;
}

export interface HandoutModel {
  palette: HandoutPalette;
  labels: HandoutLabels;
  storyTitle: string;
  partTitle: string;
  partNumber: number;
  totalParts: number;
  description: string;
  grammar: string[];
  tip: string;
  comicUrl: string | null;
  paragraphs: HandoutParagraph[];
  hasTranslation: boolean;
  vocabulary: NumberedWord[];
  phrasal: NumberedWord[];
  fileName: string;
}

const other = (locale: HandoutLocale): HandoutLocale => (locale === "ru" ? "en" : "ru");

const pick = (pair: { en: string; ru: string } | null | undefined, locale: HandoutLocale) =>
  pair?.[locale]?.trim() || pair?.[other(locale)]?.trim() || "";

/**
 * Russian paragraph i for English paragraph i. The author lines them up, but a
 * miscount must not drop text: what is left over joins the last paragraph.
 */
export function pairTranslation(count: number, translation: string[] | null): string[] {
  if (!translation?.length || count === 0) return Array.from({ length: count }, () => "");
  const paired = Array.from({ length: count }, (_, i) => translation[i] ?? "");
  if (translation.length > count) {
    paired[count - 1] = [paired[count - 1], ...translation.slice(count)].filter(Boolean).join(" ");
  }
  return paired;
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function buildHandoutModel(
  handout: PartHandout,
  locale: HandoutLocale,
  labels: HandoutLabels,
): HandoutModel {
  const intro = handout.intro;
  const grammar = intro?.grammar[locale]?.length ? intro.grammar[locale] : (intro?.grammar[other(locale)] ?? []);

  // The text's marks number the words in the glossary's order: vocabulary,
  // then phrasal verbs, each in the author's order.
  const numbered = handout.words.map((w: HandoutWord, i) => ({ ...w, n: i + 1 }));
  const translations = pairTranslation(handout.text.length, handout.translation);

  return {
    palette: PALETTES[handout.difficulty] ?? PALETTES.easy,
    labels,
    storyTitle: pick(handout.storyTitle, locale) || handout.storyName,
    partTitle: pick(intro?.title, locale) || handout.title || `${handout.storyName} ${handout.partNumber}`,
    partNumber: handout.partNumber,
    totalParts: handout.totalParts,
    description: pick(intro?.description, locale),
    grammar: grammar.map((g) => g.trim()).filter(Boolean),
    tip: pick(intro?.tip, locale),
    comicUrl: handout.comicUrl,
    paragraphs: handout.text.map((runs, i) => ({
      n: i + 1,
      runs: runs.map((run) => (run.word === undefined ? { text: run.text } : { text: run.text, word: run.word + 1 })),
      translation: translations[i],
    })),
    hasTranslation: Boolean(handout.translation?.length),
    vocabulary: numbered.filter((w) => w.kind === "vocabulary").map(({ n, en, ru }) => ({ n, en, ru })),
    phrasal: numbered.filter((w) => w.kind === "phrasal").map(({ n, en, ru }) => ({ n, en, ru })),
    fileName: `malako-${slug(handout.storyId) || "story"}-part-${handout.partNumber}.pdf`,
  };
}
