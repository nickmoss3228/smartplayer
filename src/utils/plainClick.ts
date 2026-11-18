import type { MouseEvent } from 'react';

/**
 * A plain left click on a link, as opposed to ctrl/cmd/shift/alt or a middle
 * click, which the browser should handle itself (new tab, new window, download).
 * Links that do something else first (open a preview, show a sheet) intercept
 * only these, and keep a real href for everything else.
 */
export const isPlainClick = (e: MouseEvent): boolean =>
  e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
