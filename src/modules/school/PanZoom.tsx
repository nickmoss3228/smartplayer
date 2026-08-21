// modules/school/PanZoom.tsx
//
// Pinch-to-zoom and drag-to-pan for the dollhouse, with no on-screen controls —
// the plan asks for "zoomable with my finger, without any buttons".
//
// Pointer Events rather than touch events, so one implementation covers finger,
// trackpad and mouse. The transform is applied as a CSS transform on a wrapper
// div rather than to the SVG's viewBox: the browser composites it on the GPU,
// so a pinch stays smooth, and SVG scales without resampling so it stays sharp
// at any zoom.
//
// The subtle part is not breaking tap-to-focus. A finger that moves even
// slightly during a tap still fires a click, so a drag would otherwise select
// whichever room happened to be under the finger when it lifted. Movement is
// tracked, and a click that follows a real drag is swallowed in the capture
// phase before it reaches the room cell.

import { ReactNode, useCallback, useRef, useState } from "react";

const MIN_SCALE = 0.75;
const MAX_SCALE = 4;
// Pointer travel, in px, past which a gesture stops counting as a tap.
const DRAG_THRESHOLD = 8;

interface Transform {
  x: number;
  y: number;
  k: number;
}

const IDENTITY: Transform = { x: 0, y: 0, k: 1 };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const PanZoom = ({
  children,
  className = "",
  enabled = true,
}: {
  children: ReactNode;
  className?: string;
  /** Desktop keeps the static layout; only the touch view opts in. */
  enabled?: boolean;
}) => {
  const [t, setT] = useState<Transform>(IDENTITY);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dragged = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const pinch = useRef<{ dist: number; k: number; midX: number; midY: number; tx: number; ty: number } | null>(null);

  const centroid = () => {
    const pts = [...pointers.current.values()];
    const n = pts.length || 1;
    return {
      x: pts.reduce((s, p) => s + p.x, 0) / n,
      y: pts.reduce((s, p) => s + p.y, 0) / n,
    };
  };

  const spread = () => {
    const pts = [...pointers.current.values()];
    if (pts.length < 2) return 0;
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  };

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled) return;
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      dragged.current = false;
      if (pointers.current.size === 1) {
        last.current = { x: e.clientX, y: e.clientY };
        pinch.current = null;
      } else if (pointers.current.size === 2) {
        const c = centroid();
        pinch.current = { dist: spread(), k: t.k, midX: c.x, midY: c.y, tx: t.x, ty: t.y };
      }
    },
    [enabled, t],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled || !pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.current.size >= 2 && pinch.current) {
        const d = spread();
        if (!d || !pinch.current.dist) return;
        const k = clamp((d / pinch.current.dist) * pinch.current.k, MIN_SCALE, MAX_SCALE);
        const c = centroid();
        // Keep the point under the fingers fixed while scaling, then follow the
        // midpoint so a two-finger drag pans at the same time as it zooms.
        const ratio = k / pinch.current.k;
        setT({
          k,
          x: c.x - (pinch.current.midX - pinch.current.tx) * ratio,
          y: c.y - (pinch.current.midY - pinch.current.ty) * ratio,
        });
        dragged.current = true;
        return;
      }

      if (pointers.current.size === 1 && last.current) {
        const dx = e.clientX - last.current.x;
        const dy = e.clientY - last.current.y;
        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) dragged.current = true;
        if (dragged.current) {
          last.current = { x: e.clientX, y: e.clientY };
          setT((p) => ({ ...p, x: p.x + dx, y: p.y + dy }));
        }
      }
    },
    [enabled],
  );

  const endPointer = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) last.current = null;
    else last.current = centroid();
  }, []);

  // A drag ends in a click on whatever was under the finger. Swallow it in the
  // capture phase so panning across the building never selects a room.
  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (dragged.current) {
      e.stopPropagation();
      e.preventDefault();
      dragged.current = false;
    }
  }, []);

  const onWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      if (!enabled) return;
      const k = clamp(t.k * (e.deltaY < 0 ? 1.12 : 1 / 1.12), MIN_SCALE, MAX_SCALE);
      const rect = e.currentTarget.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const ratio = k / t.k;
      setT({ k, x: px - (px - t.x) * ratio, y: py - (py - t.y) * ratio });
    },
    [enabled, t],
  );

  // Double-tap / double-click resets, which is the one gesture people reach for
  // after zooming into a corner and losing the building.
  const onDoubleClick = useCallback(() => enabled && setT(IDENTITY), [enabled]);

  if (!enabled) return <div className={className}>{children}</div>;

  return (
    <div
      className={`overflow-hidden ${className}`}
      // touch-action:none is what stops the browser panning/zooming the PAGE
      // instead of handing us the gesture.
      style={{ touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onPointerLeave={endPointer}
      onClickCapture={onClickCapture}
      onWheel={onWheel}
      onDoubleClick={onDoubleClick}
    >
      <div
        style={{
          transform: `translate(${t.x}px, ${t.y}px) scale(${t.k})`,
          transformOrigin: "0 0",
          willChange: "transform",
        }}
        className="w-full h-full"
      >
        {children}
      </div>
    </div>
  );
};
