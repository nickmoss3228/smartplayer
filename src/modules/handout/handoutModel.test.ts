import { describe, expect, it } from "vitest";
import { buildHandoutModel, pairTranslation, type HandoutLabels } from "./handoutModel";
import type { PartHandout } from "./handoutApi";

const labels = new Proxy({}, { get: (_, key) => String(key) }) as HandoutLabels;

const handout = (over: Partial<PartHandout> = {}): PartHandout => ({
  difficulty: "easy",
  storyId: "leo",
  storyName: "Leo",
  storyTitle: { en: "Leo", ru: "Лео" },
  totalParts: 10,
  partNumber: 1,
  title: "Leo's Life",
  intro: {
    title: { en: "Leo's Life", ru: "Жизнь Лео" },
    description: { en: "Meet Leo.", ru: "" },
    grammar: { en: ["Present Simple"], ru: [] },
    tip: { en: "", ru: "Слушай внимательно." },
    imageUrl: null,
    durationSeconds: 48,
  },
  comicUrl: "/assets/leo/comics/1. Meet Leo.jpg",
  text: [
    [{ text: "I live in a " }, { text: "flat", word: 0 }, { text: "." }],
    [{ text: "I " }, { text: "wake up", word: 1 }, { text: " early." }],
  ],
  translation: ["Я живу в квартире.", "Я рано встаю."],
  words: [
    { kind: "vocabulary", en: "flat", ru: "квартира", definition: "" },
    { kind: "phrasal", en: "wake up", ru: "просыпаться", definition: "" },
  ],
  ...over,
});

describe("pairTranslation", () => {
  it("pairs paragraph for paragraph", () => {
    expect(pairTranslation(2, ["a", "b"])).toEqual(["a", "b"]);
  });

  it("leaves blanks when the translation is short or missing", () => {
    expect(pairTranslation(3, ["a"])).toEqual(["a", "", ""]);
    expect(pairTranslation(2, null)).toEqual(["", ""]);
  });

  it("keeps extra translated paragraphs on the last one instead of dropping them", () => {
    expect(pairTranslation(2, ["a", "b", "c", "d"])).toEqual(["a", "b c d"]);
  });
});

describe("buildHandoutModel", () => {
  it("reads the reader's language, falling back to the other one field by field", () => {
    const model = buildHandoutModel(handout(), "ru", labels);
    expect(model.storyTitle).toBe("Лео");
    expect(model.partTitle).toBe("Жизнь Лео");
    expect(model.description).toBe("Meet Leo.");
    expect(model.grammar).toEqual(["Present Simple"]);
    expect(model.tip).toBe("Слушай внимательно.");
  });

  it("numbers the words across both lists, and the text points at those numbers", () => {
    const model = buildHandoutModel(handout(), "en", labels);
    expect(model.vocabulary).toEqual([{ n: 1, en: "flat", ru: "квартира" }]);
    expect(model.phrasal).toEqual([{ n: 2, en: "wake up", ru: "просыпаться" }]);
    expect(model.paragraphs[0].runs[1]).toEqual({ text: "flat", word: 1 });
    expect(model.paragraphs[1].runs[1]).toEqual({ text: "wake up", word: 2 });
  });

  it("pairs translations and says whether there are any", () => {
    expect(buildHandoutModel(handout(), "ru", labels).paragraphs[1].translation).toBe("Я рано встаю.");
    const none = buildHandoutModel(handout({ translation: null }), "ru", labels);
    expect(none.hasTranslation).toBe(false);
    expect(none.paragraphs[0].translation).toBe("");
  });

  it("uses the level's colours and a safe file name", () => {
    const model = buildHandoutModel(handout({ difficulty: "hard", storyId: "news-roland-garros" }), "en", labels);
    expect(model.palette.accent).toBe("#9810fa");
    expect(model.fileName).toBe("malako-news-roland-garros-part-1.pdf");
  });
});
