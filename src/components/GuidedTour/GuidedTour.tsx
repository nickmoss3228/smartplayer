import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

// ─── Bump version to force the tour to re-show for existing users ─────────────
const TOUR_KEY = "playerTourV6";
// Whoever finished the old 11-step tour (V5) has already read every hint below,
// so they get neither the short tour nor the hints.
const LEGACY_TOUR_KEY = "playerTourV5";
// The hints already shown on this device, as a JSON array of HintKey.
const HINTS_KEY = "playerHintsV1";

const readStorage = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const writeStorage = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // private mode: the tour or hint may show again next time, nothing worse
  }
};

// ─── Static step config (layout-only, no text) ───────────────────────────────
// Title and body come from i18n; only the structural fields live here.
interface TourStepConfig {
  target: string;
  side: "top" | "bottom";
  padding: number;
}

// Three steps: what to press to listen, how fast, how many times. Everything
// else is explained the first time the learner uses it (HINTS below), so the
// first minute in the player is spent listening, not reading.
//
// Text is matched to a step by POSITION (guidedTour.steps.<i> in the locales),
// so reordering here means reordering both translation files too.
const STEP_CONFIG: TourStepConfig[] = [
  { target: "tour-player", side: "top",    padding: 14 },
  { target: "tour-speed",  side: "bottom", padding: 10 },
  { target: "tour-repeat", side: "bottom", padding: 10 },
];

// ─── First-use hints ──────────────────────────────────────────────────────────
// One card per control, shown once, right after the learner first uses it
// (text: guidedTour.hints.<key>). Not modal: the player keeps working
// underneath, and a tap anywhere else puts the card away.
type HintKey = "comics" | "speed" | "repeat" | "vocabulary" | "mic";

interface HintConfig {
  key: HintKey;
  target: string;
  side: "top" | "bottom";
}

const HINTS: HintConfig[] = [
  { key: "comics",     target: "tour-comics",     side: "bottom" },
  { key: "speed",      target: "tour-speed",      side: "top" },
  { key: "repeat",     target: "tour-repeat",     side: "top" },
  { key: "vocabulary", target: "tour-vocabulary", side: "top" },
  { key: "mic",        target: "tour-mic",        side: "bottom" },
];

// Long enough for what the tap opened (the comic viewer, the word sheet) to be
// on screen, so the card is placed against what is actually there.
const HINT_DELAY_MS = 450;

const readSeenHints = (): Set<HintKey> => {
  try {
    const parsed: unknown = JSON.parse(readStorage(HINTS_KEY) ?? "[]");
    return new Set(Array.isArray(parsed) ? (parsed as HintKey[]) : []);
  } catch {
    return new Set();
  }
};

const markHintSeen = (key: HintKey) => {
  const seen = readSeenHints();
  seen.add(key);
  writeStorage(HINTS_KEY, JSON.stringify([...seen]));
};

/** Only a real control counts as using it, not its caption. */
const CONTROL = 'button, a, input, [role="button"], [role="slider"]';

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

/** The card's connector arrow, on the edge that faces the target. */
const arrowStyleFor = (layout: Layout): React.CSSProperties | null =>
    layout.side === "bottom" ? { top: -7,    left: layout.arrowOffset - 8 }
  : layout.side === "top"    ? { bottom: -7, left: layout.arrowOffset - 8 }
  : layout.side === "right"  ? { left: -7,   top:  layout.arrowOffset - 8 }
  : layout.side === "left"   ? { right: -7,  top:  layout.arrowOffset - 8 }
  : null;

const Arrow = ({ style }: { style: React.CSSProperties }) => (
  <div
    style={{
      position: "absolute",
      ...style,
      width:        16,
      height:       16,
      background:   "white",
      transform:    "rotate(45deg)",
      borderRadius: 3,
    }}
  />
);

/**
 * The tapped element's spotlight, or null when it is gone or covered (the tap
 * opened the comic viewer or the word sheet over it): the card then sits in
 * the middle of the screen instead of pointing at something hidden.
 */
function measureVisible(el: HTMLElement, padding: number): SpotRect | null {
  if (!el.isConnected) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return null;
  const cx = clamp(r.left + r.width / 2, 0, window.innerWidth - 1);
  const cy = clamp(r.top + r.height / 2, 0, window.innerHeight - 1);
  const top = document.elementFromPoint(cx, cy);
  if (top && !el.contains(top)) return null;
  return { x: r.left - padding, y: r.top - padding, w: r.width + padding * 2, h: r.height + padding * 2 };
}

