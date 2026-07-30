import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

// ─── Zoom helpers (module-level — pure, no closures) ─────────────────────────
const MIN_SCALE = 1;
const MAX_SCALE = 5;
const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

/**
 * Clamps the pan translation so the image never drifts more than
 * (scale − 1) × 500 px from centre in either axis.
 */
const clampPos = (
  tx: number,
  ty: number,
  s: number,
): { x: number; y: number } => {
  if (s <= 1) return { x: 0, y: 0 };
  const b = (s - 1) * 500;
  return { x: clamp(tx, -b, b), y: clamp(ty, -b, b) };
};

interface ModalProps {
  src: string;
  title?: string;
  onClose: () => void;
}

export const ComicsModal: React.FC<ModalProps> = ({ src, title, onClose }) => {
  // ── zoom / pan state ──────────────────────────────────────────────────────
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  /**
   * Refs mirror the state above so that native event listeners (attached via
   * useEffect) always read current values without becoming stale closures.
   */
  const scaleRef = useRef(1);
  const posRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const dragRef = useRef<{
    mx: number;
    my: number;
    tx: number;
    ty: number;
  } | null>(null);
  const movedRef = useRef(false); // pointer moved since last down?
  const pinchRef = useRef<number | null>(null); // previous pinch distance
  const tapRef = useRef(0); // ms timestamp — double-tap detection
  const containerRef = useRef<HTMLDivElement>(null);

  // ── commit: update both state and mirror-refs atomically ─────────────────
  const commit = useCallback((s: number, p: { x: number; y: number }) => {
    scaleRef.current = s;
    posRef.current = p;
    setScale(s);
    setPos(p);
  }, []);

  /**
   * Zoom to `newS` keeping the screen point (px, py) — expressed in pixels
   * relative to the container's centre — visually fixed underneath the pointer.
   */
  const zoom = useCallback(
    (newS: number, px: number, py: number) => {
      newS = clamp(newS, MIN_SCALE, MAX_SCALE);
      const s = scaleRef.current;
      const { x: tx, y: ty } = posRef.current;
      commit(
        newS,
        clampPos(
          px - (px - tx) * (newS / s),
          py - (py - ty) * (newS / s),
          newS,
        ),
      );
    },
    [commit],
  );

  const reset = useCallback(() => commit(1, { x: 0, y: 0 }), [commit]);

  // ── keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "+" || e.key === "=")
        zoom(clamp(scaleRef.current + 0.5, MIN_SCALE, MAX_SCALE), 0, 0);
      if (e.key === "-")
        zoom(clamp(scaleRef.current - 0.5, MIN_SCALE, MAX_SCALE), 0, 0);
      if (e.key === "0") reset();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, zoom, reset]);

  // ── body-scroll lock ──────────────────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // ── all pointer/wheel/touch events ───────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    /** Converts a client coordinate to a pivot relative to the container centre */
    const getPivot = (cx: number, cy: number) => {
      const r = el.getBoundingClientRect();
      return { x: cx - r.left - r.width / 2, y: cy - r.top - r.height / 2 };
    };

    // ── Wheel (non-passive so we can call preventDefault) ─────────────────
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = getPivot(e.clientX, e.clientY);
      zoom(scaleRef.current * (e.deltaY < 0 ? 1.12 : 1 / 1.12), p.x, p.y);
    };

    // ── Mouse drag ────────────────────────────────────────────────────────
    const onMouseDown = (e: MouseEvent) => {
      if (scaleRef.current <= 1) return;
      draggingRef.current = true;
      movedRef.current = false;
      setDragging(true);
      dragRef.current = {
        mx: e.clientX,
        my: e.clientY,
        tx: posRef.current.x,
        ty: posRef.current.y,
      };
    };
    // Attached to window so drag keeps working even if cursor leaves the box
    const onMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current || !dragRef.current) return;
      const dx = e.clientX - dragRef.current.mx;
      const dy = e.clientY - dragRef.current.my;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) movedRef.current = true;
      const p = clampPos(
        dragRef.current.tx + dx,
        dragRef.current.ty + dy,
        scaleRef.current,
      );
      posRef.current = p;
      setPos(p);
    };
    const onMouseUp = () => {
      draggingRef.current = false;
      dragRef.current = null;
      setDragging(false);
    };

    // ── Double-click: zoom in to 2.5× (or reset when already zoomed) ──────
    const onDblClick = (e: MouseEvent) => {
      e.stopPropagation();
      if (scaleRef.current > 1) {
        reset();
        return;
      }
      const p = getPivot(e.clientX, e.clientY);
      zoom(2.5, p.x, p.y);
    };

    // ── Touch ─────────────────────────────────────────────────────────────
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        draggingRef.current = true;
        movedRef.current = false;
        dragRef.current = {
          mx: e.touches[0].clientX,
          my: e.touches[0].clientY,
          tx: posRef.current.x,
          ty: posRef.current.y,
        };
      } else if (e.touches.length === 2) {
        draggingRef.current = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchRef.current = Math.sqrt(dx * dx + dy * dy);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault(); // blocks native browser zoom/scroll
      if (e.touches.length === 2 && pinchRef.current !== null) {
        // ── Pinch-to-zoom, centred on the midpoint between fingers ─────
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const r = el.getBoundingClientRect();
        zoom(
          scaleRef.current * (dist / pinchRef.current),
          (e.touches[0].clientX + e.touches[1].clientX) / 2 -
            r.left -
            r.width / 2,
          (e.touches[0].clientY + e.touches[1].clientY) / 2 -
            r.top -
            r.height / 2,
        );
        pinchRef.current = dist;
      } else if (
        e.touches.length === 1 &&
        draggingRef.current &&
        dragRef.current &&
        scaleRef.current > 1
      ) {
        // ── Single-finger pan ──────────────────────────────────────────
        const dx = e.touches[0].clientX - dragRef.current.mx;
        const dy = e.touches[0].clientY - dragRef.current.my;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) movedRef.current = true;
        const p = clampPos(
          dragRef.current.tx + dx,
          dragRef.current.ty + dy,
          scaleRef.current,
        );
        posRef.current = p;
        setPos(p);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchRef.current = null;

      if (e.touches.length === 0) {
        draggingRef.current = false;
        // ── Double-tap detection ───────────────────────────────────────
        const now = Date.now();
        if (now - tapRef.current < 300 && !movedRef.current) {
          if (scaleRef.current > 1) {
            reset();
          } else {
            const t = e.changedTouches[0];
            if (t) {
              const p = getPivot(t.clientX, t.clientY);
              zoom(2.5, p.x, p.y);
            }
          }
        }
        tapRef.current = now;
      } else if (e.touches.length === 1) {
        // Went 2 → 1 finger: restart single-finger pan tracking
        pinchRef.current = null;
        draggingRef.current = true;
        dragRef.current = {
          mx: e.touches[0].clientX,
          my: e.touches[0].clientY,
          tx: posRef.current.x,
          ty: posRef.current.y,
        };
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("mousedown", onMouseDown);
    el.addEventListener("dblclick", onDblClick);
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("mousedown", onMouseDown);
      el.removeEventListener("dblclick", onDblClick);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [zoom, reset]);

  const cursor = dragging ? "grabbing" : scale > 1 ? "grab" : "zoom-in";

  // Full-screen: the container itself is the fixed inset-0 layer, so
  // there's no separate "backdrop" — tapping anywhere that isn't the
  // image or a control (all of which stopPropagation) closes the modal.
  return createPortal(
    <div
      ref={containerRef}
      role="dialog"
      aria-modal
      aria-label={title ?? "Comic"}
      onClick={scale <= 1 ? onClose : undefined}
      style={{ animation: "comicsScaleIn 200ms ease forwards", cursor }}
      // touch-none: let our own handlers govern all touch gestures
      className="fixed inset-0 z-[9999] bg-black flex items-center justify-center select-none touch-none overflow-hidden"
    >
      {/* ── Top gradient + title ── */}
      <div
        className="absolute top-0 left-0 right-0 z-10 flex items-center px-4 pb-2 bg-gradient-to-b from-black/70 to-transparent pointer-events-none"
        style={{ paddingTop: "calc(0.5rem + env(safe-area-inset-top))" }}
      >
        {title && (
          <span className="text-white text-[11px] uppercase tracking-widest font-semibold font-['Montserrat'] truncate">
            {title}
          </span>
        )}
      </div>

      {/* ── Close button ── */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close"
        style={{ top: "calc(0.5rem + env(safe-area-inset-top))" }}
        className="absolute right-2 z-20 w-9 h-9 rounded-full bg-black/50 hover:bg-black/75 text-white text-xl leading-none flex items-center justify-center transition-colors"
      >
        ×
      </button>

      {/* ── Comic image — transform is applied only here ── */}
      <img
        src={src}
        alt={title ?? "Comic"}
        draggable={false}
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
          transformOrigin: "center center",
          // Disable transition while actively dragging for immediate 1:1 response
          transition: dragging ? "none" : "transform 120ms ease-out",
          willChange: "transform",
        }}
        className="block max-w-full max-h-full object-contain"
      />

      {/* ── Zoom control buttons (bottom-right) ── */}
      <div
        className="absolute right-3 z-20 flex items-center gap-1.5"
        style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        {scale > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              reset();
            }}
            aria-label="Reset zoom"
            title="Reset zoom (0)"
            className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white text-base flex items-center justify-center transition-colors"
          >
            ↺
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            zoom(clamp(scale - 0.5, MIN_SCALE, MAX_SCALE), 0, 0);
          }}
          disabled={scale <= MIN_SCALE}
          aria-label="Zoom out"
          title="Zoom out (−)"
          className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xl flex items-center justify-center transition-colors"
        >
          −
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            zoom(clamp(scale + 0.5, MIN_SCALE, MAX_SCALE), 0, 0);
          }}
          disabled={scale >= MAX_SCALE}
          aria-label="Zoom in"
          title="Zoom in (+)"
          className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xl flex items-center justify-center transition-colors"
        >
          +
        </button>
      </div>

      {/* ── Live zoom-level badge (bottom-left, only when zoomed) ── */}
      {scale !== 1 && (
        <div
          className="absolute left-3 z-20 pointer-events-none"
          style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        >
          <span className="text-white/90 text-[10px] font-semibold font-['Montserrat'] bg-black/55 rounded-full px-2.5 py-1 tabular-nums">
            {Math.round(scale * 100)}%
          </span>
        </div>
      )}

      {/* ── One-shot usage hint — auto-fades after ~4 s ── */}
      <div
        aria-hidden
        className="absolute inset-x-0 flex justify-center pointer-events-none z-10"
        style={{
          bottom: "calc(3.25rem + env(safe-area-inset-bottom))",
          animation: "comicsHintFade 4s ease forwards",
        }}
      >
        <span className="text-white/80 text-[9px] font-['Montserrat'] bg-black/45 backdrop-blur-sm rounded-full px-3 py-1 whitespace-nowrap">
          Scroll · Pinch to zoom &nbsp;·&nbsp; Double-click to zoom in
        </span>
      </div>

      <style>{`
        @keyframes comicsScaleIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes comicsHintFade {
          0%   { opacity: 0; }
          15%  { opacity: 1; }
          70%  { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>,
    document.body,
  );
};

export default ComicsModal;
