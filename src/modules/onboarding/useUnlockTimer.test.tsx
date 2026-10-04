// @vitest-environment jsdom
//
// The slide lock: only time the page is actually visible counts, and a new
// slide starts its own count.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useUnlockTimer } from './useUnlockTimer';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
let latest: { unlocked: boolean; progress: number };

const Probe = ({ ms, k, already = false }: { ms: number; k: number; already?: boolean }) => {
  latest = useUnlockTimer(ms, k, already);
  return null;
};

const render = async (ms: number, k: number, already = false) => {
  await act(async () => {
    root.render(<Probe ms={ms} k={k} already={already} />);
  });
};

const advance = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
};

let hidden = false;

beforeEach(() => {
  vi.useFakeTimers();
  hidden = false;
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

describe('useUnlockTimer', () => {
  it('unlocks once the time has passed', async () => {
    await render(1000, 1);
    expect(latest.unlocked).toBe(false);
    await advance(500);
    expect(latest.unlocked).toBe(false);
    expect(latest.progress).toBeGreaterThan(0.3);
    await advance(600);
    expect(latest.unlocked).toBe(true);
    expect(latest.progress).toBe(1);
  });

  it('does not count time while the page is hidden', async () => {
    await render(1000, 1);
    hidden = true;
    await advance(5000);
    expect(latest.unlocked).toBe(false);
    hidden = false;
    await advance(1100);
    expect(latest.unlocked).toBe(true);
  });

  it('starts a new key from zero, without a frame of "unlocked"', async () => {
    await render(1000, 1);
    await advance(1200);
    expect(latest.unlocked).toBe(true);
    await render(1000, 2);
    expect(latest.unlocked).toBe(false);
  });

  it('starts unlocked for a slide already watched, or a zero wait', async () => {
    await render(1000, 1, true);
    expect(latest.unlocked).toBe(true);
    await render(0, 2);
    expect(latest.unlocked).toBe(true);
  });
});
