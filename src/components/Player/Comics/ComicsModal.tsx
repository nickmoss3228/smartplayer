import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  MIN_SCALE,
  MAX_SCALE,
  clampView,
  wheelFactor,
  zoomAt,
  type View,
} from "./zoomMath";

const STEP = 0.5; // +/− buttons and keys
const DOUBLE_TAP_SCALE = 2.5;
const DOUBLE_TAP_MS = 300;
/** Pointer travel (px) under which a press still counts as a tap or click. */
const TAP_SLOP = 6;
/** Discrete jumps (buttons, keys, double-tap) ease; live gestures never do. */
const EASE = "transform 180ms ease-out";

interface ModalProps {
  src: string;
  title?: string;
  onClose: () => void;
}

export const ComicsModal: React.FC<ModalProps> = ({ src, title, onClose }) => {
  // ── zoom / pan state ──────────────────────────────────────────────────────
  /**
   * viewRef is the source of truth. Gestures update it and the transform is
   * written straight onto the <img> once per frame, so a pan or pinch never
   * waits on a React render. `scale` only mirrors it for the controls.
   */
  const viewRef = useRef<View>({ s: 1, x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [dragging, setDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  /** Viewport rect and the image's untransformed size, kept by a ResizeObserver. */
  const boxRef = useRef({ left: 0, top: 0, w: 0, h: 0, iw: 0, ih: 0 });
  const frameRef = useRef(0);
  const animateRef = useRef(false);
  /** Did the pointer travel during the latest press? A drag must not close. */
  const movedRef = useRef(false);

  const setView = useCallback((next: View, animate = false) => {
    const b = boxRef.current;
    viewRef.current = clampView(next, { w: b.w, h: b.h }, { w: b.iw, h: b.ih });
    animateRef.current = animate;
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      const img = imgRef.current;
      if (!img) return;
      const { s, x, y } = viewRef.current;
      img.style.transition = animateRef.current ? EASE : "none";
      img.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${s})`;
      setScale(s);
    });
  }, []);

  // Reset the id too: StrictMode re-runs effects, and a stale id would make
  // setView think a frame is still pending and never paint again.
  useEffect(
    () => () => {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    },
    [],
  );

  /** Client coordinates → offset from the viewport centre (the pivot space). */
  const fromCentre = useCallback((cx: number, cy: number) => {
    const b = boxRef.current;
    return { x: cx - b.left - b.w / 2, y: cy - b.top - b.h / 2 };
  }, []);

  /** Eased jump to scale `s`, pivoting on a client point (default: centre). */
  const jumpTo = useCallback(
    (s: number, cx?: number, cy?: number) => {
      const p =
        cx === undefined || cy === undefined
          ? { x: 0, y: 0 }
          : fromCentre(cx, cy);
      setView(zoomAt(viewRef.current, s, p.x, p.y), true);
    },
    [fromCentre, setView],
  );

  const reset = useCallback(
    () => setView({ s: MIN_SCALE, x: 0, y: 0 }, true),
    [setView],
  );

  /** Double-click / double-tap: zoom into that point, or back out if zoomed. */
  const toggleZoom = useCallback(
    (cx: number, cy: number) => {
      if (viewRef.current.s > MIN_SCALE) reset();
      else jumpTo(DOUBLE_TAP_SCALE, cx, cy);
    },
    [reset, jumpTo],
  );

  // ── keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "+" || e.key === "=") jumpTo(viewRef.current.s + STEP);
      if (e.key === "-") jumpTo(viewRef.current.s - STEP);
      if (e.key === "0") reset();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, jumpTo, reset]);

  // ── body-scroll lock ──────────────────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // ── measurements ──────────────────────────────────────────────────────────
  // Pan limits come from the image's real size. Measured here rather than per
  // event so gestures never force a layout; re-clamps after a rotation.
  useEffect(() => {
    const el = containerRef.current;
    const img = imgRef.current;
    if (!el || !img) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      boxRef.current = {
        left: r.left,
        top: r.top,
        w: r.width,
        h: r.height,
        iw: img.offsetWidth, // layout size — unaffected by the transform
        ih: img.offsetHeight,
      };
      setView(viewRef.current);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(img); // fires again once the image has loaded
    return () => ro.disconnect();
  }, [setView]);

  // ── pointer / wheel gestures ──────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    /** Active pointers by id → last client position. Two or more = pinch. */
    const pointers = new Map<number, { x: number; y: number }>();
    let pinch: { dist: number; x: number; y: number } | null = null;
    let pressStart = { x: 0, y: 0 };
    let lastType = "mouse";
    let lastTap = { t: -Infinity, x: 0, y: 0 };

    const measurePinch = () => {
      const [a, b] = [...pointers.values()];
      return {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
      };
    };

    const onPointerDown = (e: PointerEvent) => {
      // The controls handle their own clicks; don't start a gesture on them
      if (e.button !== 0 || (e.target as Element).closest("button")) return;
      lastType = e.pointerType;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        movedRef.current = false;
        pressStart = { x: e.clientX, y: e.clientY };
        if (e.pointerType === "mouse" && viewRef.current.s > MIN_SCALE)
          setDragging(true);
      } else {
        movedRef.current = true; // a second finger makes it a pinch, not a tap
        pinch = measurePinch();
      }
    };

    // On window so a drag keeps working after the pointer leaves the image
    const onPointerMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      const cur = { x: e.clientX, y: e.clientY };
      pointers.set(e.pointerId, cur);
      if (Math.hypot(cur.x - pressStart.x, cur.y - pressStart.y) > TAP_SLOP)
        movedRef.current = true;

      const v = viewRef.current;
      if (pinch) {
        // Pan with the fingers' midpoint, then zoom about it, so the page
        // stays under the fingers
        const next = measurePinch();
        if (pinch.dist > 0) {
          const p = fromCentre(next.x, next.y);
          setView(
            zoomAt(
              { s: v.s, x: v.x + next.x - pinch.x, y: v.y + next.y - pinch.y },
              v.s * (next.dist / pinch.dist),
              p.x,
              p.y,
            ),
          );
        }
        pinch = next;
      } else if (v.s > MIN_SCALE) {
        // Pan by this event's own delta rather than the distance from the
        // press: after hitting an edge, dragging back moves the image at once
        setView({ s: v.s, x: v.x + cur.x - prev.x, y: v.y + cur.y - prev.y });
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!pointers.delete(e.pointerId)) return;
      // 2 → 1 fingers: the remaining finger pans on from its last position
      pinch = pointers.size >= 2 ? measurePinch() : null;
      if (pointers.size > 0) return;
      setDragging(false);

      // Double-tap for touch and pen. Mouse double-clicks go through the
      // native dblclick below, which respects the OS double-click speed.
      if (
        e.type !== "pointerup" ||
        e.pointerType === "mouse" ||
        movedRef.current
      )
        return;
      const near =
        Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 40;
      if (e.timeStamp - lastTap.t < DOUBLE_TAP_MS && near) {
        lastTap.t = -Infinity;
        toggleZoom(e.clientX, e.clientY);
      } else {
        lastTap = { t: e.timeStamp, x: e.clientX, y: e.clientY };
      }
    };

    const onDblClick = (e: MouseEvent) => {
      // Touch double-taps are handled above; browsers that also synthesise a
      // dblclick for them would otherwise undo the zoom straight away. A fast
      // double click on +/− must not reset the zoom either.
      if (lastType !== "mouse" || (e.target as Element).closest("button"))
        return;
      toggleZoom(e.clientX, e.clientY);
    };

    // Non-passive so preventDefault can stop the page scrolling or zooming
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const v = viewRef.current;
      const p = fromCentre(e.clientX, e.clientY);
      setView(
        zoomAt(v, v.s * wheelFactor(e.deltaY, e.deltaMode, e.ctrlKey), p.x, p.y),
      );
    };

    // touch-none covers modern browsers; this also stops older iOS Safari
    // from pinch-zooming the page underneath
    const onTouchMove = (e: TouchEvent) => e.preventDefault();

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("dblclick", onDblClick);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("dblclick", onDblClick);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [fromCentre, setView, toggleZoom]);

  const cursor = dragging ? "grabbing" : scale > MIN_SCALE ? "grab" : "zoom-in";

  // Full-screen: the container itself is the fixed inset-0 layer, so
  // there's no separate "backdrop" — tapping anywhere that isn't the
  // image or a control (all of which stopPropagation) closes the modal,
  // unless zoomed in or the press was a drag.
  return createPortal(
    <div
      ref={containerRef}
      role="dialog"
      aria-modal
      aria-label={title ?? "Comic"}
      onClick={() => {
        if (viewRef.current.s <= MIN_SCALE && !movedRef.current) onClose();
      }}
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
          <span className="text-white text-[11px] uppercase tracking-[0.16em] font-mono truncate">
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

      {/* ── Comic image — setView writes its transform/transition directly;
          they stay out of `style` so a render can't overwrite a live frame ── */}
      <img
        ref={imgRef}
        src={src}
        alt={title ?? "Comic"}
        draggable={false}
        onClick={(e) => e.stopPropagation()}
        style={{ transformOrigin: "center center", willChange: "transform" }}
        className="block max-w-full max-h-full object-contain"
      />

      {/* ── Zoom control buttons (bottom-right) ── */}
      <div
        className="absolute right-3 z-20 flex items-center gap-1.5"
        style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        {scale > MIN_SCALE && (
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
            jumpTo(viewRef.current.s - STEP);
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
            jumpTo(viewRef.current.s + STEP);
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
          <span className="text-white/90 text-[10px] font-semibold bg-black/55 rounded-[2px] px-2.5 py-1 tabular-nums">
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
        <span className="text-white/80 text-[9px] bg-black/45 backdrop-blur-sm rounded-[2px] px-3 py-1 whitespace-nowrap">
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
