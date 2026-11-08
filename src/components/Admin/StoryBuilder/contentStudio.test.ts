import { describe, expect, it } from "vitest";
import type { AdminStory, StoryPart } from "../../../services/adminStoryServices";
import { validPartCount } from "../../../types/content";
import { storyReadiness } from "./partStatus";
import { studentPreviewTrack, studentPreviewWords } from "./studentPreviewData";

const part: StoryPart = {
  partNumber: 1,
  title: "Part one",
  audioUrl: "https://example.test/prompt.mp3",
  timeMarkers: [{ time: 0, label: "PRIVATE SPOKEN PROMPT", color: "#e5484d" }],
  transcript: "PRIVATE SPOKEN PROMPT",
  translation: "PRIVATE TRANSLATION",
  vocabulary: [], phrasalVerbs: [], quiz: [],
};

const story = (over: Partial<AdminStory> = {}): AdminStory => ({
  _id: "test-story", difficulty: "easy", storyId: "vowels", storyName: "Vowels",
  description: "", characterIcon: "", totalParts: 1, published: false,
  parts: [part], createdAt: "2026-11-02", ...over,
});

describe("Story Builder rules", () => {
  it("accepts any part count from 1 to 20, and nothing outside it", () => {
    for (const count of [1, 7, 13, 20]) expect(validPartCount(count)).toBe(true);
    for (const count of [0, -1, 1.5, NaN, Infinity, 21, 1_000_000]) expect(validPartCount(count)).toBe(false);
  });

  it("names what a story part still owes", () => {
    expect(storyReadiness(story()).gaps.map((gap) => gap.element.id)).toEqual(["comic", "vocab", "quiz"]);
  });
});

describe("the listening-only student preview", () => {
  it("never passes spoken text, subtitles, translations or marker text to the player", () => {
    const track = studentPreviewTrack(story(), part);
    expect(track.audio).toBe(part.audioUrl);
    expect(track.subtitles).toEqual([]);
    expect(track.timeMarkers).toEqual([{ time: 0, label: "1", color: "#e5484d" }]);
    expect(JSON.stringify(track)).not.toContain("PRIVATE");
  });

  it("keeps current slowed copies and discards copies of replaced audio", () => {
    const slowAudio = { source: part.audioUrl!, copies: { "0.8": "https://example.test/slow.mp3" } };
    expect(studentPreviewTrack(story(), { ...part, slowAudio }).slowCopies).toEqual(slowAudio.copies);
    expect(studentPreviewTrack(story(), { ...part, audioUrl: "https://example.test/new.mp3", slowAudio }).slowCopies).toEqual({});
  });

  it("preserves vocabulary clips while stripping private transcript anchors", () => {
    const words = studentPreviewWords([{ word: "ручка", definition: "", audioKey: "pen", audioUrl: "https://example.test/pen.mp3", anchor: "PRIVATE ANCHOR" }]);
    expect(words[0].audioUrl).toBe("https://example.test/pen.mp3");
    expect(words[0]).not.toHaveProperty("anchor");
  });
});
