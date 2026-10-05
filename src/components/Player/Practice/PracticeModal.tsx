import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { IoCheckmark, IoClose } from "react-icons/io5";

export type PracticeKind = "quiz" | "words" | "comic";

export interface PracticeOption {
  kind: PracticeKind;
  /** Questions, words or lines — what the tile says it holds. */
  count: number;
  /**
   * Finished: the quiz passed, every word of the part learned, or a round of
   * the comic game passed. Drawn as a green outline and a tick.
   */
  done: boolean;
}

interface PracticeModalProps {
  /** The part just heard, as students count it (from 1). */
  part: number;
  /** The part the quiz opens; null on the last one. */
  nextPart: number | null;
  /** Only what this part has, quiz first. */
  options: PracticeOption[];
  onPick: (kind: PracticeKind) => void;
  onClose: () => void;
}

// ── drawings ────────────────────────────────────────────────────────────────
// In the method scenes' line language (components/Method): near-white strokes
// on the ink panel, one signal-red detail that marks what each game is about.

const line = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;
const accent = { ...line, stroke: "var(--color-signal)", strokeWidth: 2.2 };

/** A question card with three answers, one ticked. */
const QuizArt = ({ className }: { className: string }) => (
  <svg viewBox="0 0 92 60" className={className} aria-hidden="true">
    <rect {...line} x="6" y="6" width="80" height="48" rx="3" />
    <path {...line} d="M16 18h44M16 30h30M16 42h36" />
    <path {...accent} d="M66 38l5 5 10-11" />
  </svg>
);

/** A word heard, then picked out among others. */
const WordsArt = ({ className }: { className: string }) => (
  <svg viewBox="0 0 120 64" className={className} aria-hidden="true">
    <path {...line} d="M12 26h8l10-8v28l-10-8h-8z" />
    <path {...line} d="M36 24a8 8 0 0 1 0 16M42 18a16 16 0 0 1 0 28" />
    <rect {...line} x="60" y="14" width="50" height="14" rx="3" />
    <rect {...line} x="60" y="36" width="36" height="14" rx="3" />
    <path {...accent} d="M66 43h24" />
  </svg>
);

/** A comic page with the tapped panel ringed. */
const ComicArt = ({ className }: { className: string }) => (
  <svg viewBox="0 0 120 64" className={className} aria-hidden="true">
    <rect {...line} x="8" y="6" width="104" height="52" rx="3" />
    <path {...line} d="M8 30h104M52 6v24M70 30v28M30 46h18" />
    <circle {...accent} cx="91" cy="44" r="9" strokeWidth={2} />
  </svg>
);

const ART: Record<PracticeKind, React.FC<{ className: string }>> = {
  quiz: QuizArt,
  words: WordsArt,
  comic: ComicArt,
};

// Desktop game grid: one column per game up to four (more wrap at three).
// Spelled out so Tailwind sees every class.
const GAME_COLUMNS: Record<number, string> = {
  0: "",
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
};

/**
 * What to do with a part once it has been heard — the quiz that opens the next
 * part, and whichever practice games this part has. Opens by itself when the
 * part plays to the end, and again from the player's «Практика» button.
 *
 * The dark panel and its drawings are the method scenes' (login, onboarding):
 * the same picture language, so practice reads as part of the method rather
 * than a menu. Dialog rules from the design manifest §8: flat 70% backdrop,
 * no blur, dialog-backdrop-in / dialog-panel-in.
 */
