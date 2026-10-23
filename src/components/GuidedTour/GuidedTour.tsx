import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

// ─── Bump version to force the tour to re-show for existing users ─────────────
const TOUR_KEY = "playerTourV4";

// ─── Static step config (layout-only, no text) ───────────────────────────────
// Title and body come from i18n; only the structural fields live here.
interface TourStepConfig {
  target: string;
  side: "top" | "bottom";
  padding: number;
}

// Text is matched to a step by POSITION (guidedTour.steps.<i> in the locales),
// so reordering here means reordering both translation files too. Each "why"
// step spotlights the same control as the "what" step right before it.
const STEP_CONFIG: TourStepConfig[] = [
  { target: "tour-player",     side: "top",    padding: 14 },
  { target: "tour-comics",     side: "bottom", padding: 10 },
  { target: "tour-speed",      side: "bottom", padding: 10 },
  { target: "tour-speed",      side: "bottom", padding: 10 }, // why 3 speeds
  { target: "tour-repeat",     side: "bottom", padding: 10 },
  { target: "tour-repeat",     side: "bottom", padding: 10 }, // why 3 repetitions
  { target: "tour-vocabulary", side: "top",    padding: 10 },
  { target: "tour-vocabulary", side: "top",    padding: 10 }, // why the words are in Russian
  // { target: "tour-quiz",       side: "top",    padding: 12 },
];

// ─── Geometry helpers ─────────────────────────────────────────────────────────
interface SpotRect { x: number; y: number; w: number; h: number }

