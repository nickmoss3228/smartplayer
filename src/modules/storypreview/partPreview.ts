// modules/storypreview/partPreview.ts
//
// The "before you listen" card for one part, from whatever the story has.
//
// Cards are written in the Story Builder (part.intro, both locales at once).
// When a part has nothing written, a card is still built from the part title,
// the story description and the comic page, because a card that does not exist
// is a part the learner cannot start: the dialog is the only way into the
// player.
import type { TFunction } from "i18next";
import type { LocalizedText, PartIntro } from "../../services/storyServices";

/** What the preview dialog draws. Every field is already in the reader's language. */
export interface StoryPreview {
  id: string;
  title: string;
  emoji: string;
  image: string;
  difficulty: string;
  duration: string;
  description: string;
  grammar: string[];
  topics: string[];
  tip: string;
}

export type PreviewLocale = "en" | "ru";

const otherLocale = (locale: PreviewLocale): PreviewLocale => (locale === "ru" ? "en" : "ru");

/** The reader's language, then the other one — what i18next's fallbackLng does for the built-ins. */
const inLocale = (pair: LocalizedText | null | undefined, locale: PreviewLocale): string =>
  pair?.[locale]?.trim() || pair?.[otherLocale(locale)]?.trim() || "";

/** "~48 sec" / "~2 min 14 sec", in the reader's language. Empty when unmeasured. */
export function formatPreviewDuration(seconds: number | null | undefined, t: TFunction): string {
  if (!seconds || seconds <= 0) return "";
  const total = Math.round(seconds);
  // Under three minutes reads better as seconds, which is how every built-in
  // card is written ("~140 sec").
  if (total < 180) return t("storyModal.durationSeconds", { s: total });
  return t("storyModal.durationMinutes", {
    m: Math.floor(total / 60),
    s: String(total % 60).padStart(2, "0"),
  });
}

/** What a part contributes to its card. Both the admin and the public story shapes fit. */
export interface PreviewSourcePart {
  partNumber: number;
  title?: string;
  comicUrl?: string | null;
  intro?: PartIntro | null;
}

/** What the story contributes: the fallbacks for everything the part leaves blank. */
export interface PreviewSourceStory {
  storyId: string;
  storyName: string;
  description: string;
  characterIcon?: string;
  localized?: { title: LocalizedText; description: LocalizedText } | null;
  coverUrl?: string | null;
}

/**
 * The card for one part of a published story.
 *
 * The part's own intro wins field by field, so whatever is written in the
 * Builder is what the dialog shows; anything blank is filled from the story.
 */
export function partPreviewCard({
  difficulty,
  story,
  part,
  locale,
  t,
}: {
  difficulty: string;
  story: PreviewSourceStory;
  part: PreviewSourcePart;
  locale: PreviewLocale;
  t: TFunction;
}): StoryPreview {
  const written = part.intro;
  const storyTitle = inLocale(story.localized?.title, locale) || story.storyName;
  const grammar = written?.grammar[locale]?.length
    ? written.grammar[locale]
    : (written?.grammar[otherLocale(locale)] ?? []);

  return {
    id: `${difficulty}-${story.storyId}-${part.partNumber}`,
    title: inLocale(written?.title, locale) || part.title?.trim() || `${storyTitle} — ${part.partNumber}`,
    emoji: story.characterIcon ?? "",
    image: written?.imageUrl || part.comicUrl || story.coverUrl || "",
    difficulty: t(`levelProgress.${difficulty}Title`),
    duration: formatPreviewDuration(written?.durationSeconds, t),
    // The reader's language before a fuller text in the other one: a Russian
    // title over an English paragraph reads as a bug, a shorter Russian
    // paragraph does not.
    description:
      written?.description[locale]?.trim() ||
      story.localized?.description?.[locale]?.trim() ||
      inLocale(written?.description, locale) ||
      inLocale(story.localized?.description, locale) ||
      story.description,
    grammar,
    topics: [],
    tip: inLocale(written?.tip, locale),
  };
}
