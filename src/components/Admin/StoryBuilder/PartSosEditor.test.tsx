// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminStory, StoryPart } from "../../../services/adminStoryServices";
import PartSosEditor from "./PartSosEditor";
import i18n from "../../../i18n";

const api = vi.hoisted(() => ({
  uploadPartAsset: vi.fn(),
  saveHelpAudio: vi.fn(),
}));
vi.mock("../../../services/adminStoryServices", () => api);

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root, container: HTMLDivElement;

const marker = (time: number) => ({ time, label: "", color: "red" });
const part = (over: Partial<StoryPart> = {}): StoryPart => ({
  partNumber: 1, title: "", audioUrl: "https://x.test/a.mp3",
  timeMarkers: [marker(0), marker(2.5), marker(4.5)], helpAudio: [],
  vocabulary: [], phrasalVerbs: [], quiz: [], ...over,
});
const story = { _id: "s1", parts: [] } as unknown as AdminStory;

beforeEach(async () => {
  await i18n.changeLanguage("en");
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  api.uploadPartAsset.mockReset();
  api.saveHelpAudio.mockReset();
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

const show = (p: StoryPart, onPartUpdated = vi.fn(), onEditMarkers = vi.fn()) =>
  act(async () => root.render(
    <PartSosEditor token="t" story={story} part={p} onPartUpdated={onPartUpdated} onEditMarkers={onEditMarkers} />,
  ));

describe("PartSosEditor", () => {
  it("asks for the markers first when the part has none", async () => {
    const onEditMarkers = vi.fn();
    await show(part({ timeMarkers: [] }), vi.fn(), onEditMarkers);
    expect(container.textContent).toContain("Set the markers first");
    expect(container.querySelector("ol")).toBeNull();
    const go = Array.from(container.querySelectorAll("button")).find((b) => b.textContent === "Go to Audio & markers")!;
    await act(async () => go.click());
    expect(onEditMarkers).toHaveBeenCalled();
  });

  it("shows one row per marker, with the clips already uploaded", async () => {
    await show(part({ helpAudio: ["https://x.test/1.mp3"] }));
    const rows = container.querySelectorAll("ol > li");
    expect(rows).toHaveLength(3);
    expect(rows[0].textContent).toContain("0:00.0–0:02.5");
    expect(rows[0].textContent).toContain("SOS clip");
    expect(rows[1].textContent).toContain("Add clip");
    expect(rows[2].textContent).toContain("end");
    expect(container.textContent).toContain("SOS clips: 1 of 3 sentences.");
  });

  it("uploads dropped clips to their numbered sentences and saves them in one go", async () => {
    api.uploadPartAsset.mockImplementation(async (_t, _id, _n, file: File, kind, extra) => `https://x.test/${kind}-${extra.index}-${file.name}`);
    const saved = vi.fn();
    api.saveHelpAudio.mockImplementation(async (_t, _id, _n, helpAudio: string[]) => part({ helpAudio }));
    await show(part(), saved);

    const input = container.querySelector<HTMLInputElement>('input[type="file"][multiple]')!;
    const files = ["3.mp3", "1.mp3"].map((name) => new File(["x"], name, { type: "audio/mpeg" }));
    Object.defineProperty(input, "files", { value: files });
    await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));

    expect(api.uploadPartAsset).toHaveBeenCalledTimes(2);
    expect(api.saveHelpAudio).toHaveBeenCalledTimes(1);
    expect(api.saveHelpAudio.mock.calls[0][3]).toEqual(["https://x.test/help-0-1.mp3", "", "https://x.test/help-2-3.mp3"]);
    expect(saved).toHaveBeenCalled();
  });

  it("refuses more clips than markers without uploading anything", async () => {
    await show(part());
    const input = container.querySelector<HTMLInputElement>('input[type="file"][multiple]')!;
    const files = ["1.mp3", "2.mp3", "3.mp3", "4.mp3"].map((name) => new File(["x"], name, { type: "audio/mpeg" }));
    Object.defineProperty(input, "files", { value: files });
    await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("You picked 4 clips, but this part has 3 markers");
    expect(api.uploadPartAsset).not.toHaveBeenCalled();
  });

  it("warns when clips are stored past the last marker", async () => {
    await show(part({ helpAudio: ["a", "b", "c", "d", "e"].map((n) => `https://x.test/${n}.mp3`) }));
    expect(container.textContent).toContain("2 clips are stored past the last of the 3 markers");
  });
});
