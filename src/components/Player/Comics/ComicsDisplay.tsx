import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
// import { storyFolderMap } from "../../../modules/vocabulary/Vocabulary";

// Maps difficulty → character folder name in public/assets/
const characterFolderMap: Record<string, string> = {
  easy:   "leo",
  medium: "maya",
  hard:   "hard", // rename to match your actual folder name
};

const comicManifest: Record<string, string[]> = {
  easy: [
    "1. Meet Leo",
    "2. Leo's mornings",
    "3. Leo's Favorite Food",
    "4. Leo's family",
    "5. Leo's clothes",
    "6. A Day at the Beach",
    "7. A Country Leo Wants to Visit",
    "8. Leo's hobbies",
    "9. Meeting a friend",
    "10. The Lost Kitten",
  ],
  medium: [
    "1. Meet Maya",
    "2. A trip to Kyoto",
    "3. Trying street food in Bangkok",
    "4. A missed connection",
    "5. Family Across Borders",
    "6. Budgeting for adventure",
    "7. Discussing environmental concerns",
    "8. An unexpected interview",
    "9. The Mountain Festival - Part 1",
    "10. The Mountain Festival - Part 2",
  ],
  hard: [
    "1. Introducing Myself",
    "2. The deal that nearly broke me",
    "3. The Conference in Munich",
    "4. A Failure with a Silver Lining",
    "5. The Bridge at Low Tide",
    "6. Night of the Phantom Pallets",
    "7. Family Weather Report",
    "8. The Price of Enough",
    "9. Family on the Manifest, Part I The Itinerary That Blinked",
    "10. Family on the Manifest, Part II The Break That Tested the Break",
  ],
};

// Builds full public URLs from the manifest
export function getOrderedComics(difficulty: string): string[] {
  const folder = characterFolderMap[difficulty];
  const files  = comicManifest[difficulty];
  if (!folder || !files) return [];
  return files.map(name => `/assets/${folder}/comics/${name}.jpg`);
}

export const orderedComicsEasy: string[] = getOrderedComics("easy");

// ─── Zoom helpers (module-level — pure, no closures) ─────────────────────────
const MIN_SCALE = 1;
const MAX_SCALE = 5;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

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

// ─── Modal ────────────────────────────────────────────────────────────────────
interface ModalProps {
  src: string;
  title?: string;
  onClose: () => void;
}

