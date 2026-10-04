import { describe, it, expect } from "vitest";
import i18n from "i18next";
import en from "../../locales/en/translation.json";
import ru from "../../locales/ru/translation.json";
import {
  formatPreviewDuration,
  partPreviewCard,
  type PreviewSourceStory,
} from "./partPreview";
import type { PartIntro } from "../../services/storyServices";

/**
 * Guards the one promise the Story Builder's preview panel makes: what the
 * admin writes is what the level page's dialog shows, in the reader's language
 * — and a part with nothing written still gets a card, because the dialog is
 * the only way from the level grid into the player.
 */

const translator = i18n.createInstance();
await translator.init({
  resources: { en: { translation: en }, ru: { translation: ru } },
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});
const tEn = translator.getFixedT("en");
const tRu = translator.getFixedT("ru");

const story = (over: Partial<PreviewSourceStory> = {}): PreviewSourceStory => ({
  storyId: "builder-story",
  storyName: "Internal name",
  description: "legacy description",
  localized: {
    title: { en: "The Title", ru: "Заголовок" },
    description: { en: "Story in English", ru: "История по-русски" },
  },
  coverUrl: "https://cdn.example/cover.jpg",
  ...over,
});

const intro = (over: Partial<PartIntro> = {}): PartIntro => ({
  title: { en: "Part one", ru: "Часть первая" },
  description: { en: "What happens", ru: "Что происходит" },
  grammar: { en: ["Past Simple"], ru: ["Прошедшее время"] },
  tip: { en: "Listen for numbers", ru: "Слушай числа" },
  imageUrl: "https://cdn.example/intro.jpg",
  durationSeconds: 134,
  ...over,
});

describe("partPreviewCard", () => {
  it("shows what the admin wrote, in the reader's language", () => {
    const part = { partNumber: 1, title: "track", comicUrl: "https://cdn.example/comic.jpg", intro: intro() };
    const ruCard = partPreviewCard({ difficulty: "easy", story: story(), part, locale: "ru", t: tRu });
    expect(ruCard).toMatchObject({
      title: "Часть первая",
      description: "Что происходит",
      grammar: ["Прошедшее время"],
      tip: "Слушай числа",
      image: "https://cdn.example/intro.jpg",
      difficulty: ru.levelProgress.easyTitle,
      duration: "~134 сек",
    });
    const enCard = partPreviewCard({ difficulty: "easy", story: story(), part, locale: "en", t: tEn });
    expect(enCard.title).toBe("Part one");
    expect(enCard.duration).toBe("~134 sec");
  });

  it("still makes a card when nothing is written — the story fills it", () => {
    const card = partPreviewCard({
      difficulty: "medium",
      story: story(),
      part: { partNumber: 3, title: "Discussion", comicUrl: "https://cdn.example/comic3.jpg" },
      locale: "ru",
      t: tRu,
    });
    expect(card.title).toBe("Discussion");
    expect(card.description).toBe("История по-русски");
    expect(card.image).toBe("https://cdn.example/comic3.jpg");
    expect(card.grammar).toEqual([]);
    expect(card.tip).toBe("");
    expect(card.duration).toBe("");
  });

  it("prefers the story's text in the reader's language over the part's in the other", () => {
    const card = partPreviewCard({
      difficulty: "easy",
      story: story(),
      part: { partNumber: 1, intro: intro({ description: { en: "Only English", ru: "" } }) },
      locale: "ru",
      t: tRu,
    });
    expect(card.description).toBe("История по-русски");
  });

  it("falls back across languages rather than showing nothing", () => {
    const card = partPreviewCard({
      difficulty: "easy",
      story: story({ localized: null, description: "" }),
      part: { partNumber: 1, intro: intro({ title: { en: "English only", ru: "" }, description: { en: "Text", ru: "" } }) },
      locale: "ru",
      t: tRu,
    });
    expect(card.title).toBe("English only");
    expect(card.description).toBe("Text");
  });

  it("names an untitled part after the story, and uses the cover when there is no art", () => {
    const card = partPreviewCard({
      difficulty: "easy",
      story: story(),
      part: { partNumber: 2 },
      locale: "en",
      t: tEn,
    });
    expect(card.title).toBe("The Title — 2");
    expect(card.image).toBe("https://cdn.example/cover.jpg");
  });

  it("uses what the admin wrote, and nothing else", () => {
    const written = partPreviewCard({
      difficulty: "easy",
      story: story({ storyId: "leo" }),
      part: { partNumber: 1, intro: intro() },
      locale: "ru",
      t: tRu,
    });
    expect(written.title).toBe("Часть первая");
  });
});

describe("durations", () => {
  it("formats a measured duration for the card", () => {
    expect(formatPreviewDuration(48, tEn)).toBe("~48 sec");
    expect(formatPreviewDuration(188, tEn)).toBe("~3 min 08 sec");
    expect(formatPreviewDuration(0, tEn)).toBe("");
  });
});