function FirstUseHints() {
  const { t } = useTranslation();
  const [hint, setHint] = useState<{ cfg: HintConfig; el: HTMLElement } | null>(null);
  const [rect, setRect] = useState<SpotRect | null>(null);
  const [vp, setVp] = useState(readViewport);
  const [cardH, setCardH] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setHint(null), []);

  // Listen for the first use of each control. Capture phase, so a control that
  // stops propagation still counts; nothing is prevented, the tap does what it
  // always did. Attached for good, also while a card is up: the tap that puts
  // one card away can be the first use of another control.
  useEffect(() => {
    let timer = 0;
    const onClick = (e: MouseEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      const el = target?.closest<HTMLElement>("[data-tour]");
      if (!el || !target?.closest(CONTROL)) return;
      const cfg = HINTS.find((h) => h.target === el.dataset.tour);
      if (!cfg || readSeenHints().has(cfg.key)) return;
      // Seen the moment it is shown: ignoring it is an answer too.
      markHintSeen(cfg.key);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setHint({ cfg, el }), HINT_DELAY_MS);
    };
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.clearTimeout(timer);
    };
  }, []);

  // Follow the control while the card is up (it can scroll or re-layout).
  useEffect(() => {
    if (!hint) return;
    let raf = 0;
    const tick = () => {
      const next = measureVisible(hint.el, 8);
      setRect((prev) => (sameRect(prev, next) ? prev : next));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [hint]);

  // Put away by Escape or by a tap anywhere outside the card.
  useEffect(() => {
    if (!hint) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    const onDown = (e: PointerEvent) => {
      if (!cardRef.current?.contains(e.target as Node)) close();
    };
    const onResize = () => setVp(readViewport());
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("resize", onResize);
    };
  }, [hint, close]);

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!hint || !el) return;
    const measure = () => setCardH(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [hint, vp]);

  if (!hint) return null;

  const title = t(`guidedTour.hints.${hint.cfg.key}.title`);
  const layout = resolveLayout(rect, hint.cfg.side, vp.w, vp.h, cardH);
  const arrowStyle = arrowStyleFor(layout);

  return createPortal(
    <div
      ref={cardRef}
      role="dialog"
      aria-label={title}
      className="animate-fade-in"
      style={{
        position:  "fixed",
        left:      layout.left,
        top:       layout.top,
        width:     layout.width,
        maxHeight: vp.h - TIP_MARGIN * 2,
        zIndex:    10000, // above the comic viewer (ComicsModal, 9999) a tap may have opened
        display:   "flex",
      }}
    >
      {arrowStyle && <Arrow style={arrowStyle} />}
      <div className="relative min-h-0 w-full bg-white rounded-[3px] shadow-xl ring-1 ring-black/5 px-5 pt-4 pb-3 flex flex-col gap-2">
        <h3 className="text-[15px] font-bold text-gray-900 leading-snug">{title}</h3>
        <p className="min-h-0 overflow-y-auto text-[13px] text-gray-600 leading-relaxed">
          {t(`guidedTour.hints.${hint.cfg.key}.body`)}
        </p>
        <div className="flex shrink-0 justify-end">
          <button
            type="button"
            onClick={close}
            className="cursor-pointer rounded-[3px] px-3 py-2 text-[13px] font-semibold text-gray-900 transition-colors hover:bg-gray-100"
          >
            {t("guidedTour.gotIt")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
/**
 * The player's onboarding: a three-step tour on the first visit, then the
 * first-use hints. A learner who finished the old long tour gets neither.
 */
export const GuidedTour: React.FC = () => {
  const [veteran] = useState(() => readStorage(LEGACY_TOUR_KEY) !== null);
  const [tourDone, setTourDone] = useState(() => readStorage(TOUR_KEY) !== null);
  if (veteran) return null;
  return tourDone ? <FirstUseHints /> : <Tour onDone={() => setTourDone(true)} />;
};

function Tour({ onDone }: { onDone: () => void }) {
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

  // Mounted only while the tour is still to be shown (see GuidedTour).
  useEffect(() => {
    const id = setTimeout(() => setVisible(true), 700);
    return () => clearTimeout(id);
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
    writeStorage(TOUR_KEY, "1");
    cancelAnimationFrame(rafRef.current);
    setVisible(false);
    onDone();
  }, [onDone]);

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
  const arrowStyle = arrowStyleFor(layout);

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
        {arrowStyle && <Arrow style={arrowStyle} />}

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
                         bg-gray-900 hover:bg-black active:scale-95
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