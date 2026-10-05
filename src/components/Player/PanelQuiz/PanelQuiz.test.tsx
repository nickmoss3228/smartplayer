// @vitest-environment jsdom
//
// The comic quiz must never show the answer to a line before it is asked.
// Moving to the next line used to clear the previous answer in an effect —
// after the browser had already painted the new line with the old "answered"
// state, so the NEXT line's panel flashed green for a frame.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("../../../utils/soundEffects", () => ({ playChime: () => {} }));
// Every line counts as heard at once, so the panels can be tapped.
vi.mock("../../../hooks/useClipPlayer", () => ({
  useClipPlayer: () => ({ state: "played", duration: 10, play: () => {}, stop: () => {} }),
}));

import { PanelQuiz } from "./PanelQuiz";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const quiz = {
  panels: [
    { x: 0, y: 0, w: 0.5, h: 0.5 },
    { x: 0.5, y: 0, w: 0.5, h: 0.5 },
    { x: 0, y: 0.5, w: 1, h: 0.5 },
  ],
  // Not next to each other, so they stay two questions.
  clips: [
    { start: 0, end: 2, panel: 0 },
    { start: 5, end: 7, panel: 1 },
  ],
};

const REVEALED = "bg-green-400/20";

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.useFakeTimers();
  // The shuffle with random() = 0 asks clip 1 (panel 1) first, then clip 0 (panel 0).
  vi.spyOn(Math, "random").mockReturnValue(0);
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const panels = () => [...container.querySelectorAll<HTMLButtonElement>('button[aria-label^="panelQuiz.panel"]')];

describe("PanelQuiz", () => {
  it("moves to the next line without ever showing that line's answer", async () => {
    await act(async () => {
      root.render(<PanelQuiz comicUrl="/c.jpg" audioUrl="/a.mp3" quiz={quiz} onClose={() => {}} />);
    });

    // Answer the first line (panel 2) correctly; its panel shows as right.
    await act(async () => panels()[1].click());
    expect(panels()[1].className).toContain(REVEALED);

    // Watch every class the next line's panel (panel 1) takes on while the
    // quiz moves on — including frames that are replaced straight away.
    const seen: string[] = [];
    const observer = new MutationObserver((records) =>
      records.forEach((r) => seen.push(String(r.oldValue), (r.target as Element).className)),
    );
    observer.observe(panels()[0], { attributes: true, attributeFilter: ["class"], attributeOldValue: true });

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    seen.push(...observer.takeRecords().map((r) => String(r.oldValue)));
    observer.disconnect();

    expect(container.textContent).toContain("2 / 2");
    expect(seen.some((cls) => cls.includes(REVEALED))).toBe(false);
    expect(panels()[0].className).not.toContain(REVEALED);
  });
});
