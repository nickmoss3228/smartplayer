// components/Sheet/Sheet.tsx
//
// The shell every Dashboard window shares: a dimmed backdrop and a panel that
// is a bottom sheet on phones and a centred dialog from `sm` up.
//
// On phones the sheet has a handle (the "tongue") and can be pulled down to
// close, like the native sheets people already know. The drag works from the
// handle, and from anywhere else in the sheet as long as the content under the
// finger is scrolled to the top — otherwise a downward swipe is the content
// scrolling back up, and stealing it would make long lists unusable.
//
// The drag writes transform/opacity straight onto the DOM rather than through
// state: a touchmove fires every frame, and re-rendering the whole window
// (the difficulty window holds every story part) on each one would stutter.

import React, { useEffect, useRef } from "react";

interface SheetProps {
  onClose: () => void;
  /** id of the element that names the dialog */
  labelledBy?: string;
  /** Tailwind max-width for the panel; the sheet is full width on phones */
  widthClass?: string;
  children: React.ReactNode;
}

// Tailwind's `sm` breakpoint is 40rem; below it the panel is a bottom sheet.
const PHONE_QUERY = "(max-width: 639.98px)";

// Pull past whichever is larger, or flick, and the sheet closes.
const CLOSE_MIN_PX = 90;
const CLOSE_FRACTION = 0.25;
const FLICK_PX_PER_MS = 0.5;
// A flick only counts if the finger was still moving this recently.
const FLICK_STALE_MS = 100;
// Movement before deciding whether this touch is a drag or something else.
const SLOP_PX = 6;
// Swallow the click a browser may still fire where the finger lifted.
const CLICK_GUARD_MS = 400;

const CLOSE_MS = 220;
const SNAP_BACK = "transform 280ms cubic-bezier(0.2, 0.9, 0.3, 1)";
const SLIDE_OUT = `transform ${CLOSE_MS}ms cubic-bezier(0.4, 0, 1, 1)`;

const matches = (query: string) =>
  typeof window !== "undefined" && !!window.matchMedia?.(query).matches;

/** Is the touch inside something that is scrolled away from its top? */
function insideScrolledContent(target: Element, panel: Element): boolean {
  for (let el: Element | null = target; el && el !== panel; el = el.parentElement) {
    const { overflowY } = window.getComputedStyle(el);
    const scrollable =
      (overflowY === "auto" || overflowY === "scroll") && el.scrollHeight > el.clientHeight;
    if (scrollable && el.scrollTop > 0) return true;
  }
  return false;
}

interface Gesture {
  startX: number;
  startY: number;
  lastY: number;
  lastT: number;
  velocity: number;
  dragging: boolean;
  height: number;
}

