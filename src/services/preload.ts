/**
 * Preload a single image into the browser cache.
 * Subsequent renders of the same src will be instant.
 */
export function preloadImage(url: string): void {
  if (!url) return;
  const img = new Image();
  img.src = url;
}

/**
 * Preload an array of image URLs, silently skipping falsy values.
 */
export function preloadImages(urls: (string | undefined | null)[]): void {
  urls.forEach(url => url && preloadImage(url));
}

/**
 * Preload an audio file via a hidden Audio element.
 *
 * strategy = 'auto'     → browser buffers the full file (use for imminent playback)
 * strategy = 'metadata' → browser fetches only headers/duration (lighter warm-up)
 */
export function preloadAudio(
  url: string,
  strategy: 'auto' | 'metadata' = 'auto',
): HTMLAudioElement {
  const audio = new Audio();
  audio.preload = strategy;
  audio.src = url;
  return audio;
}

/**
 * Preload multiple audio URLs, skipping falsy values.
 */
export function preloadAudios(
  urls: (string | undefined | null)[],
  strategy: 'auto' | 'metadata' = 'auto',
): void {
  urls.forEach(url => url && preloadAudio(url, strategy));
}