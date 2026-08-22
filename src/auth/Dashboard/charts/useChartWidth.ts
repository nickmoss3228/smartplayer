// auth/Dashboard/charts/useChartWidth.ts
//
// Kept out of ChartFrame.tsx so that file exports only components — mixing a hook
// in with them breaks Fast Refresh (react-refresh/only-export-components).

import { useEffect, useRef, useState } from "react";

/**
 * Real rendered width, so an SVG can be drawn at device pixels instead of being
 * scaled by a viewBox — scaling a viewBox would stretch the axis text with it.
 */
export const useChartWidth = (fallback = 560) => {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      const next = entry.contentRect.width;
      if (next > 0) setWidth(next);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
};
