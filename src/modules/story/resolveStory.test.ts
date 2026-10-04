import { describe, it, expect } from "vitest";
import { resolveStory, findResolvedTrack, withLocalizedTitles } from "./resolveStory";
import type { PublishedStory } from "../../services/storyServices";

/**
 * Guards the rule that a story resolves from exactly ONE source — its
 * published copy. The app used to answer "where does this story's content
 * come from?" in about ten places, and a published story was only ever half
 * itself (tracks from the database, vocabulary chips from a static table).
 */

// A published story with recognisable values throughout.
const dbStory = (over: Partial<PublishedStory> = {}): PublishedStory => ({
  storyId: "leo",
  storyName: "DB Leo",
  description: "from the database",
  characterIcon: "🤖",
  totalParts: 2,
  parts: [
    {
      partNumber: 1,
      title: "DB Part One",
      audioUrl: "https://db.example/part1.mp3",
      helpAudio: ["https://db.example/help1.mp3"],
      comicUrl: "https://db.example/comic1.jpg",
      timeMarkers: [
        { time: 0, label: "1", color: "red" },
        { time: 9, label: "2", color: "red" },
      ],
      vocabulary: [
        { word: "дб-слово", definition: "1", audioKey: "db-word", audioUrl: "https://db.example/w.mp3" },
      ],
      phrasalVerbs: [
        { word: "дб-фраза", definition: "1", audioKey: "db-phrasal", audioUrl: "https://db.example/p.mp3" },
      ],
      quiz: [],
    },
    {
      partNumber: 2,
      title: "DB Part Two",
      audioUrl: "https://db.example/part2.mp3",
      helpAudio: [],
      comicUrl: null,
      timeMarkers: [
        { time: 0, label: "1", color: "red" },
        { time: 5, label: "2", color: "red" },
      ],
      vocabulary: [],
      phrasalVerbs: [],
      quiz: [],
    },
  ],
  ...over,
});

describe("resolveStory — one source", () => {
  it("has no tracks until the published story has arrived", () => {
    const resolved = resolveStory("easy", "leo", null);
    expect(resolved.source).toBe("db");
    expect(resolved.tracks).toEqual([]);
  });

  const resolved = resolveStory("easy", "leo", dbStory());

  it("takes track titles, audio and comics from the published story", () => {
    const track = findResolvedTrack(resolved, "1")!;
    expect(track.title).toBe("DB Part One");
    expect(track.audio).toBe("https://db.example/part1.mp3");
    expect(track.comicUrl).toBe("https://db.example/comic1.jpg");
    expect(track.helpAudio).toEqual(["https://db.example/help1.mp3"]);
  });

  it("takes vocabulary and phrasal verbs from the same part", () => {
    const track = findResolvedTrack(resolved, "1")!;
    expect(track.vocabulary.map((w) => w.audioKey)).toEqual(["db-word"]);
    expect(track.phrasalVerbs.map((w) => w.audioKey)).toEqual(["db-phrasal"]);
  });

  it("plays the stored clip URLs rather than rebuilding a bucket path", () => {
    const track = findResolvedTrack(resolved, "1")!;
    expect(track.vocabulary[0].audioUrl).toBe("https://db.example/w.mp3");
  });

  it("leaves a part with no comic empty", () => {
    expect(findResolvedTrack(resolved, "2")!.comicUrl).toBeNull();
  });
});

describe("resolveStory — parts are never dropped or renumbered", () => {
  // Dropping a part shifted every track after it, so opening part 5 played a
  // different one while the vocabulary panel still showed part 5.
  it("keeps a part that has no audio, with its number intact", () => {
    const story = dbStory();
    story.parts[0].audioUrl = null;
    const resolved = resolveStory("easy", "leo", story);

    expect(resolved.tracks).toHaveLength(2);
    expect(resolved.tracks.map((t) => t.id)).toEqual(["1", "2"]);
    expect(findResolvedTrack(resolved, "1")!.audio).toBe("");
    expect(findResolvedTrack(resolved, "2")!.audio).toBe("https://db.example/part2.mp3");
  });

  it("orders tracks by part number even if the document is out of order", () => {
    const story = dbStory();
    story.parts.reverse();
    expect(resolveStory("easy", "leo", story).tracks.map((t) => t.id)).toEqual(["1", "2"]);
  });

  it("falls back to a generated title only when the part has none", () => {
    const story = dbStory();
    story.parts[0].title = "";
    expect(findResolvedTrack(resolveStory("easy", "leo", story), "1")!.title).toBe("DB Leo — 1");
  });
});

describe("withLocalizedTitles", () => {
  const intro = (en: string, ru: string) => ({
    title: { en, ru },
    description: { en: "", ru: "" },
    grammar: { en: [], ru: [] },
    tip: { en: "", ru: "" },
    imageUrl: null,
    durationSeconds: null,
  });

  it("names a part from its card in the reader's language", () => {
    const story = dbStory();
    story.parts[0].intro = intro("Card title", "Заголовок карточки");
    const resolved = resolveStory("easy", "leo", story);
    expect(withLocalizedTitles(resolved, story, "ru")[0].title).toBe("Заголовок карточки");
    expect(withLocalizedTitles(resolved, story, "en")[0].title).toBe("Card title");
  });

  it("keeps the part's own name when its card has no title", () => {
    const story = dbStory();
    story.parts[0].intro = intro("", "");
    expect(withLocalizedTitles(resolveStory("easy", "leo", story), story, "ru")[0].title).toBe("DB Part One");
  });

  it("leaves a story with no published copy alone", () => {
    const empty = resolveStory("easy", "leo", null);
    expect(withLocalizedTitles(empty, null, "en")).toBe(empty.tracks);
  });
});