const Sheet: React.FC<SheetProps> = ({
  onClose,
  labelledBy,
  widthClass = "max-w-md",
  children,
}) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const wrap = wrapRef.current;
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (!wrap || !panel || !backdrop) return;

    let gesture: Gesture | null = null;
    let closing = false;
    let clickGuardUntil = 0;
    let closeTimer: ReturnType<typeof setTimeout> | undefined;

    const place = (y: number, height: number, transition: string) => {
      wrap.style.transition = transition;
      backdrop.style.transition = transition ? transition.replace("transform", "opacity") : "";
      wrap.style.transform = y ? `translate3d(0, ${y}px, 0)` : "";
      // The backdrop thins out as the sheet leaves, so the page behind shows
      // what you are about to return to.
      backdrop.style.opacity = String(1 - Math.min(1, Math.max(0, y) / height));
    };

    const onTouchStart = (e: TouchEvent) => {
      gesture = null;
      if (closing || e.touches.length !== 1 || !matches(PHONE_QUERY)) return;
      const target = e.target as Element;
      if (target.closest("[data-sheet-no-drag]")) return;
      const fromHandle = !!handleRef.current?.contains(target);
      if (!fromHandle && insideScrolledContent(target, panel)) return;

      const touch = e.touches[0];
      gesture = {
        startX: touch.clientX,
        startY: touch.clientY,
        lastY: 0,
        lastT: e.timeStamp,
        velocity: 0,
        dragging: false,
        height: wrap.offsetHeight || 1,
      };
    };

    const onTouchMove = (e: TouchEvent) => {
      const g = gesture;
      if (!g) return;
      const touch = e.touches[0];
      const dx = touch.clientX - g.startX;
      const dy = touch.clientY - g.startY;

      if (!g.dragging) {
        if (Math.abs(dx) < SLOP_PX && Math.abs(dy) < SLOP_PX) return;
        // Only a mostly-downward move is ours; anything else is a scroll, a
        // tap that wobbled, or a horizontal swipe, and is left alone.
        if (dy <= 0 || Math.abs(dy) < Math.abs(dx)) {
          gesture = null;
          return;
        }
        g.dragging = true;
      }

      // Not passive, so this stops the page (and iOS overscroll) moving too.
      e.preventDefault();

      // Upward pulls give a little and stop, so the sheet feels attached.
      const y = dy >= 0 ? dy : -Math.min(12, Math.sqrt(-dy) * 2);
      const dt = Math.max(1, e.timeStamp - g.lastT);
      g.velocity = 0.7 * ((y - g.lastY) / dt) + 0.3 * g.velocity;
      g.lastY = y;
      g.lastT = e.timeStamp;
      place(y, g.height, "");
    };

    const finish = (cancelled: boolean, endT: number) => {
      const g = gesture;
      gesture = null;
      if (!g?.dragging) return;
      clickGuardUntil = Date.now() + CLICK_GUARD_MS;

      const pulledFar = g.lastY > Math.max(CLOSE_MIN_PX, g.height * CLOSE_FRACTION);
      // The speed is that of the last movement. A finger that pulled quickly,
      // stopped, and only then let go was not flicking — without this the
      // stale speed would still close the sheet.
      const stillFor = endT - g.lastT;
      const flicked =
        stillFor < FLICK_STALE_MS && g.velocity > FLICK_PX_PER_MS && g.lastY > SLOP_PX * 3;

      if (!cancelled && (pulledFar || flicked)) {
        closing = true;
        if (matches("(prefers-reduced-motion: reduce)")) {
          onCloseRef.current();
          return;
        }
        place(g.height + 16, g.height, SLIDE_OUT);
        closeTimer = setTimeout(() => onCloseRef.current(), CLOSE_MS);
      } else {
        place(0, g.height, SNAP_BACK);
      }
    };

    const onTouchEnd = (e: TouchEvent) => finish(false, e.timeStamp);
    const onTouchCancel = (e: TouchEvent) => finish(true, e.timeStamp);

    const onClickCapture = (e: MouseEvent) => {
      if (Date.now() < clickGuardUntil) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    wrap.addEventListener("touchstart", onTouchStart, { passive: true });
    wrap.addEventListener("touchmove", onTouchMove, { passive: false });
    wrap.addEventListener("touchend", onTouchEnd);
    wrap.addEventListener("touchcancel", onTouchCancel);
    wrap.addEventListener("click", onClickCapture, true);
    return () => {
      clearTimeout(closeTimer);
      wrap.removeEventListener("touchstart", onTouchStart);
      wrap.removeEventListener("touchmove", onTouchMove);
      wrap.removeEventListener("touchend", onTouchEnd);
      wrap.removeEventListener("touchcancel", onTouchCancel);
      wrap.removeEventListener("click", onClickCapture, true);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      {/* Two layers: the outer one runs the entrance fade, the inner one is
          what the drag dims — an animation's fill would otherwise override
          the inline opacity. */}
      <div className="absolute inset-0 dialog-backdrop-in" onClick={onClose}>
        <div ref={backdropRef} className="absolute inset-0 bg-black/50" />
      </div>

      {/* Same split for the panel: the wrapper moves with the finger, the
          panel inside keeps its entrance animation. */}
      <div ref={wrapRef} className={`relative w-full ${widthClass}`}>
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          className="bg-white rounded-t-[3px] sm:rounded-[3px] w-full max-h-[88vh] sm:max-h-[85vh] overflow-hidden flex flex-col dialog-panel-in shadow-xl"
        >
          {/* The tongue. Phones only: a centred dialog is not dragged. */}
          <div
            ref={handleRef}
            aria-hidden="true"
            data-sheet-handle=""
            className="sm:hidden flex-shrink-0 flex justify-center pt-2 pb-1 touch-none cursor-grab active:cursor-grabbing"
          >
            <span className="block w-10 h-1.5 rounded-full bg-black/20" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Sheet;