const ComicsModal: React.FC<ModalProps> = ({ src, title, onClose }) => {
  // ── zoom / pan state ──────────────────────────────────────────────────────
  const [scale,    setScale]    = useState(1);
  const [pos,      setPos]      = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  /**
   * Refs mirror the state above so that native event listeners (attached via
   * useEffect) always read current values without becoming stale closures.
   */
  const scaleRef    = useRef(1);
  const posRef      = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const dragRef     = useRef<{
    mx: number; my: number; tx: number; ty: number;
  } | null>(null);
  const movedRef    = useRef(false);          // pointer moved since last down?
  const pinchRef    = useRef<number | null>(null); // previous pinch distance
  const tapRef      = useRef(0);              // ms timestamp — double-tap detection
  const containerRef = useRef<HTMLDivElement>(null);

  // ── commit: update both state and mirror-refs atomically ─────────────────
  const commit = useCallback((s: number, p: { x: number; y: number }) => {
    scaleRef.current = s;
    posRef.current   = p;
    setScale(s);
    setPos(p);
  }, []);

  /**
   * Zoom to `newS` keeping the screen point (px, py) — expressed in pixels
   * relative to the container's centre — visually fixed underneath the pointer.
   */
  const zoom = useCallback((newS: number, px: number, py: number) => {
    newS = clamp(newS, MIN_SCALE, MAX_SCALE);
    const s         = scaleRef.current;
    const { x: tx, y: ty } = posRef.current;
    commit(
      newS,
      clampPos(
        px - (px - tx) * (newS / s),
        py - (py - ty) * (newS / s),
        newS,
      ),
    );
  }, [commit]);

  const reset = useCallback(() => commit(1, { x: 0, y: 0 }), [commit]);

  // ── keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape")             { onClose(); return; }
      if (e.key === "+" || e.key === "=") zoom(clamp(scaleRef.current + 0.5, MIN_SCALE, MAX_SCALE), 0, 0);
      if (e.key === "-")                  zoom(clamp(scaleRef.current - 0.5, MIN_SCALE, MAX_SCALE), 0, 0);
      if (e.key === "0")                  reset();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, zoom, reset]);

  // ── body-scroll lock ──────────────────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
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
      movedRef.current    = false;
      setDragging(true);
      dragRef.current = {
        mx: e.clientX, my: e.clientY,
        tx: posRef.current.x, ty: posRef.current.y,
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
      dragRef.current     = null;
      setDragging(false);
    };

    // ── Double-click: zoom in to 2.5× (or reset when already zoomed) ──────
    const onDblClick = (e: MouseEvent) => {
      e.stopPropagation();
      if (scaleRef.current > 1) { reset(); return; }
      const p = getPivot(e.clientX, e.clientY);
      zoom(2.5, p.x, p.y);
    };

    // ── Touch ─────────────────────────────────────────────────────────────
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        draggingRef.current = true;
        movedRef.current    = false;
        dragRef.current = {
          mx: e.touches[0].clientX, my: e.touches[0].clientY,
          tx: posRef.current.x,     ty: posRef.current.y,
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
        const dx   = e.touches[0].clientX - e.touches[1].clientX;
        const dy   = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const r    = el.getBoundingClientRect();
        zoom(
          scaleRef.current * (dist / pinchRef.current),
          (e.touches[0].clientX + e.touches[1].clientX) / 2 - r.left - r.width  / 2,
          (e.touches[0].clientY + e.touches[1].clientY) / 2 - r.top  - r.height / 2,
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
        pinchRef.current    = null;
        draggingRef.current = true;
        dragRef.current = {
          mx: e.touches[0].clientX, my: e.touches[0].clientY,
          tx: posRef.current.x,     ty: posRef.current.y,
        };
      }
    };

    el.addEventListener("wheel",      onWheel,      { passive: false });
    el.addEventListener("mousedown",  onMouseDown);
    el.addEventListener("dblclick",   onDblClick);
    el.addEventListener("touchstart", onTouchStart, { passive: true  });
    el.addEventListener("touchmove",  onTouchMove,  { passive: false });
    el.addEventListener("touchend",   onTouchEnd,   { passive: true  });
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup",   onMouseUp);

    return () => {
      el.removeEventListener("wheel",      onWheel);
      el.removeEventListener("mousedown",  onMouseDown);
      el.removeEventListener("dblclick",   onDblClick);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove",  onTouchMove);
      el.removeEventListener("touchend",   onTouchEnd);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup",   onMouseUp);
    };
  }, [zoom, reset]);

  const cursor = dragging ? "grabbing" : scale > 1 ? "grab" : "zoom-in";

  return createPortal(
    <div
      role="dialog"
      aria-modal
      aria-label={title ?? "Comic"}
      // Clicking the dark backdrop closes only when not zoomed in,
      // to avoid accidental dismissal while the user is exploring.
      onClick={scale <= 1 ? onClose : undefined}
      style={{ animation: "comicsBackdropIn 200ms ease forwards" }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "comicsScaleIn 220ms cubic-bezier(0.34,1.56,0.64,1) forwards", cursor }}
        // touch-none: let our own handlers govern all touch gestures
        className="relative rounded-2xl overflow-hidden shadow-2xl bg-white max-w-[90vw] max-h-[90vh] flex flex-col select-none touch-none"
      >

        {/* ── Top gradient + title ── */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center px-4 py-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
          {title && (
            <span className="text-white text-[11px] uppercase tracking-widest font-semibold font-['Montserrat'] truncate">
              {title}
            </span>
          )}
        </div>

        {/* ── Close button ── */}
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          aria-label="Close"
          className="absolute top-2 right-2 z-20 w-9 h-9 rounded-full bg-black/50 hover:bg-black/75 text-white text-xl leading-none flex items-center justify-center transition-colors"
        >
          ×
        </button>

        {/* ── Comic image — transform is applied only here ── */}
        <img
          src={src}
          alt={title ?? "Comic"}
          draggable={false}
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
            transformOrigin: "center center",
            // Disable transition while actively dragging for immediate 1:1 response
            transition: dragging ? "none" : "transform 120ms ease-out",
            willChange: "transform",
          }}
          className="block max-w-[88vw] max-h-[88vh] object-contain"
        />

        {/* ── Zoom control buttons (bottom-right) ── */}
        <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5">
          {scale > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); reset(); }}
              aria-label="Reset zoom"
              title="Reset zoom (0)"
              className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white text-base flex items-center justify-center transition-colors"
            >
              ↺
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); zoom(clamp(scale - 0.5, MIN_SCALE, MAX_SCALE), 0, 0); }}
            disabled={scale <= MIN_SCALE}
            aria-label="Zoom out"
            title="Zoom out (−)"
            className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xl flex items-center justify-center transition-colors"
          >
            −
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); zoom(clamp(scale + 0.5, MIN_SCALE, MAX_SCALE), 0, 0); }}
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
          <div className="absolute bottom-3 left-3 z-20 pointer-events-none">
            <span className="text-white/90 text-[10px] font-semibold font-['Montserrat'] bg-black/55 rounded-full px-2.5 py-1 tabular-nums">
              {Math.round(scale * 100)}%
            </span>
          </div>
        )}

        {/* ── One-shot usage hint — auto-fades after ~4 s ── */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-[3.25rem] flex justify-center pointer-events-none z-10"
          style={{ animation: "comicsHintFade 4s ease forwards" }}
        >
          <span className="text-white/80 text-[9px] font-['Montserrat'] bg-black/45 backdrop-blur-sm rounded-full px-3 py-1 whitespace-nowrap">
            Scroll · Pinch to zoom &nbsp;·&nbsp; Double-click to zoom in
          </span>
        </div>
      </div>

      <style>{`
        @keyframes comicsBackdropIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes comicsScaleIn {
          from { opacity: 0; transform: scale(0.88); }
          to   { opacity: 1; transform: scale(1); }
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

// ─── Preview card ─────────────────────────────────────────────────────────────
interface ComicsDisplayProps {
  /** 1-based story index */
  storyIndex: number;
  title?: string;
  /** "easy" | "medium" | "hard" — selects the correct character folder */
  variant?: "card" | "circular";
  difficulty: string;
}

export const ComicsDisplay: React.FC<ComicsDisplayProps> = ({
  storyIndex,
  title,
  difficulty,
  variant = "card",
}) => {
  const [open, setOpen] = useState(false);

  const comics = getOrderedComics(difficulty);
  const src = comics[storyIndex - 1];

  const handleOpen  = useCallback(() => setOpen(true),  []);
  const handleClose = useCallback(() => setOpen(false), []);

  // ── empty-state ────────────────────────────────────────────────
  if (!src) {
    if (variant === "circular") {
      return (
        <div className="w-14 h-14 rounded-full bg-white/10 border-2 border-white/15
                        flex items-center justify-center">
          <span className="text-white/40 text-[7px] uppercase tracking-widest
                           font-semibold font-['Montserrat'] text-center leading-tight px-1">
            No<br />Comic
          </span>
        </div>
      );
    }
    return (
      <div className="w-[70%] max-w-[280px] aspect-square mx-auto rounded-2xl
                      bg-white/10 border border-white/15 flex items-center justify-center">
        <span className="text-white/40 text-xs uppercase tracking-widest
                         font-semibold font-['Montserrat']">
          Comics
        </span>
      </div>
    );
  }

  // ── CIRCULAR variant (desktop PlayerControls button) ──────────
  if (variant === "circular") {
    return (
      <>
        <button
          onClick={handleOpen}
          aria-label="Open comic"
          className="
            w-14 h-14 rounded-full overflow-hidden
            border-2 border-white/30 hover:border-white/70
            bg-white/10 cursor-pointer group relative
            focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60
            transition-all duration-200 active:scale-95 shadow-lg
          "
        >
          <img
            src={src}
            alt={title ?? "Comic"}
            draggable={false}
            className="
              w-full h-full object-cover object-center
              scale-[1.65] group-hover:scale-[1.85]
              transition-transform duration-500 ease-out
            "
          />
          <div className="absolute inset-0 rounded-full
                          shadow-[inset_0_0_14px_rgba(0,0,0,0.45)]
                          pointer-events-none" />
          <div className="
            absolute inset-0 rounded-full flex items-center justify-center
            bg-black/0 group-hover:bg-black/30
            transition-colors duration-300 pointer-events-none
          ">
            <span className="
              text-white text-[7px] uppercase tracking-widest
              font-semibold font-['Montserrat']
              opacity-0 group-hover:opacity-100
              transition-opacity duration-300
            ">
              View
            </span>
          </div>
        </button>

        {open && <ComicsModal src={src} title={title} onClose={handleClose} />}
      </>
    );
  }

  // ── CARD variant (original) ────────────────────────────────────
  return (
    <>
      <button
        onClick={handleOpen}
        aria-label="Open comic"
        className="
          w-[70%] max-w-[280px] aspect-square mx-auto rounded-2xl overflow-hidden
          bg-white/10 border border-white/15 cursor-pointer group relative block
          focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60
        "
      >
        <img
          src={src}
          alt={title ?? "Comics preview"}
          draggable={false}
          className="
            w-full h-full object-cover object-center
            scale-[1.65] group-hover:scale-[1.82]
            transition-transform duration-500 ease-out
          "
        />
        <div className="absolute inset-0 shadow-[inset_0_0_24px_rgba(0,0,0,0.35)]
                        rounded-2xl pointer-events-none" />
        <div className="
          absolute inset-0 flex items-end justify-center pb-4
          opacity-0 group-hover:opacity-100 transition-opacity duration-300
        ">
          <span className="
            text-white text-[10px] uppercase tracking-widest
            font-semibold font-['Montserrat']
            bg-black/55 backdrop-blur-sm px-3 py-1 rounded-full
            translate-y-2 group-hover:translate-y-0 transition-transform duration-300
          ">
            View Comic
          </span>
        </div>
      </button>

      {open && <ComicsModal src={src} title={title} onClose={handleClose} />}
    </>
  );
};

export default ComicsDisplay;