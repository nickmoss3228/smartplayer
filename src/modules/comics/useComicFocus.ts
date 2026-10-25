import { useEffect, useState } from 'react';
import type { FocusRect } from './comicFocus';

/** Where to zoom a comic page, plus the page's width/height ratio. */
export interface ComicFocus extends FocusRect {
  aspect: number;
}

/** Same edge as Tailwind's `md`: below it, part tiles are short landscape boxes. */
const PHONE = '(max-width: 767.98px)';
/** Results survive reloads; bump the version when comicFocus changes. */
const STORE_KEY = 'comicFocus:v1';
/** Show the ordinary crop rather than an empty tile if the worker is slow. */
const GIVE_UP_MS = 2500;

type Known = ComicFocus | null;

const known = new Map<string, Known>(readStore());
const pending = new Map<string, Promise<Known>>();
const waiting = new Map<number, (focus: Known) => void>();
let nextId = 0;
let worker: Worker | null | undefined;

function readStore(): [string, Known][] {
  try {
    return Object.entries(JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}'));
  } catch {
    return [];
  }
}

function writeStore() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(Object.fromEntries(known)));
  } catch {
    // Private mode or a full quota: results just are not kept between visits.
  }
}

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    // Without OffscreenCanvas (Safari before 16.4) there is nothing to draw on.
    worker =
      typeof OffscreenCanvas === 'undefined'
        ? null
        : new Worker(new URL('./comicFocus.worker.ts', import.meta.url), { type: 'module' });
    worker?.addEventListener('message', (e: MessageEvent<{ id: number; focus: Known }>) => {
      waiting.get(e.data.id)?.(e.data.focus);
      waiting.delete(e.data.id);
    });
  } catch {
    worker = null;
  }
  return worker;
}

function focusFor(src: string): Promise<Known> {
  if (known.has(src)) return Promise.resolve(known.get(src) ?? null);
  const inFlight = pending.get(src);
  if (inFlight) return inFlight;

  const w = getWorker();
  if (!w) return Promise.resolve(null);
  const id = nextId++;
  const promise = new Promise<Known>((resolve) => waiting.set(id, resolve)).then((focus) => {
    known.set(src, focus);
    pending.delete(src);
    writeStore();
    return focus;
  });
  pending.set(src, promise);
  // Absolute, because a relative URL would resolve against the worker's own.
  w.postMessage({ id, url: new URL(src, window.location.href).href });
  return promise;
}

const isPhone = () => typeof window !== 'undefined' && window.matchMedia?.(PHONE).matches === true;

/**
 * The clean panel to zoom a phone part tile onto (see comicFocus.ts).
 *
 * `ready` is false only while a page is being analysed for the first time on
 * a phone, so the tile can wait instead of jumping from the ordinary crop to
 * the zoomed one. Desktop never analyses and is always ready.
 */
export function useComicFocus(src: string | undefined): { focus: Known; ready: boolean } {
  const cached = src && known.has(src) ? (known.get(src) ?? null) : undefined;
  const readyNow = cached !== undefined || !src || !isPhone();
  const [state, setState] = useState<{ src?: string; focus: Known; ready: boolean }>({
    src,
    focus: cached ?? null,
    ready: readyNow,
  });

  useEffect(() => {
    if (!src || !isPhone()) {
      setState({ src, focus: null, ready: true });
      return;
    }
    if (known.has(src)) {
      setState({ src, focus: known.get(src) ?? null, ready: true });
      return;
    }
    let alive = true;
    setState({ src, focus: null, ready: false });
    const giveUp = window.setTimeout(() => {
      if (alive) setState((s) => (s.ready ? s : { src, focus: null, ready: true }));
    }, GIVE_UP_MS);
    void focusFor(src).then((focus) => {
      if (alive) setState({ src, focus, ready: true });
    });
    return () => {
      alive = false;
      window.clearTimeout(giveUp);
    };
  }, [src]);

  // A new src renders once before the effect above catches up.
  return state.src === src ? state : { focus: cached ?? null, ready: readyNow };
}
