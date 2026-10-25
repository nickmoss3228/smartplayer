/// <reference lib="webworker" />
import { ANALYSIS_WIDTH, comicFocus } from './comicFocus';

/**
 * Runs comicFocus off the main thread: ~50–150ms a page would otherwise
 * stutter the tiles' entrance on a phone. Fetching here rather than reading
 * the on-screen <img> also sidesteps canvas tainting — the bucket answers
 * CORS requests, the built-in comics are same-origin.
 */
self.onmessage = async (e: MessageEvent<{ id: number; url: string }>) => {
  const { id, url } = e.data;
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(String(res.status));
    const bitmap = await createImageBitmap(await res.blob());
    const w = ANALYSIS_WIDTH;
    const h = Math.round((w * bitmap.height) / bitmap.width);
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('no 2d context');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, w, h);
    const rect = comicFocus(ctx.getImageData(0, 0, w, h));
    self.postMessage({ id, focus: rect && { ...rect, aspect: bitmap.width / bitmap.height } });
    bitmap.close();
  } catch {
    self.postMessage({ id, focus: null });
  }
};