export const PracticeModal: React.FC<PracticeModalProps> = ({ part, nextPart, options, onPick, onClose }) => {
  const { t } = useTranslation();
  const titleId = useId();
  const firstRef = useRef<HTMLButtonElement>(null);

  // Focus moves in once, on open — not on every render of the player behind.
  useEffect(() => {
    firstRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const meta = (o: PracticeOption) => {
    if (o.kind === "words") return t("practice.words", { count: o.count });
    if (o.kind === "comic") return t("practice.lines", { count: o.count });
    const unlock = !nextPart
      ? t("practice.lastPart")
      : o.done
        ? t("practice.partOpen", { n: nextPart })
        : t("practice.opensPart", { n: nextPart });
    return `${t("practice.questions", { count: o.count })} · ${unlock}`;
  };

  // The quiz is the step that opens the next part, so on desktop it keeps a
  // row of its own; everything else is a game. A part without a quiz but with
  // a single game shows that game in the same wide row.
  const hero = options[0]?.kind === "quiz" ? options[0] : null;
  const games = hero ? options.slice(1) : options;
  const gameColumns = games.length > 4 ? "md:grid-cols-3" : GAME_COLUMNS[games.length];

  // `i` is the tile's place in `options` — the phone layout keys off it.
  const renderTile = (o: PracticeOption, i: number) => {
    const Art = ART[o.kind];
    // Phone: the first (the quiz, when there is one) gets the full width; a
    // lone second tile does too, so no tile ever sits beside a hole.
    const wide = i === 0 || options.length === 2;
    // Desktop: the quiz, or a lone game, is a wide row; other games are cards.
    const row = o === hero || (!hero && games.length === 1);
    const desk = row
      ? "md:col-span-1 md:flex-row md:items-center md:gap-6 md:p-5"
      : "md:col-span-1 md:flex-col md:items-stretch md:gap-1.5 md:p-4";
    const art = row
      ? `${wide ? "h-[60px] w-[92px] shrink-0" : "h-16 w-full"} md:h-[108px] md:w-[168px] md:shrink-0`
      : `${wide ? "h-[60px] w-[92px] shrink-0" : "h-16 w-full"} md:mb-1 md:h-24 md:w-full`;
    const metaClass = wide
      ? `text-[12.5px] leading-snug text-panel-dim ${row ? "md:text-sm" : "md:font-mono md:text-[10px] md:uppercase md:leading-normal md:tracking-[0.16em]"}`
      : `font-mono text-[10px] uppercase tracking-[0.16em] text-panel-dim ${row ? "md:font-sans md:text-sm md:normal-case md:tracking-normal" : ""}`;

    return (
      <button
        key={o.kind}
        ref={i === 0 ? firstRef : undefined}
        type="button"
        onClick={() => onPick(o.kind)}
        className={`relative flex rounded-tile border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal ${
          o.done
            ? "border-green-500 bg-green-500/10 hover:border-green-400"
            : "border-panel-line bg-white/[0.04] hover:border-panel-dim"
        } ${wide ? "col-span-2 flex-row items-center gap-3" : "flex-col gap-2"} ${desk}`}
      >
        {o.done && (
          // Green is the app's one success hue (manifest §2); the tick
          // says it again for anyone who does not read colour.
          <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-green-500 text-white md:right-2.5 md:top-2.5">
            <IoCheckmark size={13} aria-hidden="true" />
            <span className="sr-only">{t("practice.done")}</span>
          </span>
        )}
        <Art className={art} />
        <span className={`flex min-w-0 flex-col gap-0.5 ${o.done ? "pr-5" : ""} ${row ? "md:gap-1" : ""}`}>
          {o.kind === "quiz" && !o.done && (
            // The step that counts — the signal dot is what the
            // manifest keeps it for: "you are here", "this next".
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-panel-dim">
              <span className="h-1.5 w-1.5 rounded-full bg-signal" aria-hidden="true" />
              {t("practice.next")}
            </span>
          )}
          <span className={`text-[15px] font-bold leading-snug ${row ? "md:text-[21px]" : "md:text-base"}`}>
            {t(`practice.${o.kind}Title`)}
          </span>
          <span className={metaClass}>{meta(o)}</span>
        </span>
      </button>
    );
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 dialog-backdrop-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex w-full max-w-sm flex-col gap-3 rounded-card bg-ink p-4 text-panel-text shadow-xl dialog-panel-in sm:p-5 md:max-w-[880px] md:gap-4 md:px-9 md:pb-4 md:pt-8"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t("practice.close")}
          className="absolute right-1.5 top-1.5 grid h-11 w-11 place-items-center text-panel-dim transition-colors hover:text-panel-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
        >
          <IoClose size={20} />
        </button>

        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-panel-dim">
          {t("practice.eyebrow", { n: part })}
        </p>
        <h2 id={titleId} className="-mt-1 pr-10 text-[22px] font-extrabold leading-tight tracking-tight md:-mt-2 md:text-[28px]">
          {t("practice.title")}
        </h2>

        {/* Phone: one 2-column grid, the quiz (and a lone pair) full width.
            Desktop (md+): the quiz as its own wide row, then the games in a
            grid of their own with one column per game, up to four — so a new
            game adds a tile and nothing else moves. The games' wrapper is
            `contents` on the phone, which keeps its tiles in the phone grid. */}
        <div className="grid grid-cols-2 gap-2 md:flex md:flex-col md:gap-3">
          {hero && renderTile(hero, 0)}
          {games.length > 0 && hero && (
            <p className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-panel-dim md:mt-1 md:block">
              {t("practice.gamesLabel")}
            </p>
          )}
          <div className={`contents md:grid md:gap-3 ${gameColumns}`}>
            {games.map((o, i) => renderTile(o, hero ? i + 1 : i))}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="min-h-11 self-center px-4 text-sm font-semibold text-panel-dim transition-colors hover:text-panel-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
        >
          {t("practice.later")}
        </button>
      </div>
    </div>,
    document.body,
  );
};

PracticeModal.displayName = "PracticeModal";
export default PracticeModal;
