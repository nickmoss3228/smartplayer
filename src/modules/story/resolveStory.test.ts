import { describe, it, expect } from "vitest";
import { resolveStory, findResolvedTrack, staticVocabClipUrl } from "./resolveStory";
import type { PublishedStory } from "../../services/storyServices";

/**
 * Guards the rule that a story resolves from exactly ONE source.
 *
 * The bug these exist to prevent: the app used to answer "where does this
 * story's content come from?" independently in about ten places. Tracks came
 * from the database while the vocabulary chips came from the static tables, so
 * a published story was only ever half itself — editing a word in the Story
 * Builder changed the Vocab Quiz but not the chips beside the waveform, and the
 * two could show different word lists for the same track at the same time.
 *
 * The invariant below is deliberately phrased as "nothing static leaks in",
 * because a merge that looks reasonable field-by-field is exactly how the
 * original defect was written.
 */

// A DB story whose every value differs from the static leo story, so a leak is
// detectable rather than coincidentally equal.
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

describe("resolveStory — branch selection", () => {
  it("uses the static branch when there is no published story", () => {
    expect(resolveStory("easy", "leo", null).source).toBe("static");
  });

  it("uses the DB branch when a published story is supplied", () => {
    expect(resolveStory("easy", "leo", dbStory()).source).toBe("db");
  });
});

describe("resolveStory — the invariant: no static leaks into a DB story", () => {
  const staticLeo = resolveStory("easy", "leo", null);
  const resolved = resolveStory("easy", "leo", dbStory());

  it("takes track titles, audio and comics from the DB", () => {
    const track = findResolvedTrack(resolved, "1")!;
    expect(track.title).toBe("DB Part One");
    expect(track.audio).toBe("https://db.example/part1.mp3");
    expect(track.comicUrl).toBe("https://db.example/comic1.jpg");
    expect(track.helpAudio).toEqual(["https://db.example/help1.mp3"]);
  });

  // The specific defect: chips read the static table while the quiz read the DB.
  it("takes vocabulary and phrasal verbs from the DB, never the static table", () => {
    const track = findResolvedTrack(resolved, "1")!;
    expect(track.vocabulary.map((w) => w.audioKey)).toEqual(["db-word"]);
    expect(track.phrasalVerbs.map((w) => w.audioKey)).toEqual(["db-phrasal"]);

    const staticKeys = findResolvedTrack(staticLeo, "1")!.vocabulary.map((w) => w.audioKey);
    expect(staticKeys.length).toBeGreaterThan(0); // the fixture is meaningful
    for (const key of staticKeys) {
      expect(track.vocabulary.map((w) => w.audioKey)).not.toContain(key);
    }
  });

  it("plays DB clip URLs rather than rebuilding a bucket path", () => {
    const track = findResolvedTrack(resolved, "1")!;
    expect(track.vocabulary[0].audioUrl).toBe("https://db.example/w.mp3");
    expect(track.vocabulary[0].audioUrl).not.toContain("/quiz/");
  });

  it("leaves a DB part with no comic empty instead of borrowing the built-in art", () => {
    const track = findResolvedTrack(resolved, "2")!;
    expect(track.comicUrl).toBeNull();
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

describe("resolveStory — the static branch", () => {
  it("gives every built-in story tracks with resolvable vocabulary clips", () => {
    for (const [difficulty, slug] of [
      ["easy", "leo"],
      ["easy", "leo-additional"],
      ["medium", "maya"],
      ["hard", "daniel"],
    ] as const) {
      const story = resolveStory(difficulty, slug, null);
      expect(story.tracks.length, `${difficulty}/${slug} has tracks`).toBeGreaterThan(0);
      for (const track of story.tracks) {
        for (const word of [...track.vocabulary, ...track.phrasalVerbs]) {
          expect(word.audioUrl, `${slug} part ${track.id} "${word.audioKey}"`).not.toBe("");
        }
      }
    }
  });

  // comicsData's manifest is keyed by difficulty, so it names the level's
  // built-in character. Any other story on that level must not inherit it.
  it("does not lend the built-in character's comics to another story on the level", () => {
    const leo = resolveStory("easy", "leo", null);
    const additional = resolveStory("easy", "leo-additional", null);

    expect(leo.tracks[0].comicUrl).toBeTruthy();
    const leoComics = new Set(leo.tracks.map((t) => t.comicUrl));
    for (const track of additional.tracks) {
      if (track.comicUrl) expect(leoComics.has(track.comicUrl)).toBe(false);
    }
  });

  it("lowercases the audioKey when building a clip path", () => {
    // The chips used to use the raw key while preloading lowercased it, so a
    // capitalised key warmed one object and then played a different one.
    const upper = staticVocabClipUrl("easy", "leo", "1", "Busy", "vocab");
    const lower = staticVocabClipUrl("easy", "leo", "1", "busy", "vocab");
    expect(upper).toBe(lower);
    expect(lower).toContain("/vocab/busy.mp3");
  });

  it("returns an empty URL for a story with no folder mapping", () => {
    expect(staticVocabClipUrl("easy", "not-a-story", "1", "word", "vocab")).toBe("");
  });
});
