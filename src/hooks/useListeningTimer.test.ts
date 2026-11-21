// @vitest-environment jsdom
//
// Two hook instances in one jsdom share localStorage, which stands in for two
// browser tabs. Fake timers also fake Date.now. Totals are asserted with a
// +-5 s tolerance because tick boundaries (every 5 s) make exact numbers
// fragile.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useListeningTimer, getTotalListeningSeconds } from "./useListeningTimer";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Timer = ReturnType<typeof useListeningTimer>;

const roots: Root[] = [];

// Mounts a tiny component hosting the hook and hands back its controls.
const mountTab = (): Timer => {
  const box: { current: Timer | null } = { current: null };
  const Probe = () => {
    box.current = useListeningTimer();
    return null;
  };
  const root = createRoot(document.createElement("div"));
  roots.push(root);
  act(() => root.render(createElement(Probe)));
  return {
    startTimer: () => act(() => box.current!.startTimer()),
    stopTimer: () => act(() => box.current!.stopTimer()),
  };
};

const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

describe("useListeningTimer lease", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });
  afterEach(() => {
    act(() => roots.splice(0).forEach((r) => r.unmount()));
    vi.useRealTimers();
  });

  it("counts a single playing tab", () => {
    const a = mountTab();
    a.startTimer();
    advance(20_000);
    a.stopTimer();
    expect(Math.abs(getTotalListeningSeconds() - 20)).toBeLessThanOrEqual(5);
  });

  it("counts two tabs playing together only once", () => {
    const a = mountTab();
    const b = mountTab();
    a.startTimer();
    advance(1000);
    b.startTimer();
    advance(20_000);
    a.stopTimer();
    b.stopTimer();
    // Double counting would give ~40.
    expect(getTotalListeningSeconds()).toBeLessThanOrEqual(25);
    expect(getTotalListeningSeconds()).toBeGreaterThanOrEqual(15);
  });

  it("lets the first tab resume counting after the second stops", () => {
    const a = mountTab();
    const b = mountTab();
    a.startTimer();
    advance(1000);
    b.startTimer();
    advance(10_000);
    b.stopTimer();
    const before = getTotalListeningSeconds();
    advance(20_000);
    a.stopTimer();
    expect(getTotalListeningSeconds() - before).toBeGreaterThanOrEqual(15);
  });

  it("takes over a lease left by a crashed tab", () => {
    localStorage.setItem(
      "listeningTimerLease",
      JSON.stringify({ owner: "ghost", until: Date.now() - 1000 }),
    );
    const a = mountTab();
    // Starting takes the lease unconditionally; make the ghost lease the
    // state seen on the first tick by restoring it after start.
    a.startTimer();
    localStorage.setItem(
      "listeningTimerLease",
      JSON.stringify({ owner: "ghost", until: Date.now() - 1000 }),
    );
    advance(20_000);
    a.stopTimer();
    expect(Math.abs(getTotalListeningSeconds() - 20)).toBeLessThanOrEqual(5);
  });

  it("is blocked by an unexpired foreign lease until it expires", () => {
    const a = mountTab();
    a.startTimer();
    // Another tab grabs the lease for 8 s (a bit over one tick).
    localStorage.setItem(
      "listeningTimerLease",
      JSON.stringify({ owner: "other", until: Date.now() + 8000 }),
    );
    advance(5000); // tick 1: blocked
    expect(getTotalListeningSeconds()).toBe(0);
    advance(15_000); // lease lapses at 8 s, later ticks count
    a.stopTimer();
    const total = getTotalListeningSeconds();
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThanOrEqual(15 + 5);
  });
});
