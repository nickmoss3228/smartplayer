import { describe, expect, it } from "vitest";
import { clipSlots, matchFilesToSlots } from "./sosClips";
import { ELEMENTS } from "./partStatus";
import type { StoryPart } from "../../../services/adminStoryServices";

const files = (...names: string[]) => names.map((name) => ({ name }));
const slots = (result: ReturnType<typeof matchFilesToSlots<{ name: string }>>) =>
  result.ok ? result.assignments.map((a) => `${a.index}:${a.file.name}`) : result;

describe("matchFilesToSlots", () => {
  it("puts numbered files on their own markers, in any order", () => {
    expect(slots(matchFilesToSlots(files("3.mp3", "1.mp3", "sentence 02.mp3"), 12))).toEqual([
      "2:3.mp3",
      "0:1.mp3",
      "1:sentence 02.mp3",
    ]);
  });

  it("re-recorded sentences replace only their own slots", () => {
    expect(slots(matchFilesToSlots(files("7.mp3", "11.mp3"), 12))).toEqual(["6:7.mp3", "10:11.mp3"]);
  });

  it("fills from sentence 1 in natural name order when the names carry no single number", () => {
    const picked = files(
      "ElevenLabs_2026-03-01T10_12_10_Michael.mp3",
      "ElevenLabs_2026-03-01T10_02_44_Michael.mp3",
      "ElevenLabs_2026-03-01T10_09_01_Michael.mp3",
    );
    expect(slots(matchFilesToSlots(picked, 5))).toEqual([
      "0:ElevenLabs_2026-03-01T10_02_44_Michael.mp3",
      "1:ElevenLabs_2026-03-01T10_09_01_Michael.mp3",
      "2:ElevenLabs_2026-03-01T10_12_10_Michael.mp3",
    ]);
  });

  it("falls back to name order when a number is out of range or repeated", () => {
    expect(slots(matchFilesToSlots(files("b 2.mp3", "a 9.mp3"), 3))).toEqual(["0:a 9.mp3", "1:b 2.mp3"]);
    expect(slots(matchFilesToSlots(files("x1.mp3", "y1.mp3"), 3))).toEqual(["0:x1.mp3", "1:y1.mp3"]);
  });

  it("refuses more clips than markers", () => {
    expect(matchFilesToSlots(files("1.mp3", "2.mp3", "3.mp3"), 2)).toEqual({
      ok: false,
      reason: "tooMany",
      picked: 3,
      markers: 2,
    });
  });
});

describe("clipSlots", () => {
  it("pads to one slot per marker and cuts clips past the last marker", () => {
    expect(clipSlots(["a"], 3)).toEqual(["a", "", ""]);
    expect(clipSlots(["a", "b", "c"], 2)).toEqual(["a", "b"]);
    expect(clipSlots(undefined, 2)).toEqual(["", ""]);
  });
});

describe("the SOS column", () => {
  const sos = ELEMENTS.find((e) => e.id === "sos")!;
  const part = (helpAudio: string[], markers: number) =>
    ({ helpAudio, timeMarkers: Array.from({ length: markers }, (_, i) => ({ time: i, label: "", color: "" })) }) as unknown as StoryPart;

  it("is optional, and reads none / some / every sentence", () => {
    expect(sos.required).toBe(false);
    expect(sos.state(part([], 3), {} as never)).toBe("na");
    expect(sos.state(part(["a", "", "c"], 3), {} as never)).toBe("partial");
    expect(sos.count!(part(["a", "", "c"], 3))).toBe(2);
    expect(sos.state(part(["a", "b", "c"], 3), {} as never)).toBe("done");
  });
});
