import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

// ─── Bump version to force the tour to re-show for existing users ─────────────
const TOUR_KEY = "playerTourV2";

// ─── Static step config (layout-only, no text) ───────────────────────────────
// Title and body come from i18n; only the structural fields live here.
interface TourStepConfig {
  target: string;
  side: "top" | "bottom";
  padding: number;
}

const STEP_CONFIG: TourStepConfig[] = [
  { target: "tour-player",     side: "bottom", padding: 14 },
  { target: "tour-comics",     side: "bottom", padding: 10 },
  { target: "tour-controls",   side: "top",    padding: 10 },
  { target: "tour-vocabulary", side: "top",    padding: 10 },
  { target: "tour-quiz",       side: "top",    padding: 12 },
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

// ─── Tooltip layout ───────────────────────────────────────────────────────────
const TIP_WIDTH  = 310;
const TIP_MARGIN = 14;

interface Layout {
  style: React.CSSProperties;
  side: "top" | "bottom";
  arrowOffset: number;
}

function resolveLayout(
  rect: SpotRect,
  preferred: "top" | "bottom",
  vw: number,
  vh: number,
): Layout {
  const cx = rect.x + rect.w / 2;

  let left = cx - TIP_WIDTH / 2;
  left = Math.max(TIP_MARGIN, Math.min(vw - TIP_WIDTH - TIP_MARGIN, left));
  const arrowOffset = cx - left;

  const spaceBelow = vh - rect.y - rect.h;
  const spaceAbove = rect.y;
  const side: "top" | "bottom" =
    preferred === "bottom" && spaceBelow >= 180 ? "bottom"
    : preferred === "top"  && spaceAbove >= 180 ? "top"
    : spaceBelow >= spaceAbove                  ? "bottom"
    : "top";

  const style: React.CSSProperties =
    side === "bottom"
      ? { position: "fixed", left, top: rect.y + rect.h + 16, width: TIP_WIDTH }
      : { position: "fixed", left, top: rect.y - 16,          width: TIP_WIDTH,
          transform: "translateY(-100%)" };

  return { style, side, arrowOffset };
}

// ─── Component ────────────────────────────────────────────────────────────────
export const GuidedTour: React.FC = () => {
  const { t } = useTranslation();

  const [step,    setStep]    = useState(0);
  const [visible, setVisible] = useState(false);
  const [rect,    setRect]    = useState<SpotRect | null>(null);
  const [vp,      setVp]      = useState({ w: window.innerWidth, h: window.innerHeight });
  const rafRef = useRef<number>(0);

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
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(TOUR_KEY, "1");
    cancelAnimationFrame(rafRef.current);
    setVisible(false);
  }, []);

  const goNext = useCallback(() => {
    if (step < steps.length - 1) setStep((s) => s + 1);
    else dismiss();
  }, [step, steps.length, dismiss]);

  useEffect(() => {
    if (!visible) return;
    const { target, padding } = steps[step];

    setRect(measureTarget(target, padding));

    const tick = () => {
      setRect(measureTarget(target, padding));
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

  const layout: Layout = rect
    ? resolveLayout(rect, current.side, vp.w, vp.h)
    : {
        style:       { position: "fixed", left: vp.w / 2 - TIP_WIDTH / 2, top: vp.h / 2, width: TIP_WIDTH },
        side:        "bottom",
        arrowOffset: TIP_WIDTH / 2,
      };

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
      <div style={{ ...layout.style, zIndex: 9998 }}>

        {/* Connector arrow */}
        <div
          style={{
            position: "absolute",
            left:     layout.arrowOffset - 8,
            ...(layout.side === "bottom" ? { top: -7 } : { bottom: -7 }),
            width:       16,
            height:      16,
            background:  "white",
            transform:   "rotate(45deg)",
            borderRadius: 3,
          }}
        />

        {/* Card body */}
        <div className="relative bg-white rounded-2xl shadow-2xl px-5 pt-5 pb-4 flex flex-col gap-2.5">

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === step ? "w-5 bg-green-500"
                  : i < step  ? "w-2 bg-green-300"
                  :             "w-2 bg-gray-200"
                }`}
              />
            ))}
          </div>

          {/* Step counter */}
          <p className="text-[10px] text-center text-gray-400 uppercase tracking-widest font-semibold">
            {t("guidedTour.stepCounter", { current: step + 1, total: steps.length })}
          </p>

          {/* Title */}
          <h3 className="text-[15px] font-bold text-gray-900 text-center leading-snug">
            {current.title}
          </h3>

          {/* Description */}
          <p className="text-[13px] text-gray-600 leading-relaxed text-center">
            {current.body}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between mt-2">
            <button
              onClick={dismiss}
              className="text-[11px] text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
            >
              {t("guidedTour.skip")}
            </button>

            <button
              onClick={goNext}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl
                         bg-green-500 hover:bg-green-400 active:scale-95
                         text-white text-[13px] font-semibold
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