function measureTarget(target: string, padding: number): SpotRect | null {
  const els = document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`);
  for (const el of Array.from(els)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      return {
        x: r.left - padding,
        y: r.top  - padding,
        w: r.width  + padding * 2,
        h: r.height + padding * 2,
      };
    }
  }
  return null;
}

const sameRect = (a: SpotRect | null, b: SpotRect | null) =>
  a === b || (!!a && !!b && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h);

// ─── Tooltip layout ───────────────────────────────────────────────────────────
const TIP_WIDTH   = 310;
const TIP_MARGIN  = 12; // min distance from the viewport edge
const TIP_GAP     = 16; // distance from the spotlight
const ARROW_INSET = 20; // keeps the arrow off the card's rounded corners

type Side = "top" | "bottom" | "left" | "right";

interface Layout {
  left: number;
  top: number;
  width: number;
  side: Side | null; // null: no side had room, the card sits over the target with no arrow
  arrowOffset: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// The card is measured (cardH) and every result is clamped to the viewport, so
// it can never be pushed off screen: a tall target (the desktop word rail, the
// player on a short phone) used to send it above the top edge, Next included.
function resolveLayout(
  rect: SpotRect | null,
  preferred: "top" | "bottom",
  vw: number,
  vh: number,
  cardH: number,
): Layout {
  const width   = Math.min(TIP_WIDTH, vw - TIP_MARGIN * 2);
  const maxLeft = Math.max(TIP_MARGIN, vw - width - TIP_MARGIN);
  const maxTop  = Math.max(TIP_MARGIN, vh - cardH - TIP_MARGIN);

  if (!rect) {
    return {
      left: (vw - width) / 2,
      top:  clamp((vh - cardH) / 2, TIP_MARGIN, maxTop),
      width, side: null, arrowOffset: 0,
    };
  }

  // Aim at the part of the spotlight that is actually on screen.
  const cx = (Math.max(rect.x, 0) + Math.min(rect.x + rect.w, vw)) / 2;
  const cy = (Math.max(rect.y, 0) + Math.min(rect.y + rect.h, vh)) / 2;

  // Where the card would go on each side. A side counts only if the card lands
  // fully on screen there, which also rules out the side of a target that is
  // itself still off screen (mid-scroll, or a container that can't scroll it in).
  const alongX = clamp(cx - width / 2, TIP_MARGIN, maxLeft);
  const alongY = clamp(cy - cardH / 2, TIP_MARGIN, maxTop);
  const spots: Record<Side, { left: number; top: number }> = {
    top:    { left: alongX, top: rect.y - TIP_GAP - cardH },
    bottom: { left: alongX, top: rect.y + rect.h + TIP_GAP },
    left:   { left: rect.x - TIP_GAP - width,  top: alongY },
    right:  { left: rect.x + rect.w + TIP_GAP, top: alongY },
  };
  const onScreen = ({ left, top }: { left: number; top: number }) =>
    left >= TIP_MARGIN && left <= maxLeft && top >= TIP_MARGIN && top <= maxTop;

  const order: Side[] = preferred === "top"
    ? ["top", "bottom", "right", "left"]
    : ["bottom", "top", "right", "left"];
  const side = order.find((s) => onScreen(spots[s]));

  if (side) {
    const { left, top } = spots[side];
    const arrowOffset = side === "top" || side === "bottom"
      ? clamp(cx - left, ARROW_INSET, width - ARROW_INSET)
      : clamp(cy - top,  ARROW_INSET, cardH - ARROW_INSET);
    return { left, top, width, side, arrowOffset };
  }

  // Nowhere fits: overlap the target as little as possible, on the roomier side.
  const spaceAbove = rect.y;
  const spaceBelow = vh - (rect.y + rect.h);
  const top = clamp(spaceBelow >= spaceAbove ? spots.bottom.top : spots.top.top, TIP_MARGIN, maxTop);
  return { left: alongX, top, width, side: null, arrowOffset: 0 };
}

// clientWidth/Height leave out the desktop scrollbar, and on mobile Safari
// clientHeight is the viewport with the toolbars shown, the safe one to fit.
const readViewport = () => ({
  w: document.documentElement.clientWidth  || window.innerWidth,
  h: document.documentElement.clientHeight || window.innerHeight,
});

// ─── Component ────────────────────────────────────────────────────────────────
export const GuidedTour: React.FC = () => {
  const { t } = useTranslation();

  const [step,    setStep]    = useState(0);
  const [visible, setVisible] = useState(false);
  const [rect,    setRect]    = useState<SpotRect | null>(null);
  const [vp,      setVp]      = useState(readViewport);
  const [cardH,   setCardH]   = useState(0);
  const rafRef  = useRef<number>(0);
  const cardRef = useRef<HTMLDivElement>(null);

  // ── Build translated steps array, re-derived whenever language changes ──────
  // useMemo re-runs when `t` identity changes (i.e. on language switch).
  const steps = useMemo(
    () =>
      STEP_CONFIG.map((cfg, i) => ({
        ...cfg,
        title: t(`guidedTour.steps.${i}.title`),
        body:  t(`guidedTour.steps.${i}.body`),
      })),
    [t],
  );

  useEffect(() => {
    if (!localStorage.getItem(TOUR_KEY)) {
      const id = setTimeout(() => setVisible(true), 700);
      return () => clearTimeout(id);
    }
  }, []);

  useEffect(() => {
    const onResize = () => setVp(readViewport());
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
    };
  }, []);

  // The card's height decides which side it fits on, and it changes with the
  // step's text and the viewport width. Measured before paint, so the first
  // frame of a step is already placed correctly; the observer catches the
  // rest (a web font arriving late).
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!visible || !el) return;
    const measure = () => setCardH(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [visible, step, steps, vp]);

  const dismiss = useCallback(() => {
    localStorage.setItem(TOUR_KEY, "1");
    cancelAnimationFrame(rafRef.current);
    setVisible(false);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, dismiss]);

  const goNext = useCallback(() => {
    if (step < steps.length - 1) setStep((s) => s + 1);
    else dismiss();
  }, [step, steps.length, dismiss]);

  useEffect(() => {
    if (!visible) return;
    const { target, padding } = steps[step];

    setRect(measureTarget(target, padding));

    // Measured every frame so the spotlight follows a target that scrolls or
    // animates, but only committed when it moved — a fresh object each frame
    // re-rendered the full-screen overlay 60 times a second while idle.
    const tick = () => {
      const next = measureTarget(target, padding);
      setRect((prev) => (sameRect(prev, next) ? prev : next));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [visible, step, steps]);

  useEffect(() => {
    if (!visible) return;

    const el = document.querySelector<HTMLElement>(`[data-tour="${steps[step].target}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });

    const skipId = setTimeout(() => {
      const found = Array.from(
        document.querySelectorAll<HTMLElement>(`[data-tour="${steps[step].target}"]`),
      ).some((e) => e.getBoundingClientRect().width > 0);
      if (!found) goNext();
    }, 400);

    return () => clearTimeout(skipId);
  }, [visible, step, steps, goNext]);

  if (!visible) return null;

  const current = steps[step];
  const isLast  = step === steps.length - 1;

  const layout: Layout = resolveLayout(rect, current.side, vp.w, vp.h, cardH);

  // The arrow sits on the card edge that faces the spotlight.
  const arrowStyle: React.CSSProperties | null =
      layout.side === "bottom" ? { top: -7,    left: layout.arrowOffset - 8 }
    : layout.side === "top"    ? { bottom: -7, left: layout.arrowOffset - 8 }
    : layout.side === "right"  ? { left: -7,   top:  layout.arrowOffset - 8 }
    : layout.side === "left"   ? { right: -7,  top:  layout.arrowOffset - 8 }
    : null;

  return createPortal(
    <>
      {/* ── 1. Interaction blocker ── */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 9996, cursor: "default" }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      />

      {/* ── 2. SVG overlay with spotlight cutout ── */}
      <svg
        width={vp.w}
        height={vp.h}
        style={{ position: "fixed", inset: 0, zIndex: 9997, pointerEvents: "none" }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                x={rect.x} y={rect.y}
                width={rect.w} height={rect.h}
                rx={12} ry={12}
                fill="black"
              />
            )}
          </mask>
        </defs>

        <rect
          width="100%" height="100%"
          fill="rgba(0,0,0,0.72)"
          mask="url(#tour-mask)"
        />

        {rect && (
          <rect
            x={rect.x - 1} y={rect.y - 1}
            width={rect.w + 2} height={rect.h + 2}
            rx={13} ry={13}
            fill="none"
            stroke="rgba(255,255,255,0.55)"
            strokeWidth={2}
          />
        )}
      </svg>

      {/* ── 3. Tooltip card ── */}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label={current.title}
        style={{
          position:  "fixed",
          left:      layout.left,
          top:       layout.top,
          width:     layout.width,
          maxHeight: vp.h - TIP_MARGIN * 2,
          zIndex:    9998,
          display:   "flex",
        }}
      >

        {/* Connector arrow */}
        {arrowStyle && (
          <div
            style={{
              position: "absolute",
              ...arrowStyle,
              width:       16,
              height:      16,
              background:  "white",
              transform:   "rotate(45deg)",
              borderRadius: 3,
            }}
          />
        )}

        {/* Card body — only the description scrolls, so on a very short
            screen the buttons stay visible */}
        <div className="relative min-h-0 w-full bg-white rounded-[3px] shadow-xl px-5 pt-5 pb-4 flex flex-col gap-2.5">

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === step ? "w-5 bg-gray-900"
                  : i < step  ? "w-2 bg-gray-400"
                  :             "w-2 bg-gray-200"
                }`}
              />
            ))}
          </div>

          {/* Step counter */}
          <p className="font-mono text-[10px] text-center text-gray-400 uppercase tracking-[0.16em]">
            {t("guidedTour.stepCounter", { current: step + 1, total: steps.length })}
          </p>

          {/* Title */}
          <h3 className="text-[15px] font-bold text-gray-900 text-center leading-snug">
            {current.title}
          </h3>

          {/* Description */}
          <p className="min-h-0 overflow-y-auto text-[13px] text-gray-600 leading-relaxed text-center">
            {current.body}
          </p>

          {/* Footer */}
          <div className="flex shrink-0 items-center justify-between gap-3 mt-2">
            {!isLast ? (
              <button
                onClick={dismiss}
                className="px-1 py-2 text-[13px] font-medium text-gray-500 hover:text-gray-900
                           cursor-pointer transition-colors"
              >
                {t("guidedTour.skip")}
              </button>
            ) : <span />}
            <button
              onClick={goNext}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[3px]
                         text-white text-[13px] font-semibold
                         cursor-pointer shadow-sm transition-all"
            >
              {!isLast ? (
                <>
                  {t("guidedTour.next")}
                  <svg
                    viewBox="0 0 16 16" fill="none" stroke="currentColor"
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    className="w-3.5 h-3.5"
                  >
                    <path d="M6 3l5 5-5 5" />
                  </svg>
                </>
              ) : (
                t("guidedTour.letsGo")
              )}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
};