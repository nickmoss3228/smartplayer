// @vitest-environment jsdom
//
// The pull-down-to-close gesture. Touches are synthesised with explicit
// timestamps, because whether a short pull closes the sheet depends on how
// fast it was: a slow 40px pull is a wobble, the same 40px in 20ms is a flick.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import Sheet from "./Sheet";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
let onClose: ReturnType<typeof vi.fn>;
let phone = true;

function stubMedia() {
  window.matchMedia = ((query: string) => ({
    matches: query.includes("max-width") ? phone : false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
}

async function mount() {
  await act(async () => {
    root.render(
      <Sheet onClose={onClose} labelledBy="t">
        <h2 id="t">Title</h2>
        <div id="list" style={{ overflowY: "auto" }}>
          <p id="row">row</p>
        </div>
      </Sheet>
    );
  });
}

const wrap = () => container.querySelector('[role="dialog"]')!.parentElement as HTMLElement;
const handle = () => container.querySelector("[data-sheet-handle]") as HTMLElement;

function touch(target: Element, type: string, y: number, t: number, x = 0) {
  const e = new Event(type, { bubbles: true, cancelable: true });
  const points = type === "touchend" ? [] : [{ clientX: x, clientY: y }];
  Object.defineProperty(e, "touches", { value: points });
  Object.defineProperty(e, "timeStamp", { value: t });
  target.dispatchEvent(e);
  return e;
}

/** A drag from y=100 down by `dy`, in `steps` moves over `ms`. */
function drag(target: Element, dy: number, ms: number, steps = 5) {
  touch(target, "touchstart", 100, 0);
  for (let i = 1; i <= steps; i++) {
    touch(target, "touchmove", 100 + (dy * i) / steps, (ms * i) / steps);
  }
  touch(target, "touchend", 100 + dy, ms);
}

beforeEach(() => {
  vi.useFakeTimers();
  phone = true;
  stubMedia();
  onClose = vi.fn();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

describe("Sheet", () => {
  it("is a labelled modal dialog with a handle", async () => {
    await mount();
    const dialog = container.querySelector('[role="dialog"]')!;
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-labelledby")).toBe("t");
    expect(handle().getAttribute("aria-hidden")).toBe("true");
  });

  it("closes when the handle is pulled down far enough", async () => {
    await mount();
    drag(handle(), 200, 600);
    expect(wrap().style.transform).toContain("translate3d");
    expect(onClose).not.toHaveBeenCalled(); // still sliding out
    act(() => vi.advanceTimersByTime(250));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("snaps back from a short, slow pull", async () => {
    await mount();
    drag(handle(), 40, 800);
    act(() => vi.advanceTimersByTime(500));
    expect(onClose).not.toHaveBeenCalled();
    expect(wrap().style.transform).toBe("");
  });

  it("closes on a quick flick even when it is short", async () => {
    await mount();
    drag(handle(), 40, 20);
    act(() => vi.advanceTimersByTime(250));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not count a quick pull as a flick if the finger stopped before letting go", async () => {
    await mount();
    touch(handle(), "touchstart", 100, 0);
    touch(handle(), "touchmove", 120, 10);
    touch(handle(), "touchmove", 140, 20);
    touch(handle(), "touchend", 140, 600); // held still for over half a second
    act(() => vi.advanceTimersByTime(500));
    expect(onClose).not.toHaveBeenCalled();
    expect(wrap().style.transform).toBe("");
  });

  it("follows the finger and stops the page scrolling while dragging", async () => {
    await mount();
    touch(handle(), "touchstart", 100, 0);
    const move = touch(handle(), "touchmove", 160, 100);
    expect(move.defaultPrevented).toBe(true);
    expect(wrap().style.transform).toBe("translate3d(0, 60px, 0)");
  });

  it("ignores upward and sideways swipes", async () => {
    await mount();
    drag(handle(), -150, 600);
    touch(handle(), "touchstart", 100, 0, 0);
    touch(handle(), "touchmove", 110, 50, 80);
    touch(handle(), "touchend", 110, 50);
    act(() => vi.advanceTimersByTime(500));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("leaves content that is scrolled down to scroll, but the handle still drags", async () => {
    await mount();
    const list = container.querySelector("#list") as HTMLElement;
    Object.defineProperty(list, "scrollHeight", { value: 500 });
    Object.defineProperty(list, "clientHeight", { value: 200 });
    list.scrollTop = 120;

    drag(container.querySelector("#row")!, 200, 600);
    act(() => vi.advanceTimersByTime(500));
    expect(onClose).not.toHaveBeenCalled();
    expect(wrap().style.transform).toBe("");

    drag(handle(), 200, 600);
    act(() => vi.advanceTimersByTime(250));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("drags from the content when it is at the top", async () => {
    await mount();
    drag(container.querySelector("#row")!, 200, 600);
    act(() => vi.advanceTimersByTime(250));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does nothing on wider screens, where it is a centred dialog", async () => {
    phone = false;
    await mount();
    drag(handle(), 300, 600);
    act(() => vi.advanceTimersByTime(500));
    expect(onClose).not.toHaveBeenCalled();
    expect(wrap().style.transform).toBe("");
  });

  it("still closes from the backdrop", async () => {
    await mount();
    const backdrop = container.firstElementChild!.firstElementChild as HTMLElement;
    act(() => backdrop.click());
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
