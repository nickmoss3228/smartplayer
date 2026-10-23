import React from "react";
import { useTranslation } from "react-i18next";
import { IoChevronForward } from "react-icons/io5";

/** A thumbnail of what opens: three lines of dots with a word sitting in the middle one. */
const PageGlyph = () => (
  <svg viewBox="0 0 54 38" className="h-8 w-[46px]" aria-hidden="true">
    <g fill="currentColor" opacity="0.55">
      {[8, 19, 30].map((y, row) =>
        Array.from({ length: 12 }, (_, k) =>
          row === 1 && k > 3 && k < 9 ? null : <circle key={`${row}-${k}`} cx={4 + k * 4.2} cy={y} r={1.1} />,
        ),
      )}
    </g>
    <rect x="19" y="14.5" width="20" height="9" rx="2.5" fill="currentColor" opacity="0.8" />
  </svg>
);

/**
 * The phone player's one way into the part's words, where two sideways rows of
 * chips used to be. Says how many words the part has and how many are already
 * in the копилка; opens the word window (WordWindow) in a bottom sheet.
 */
export const WordsButton: React.FC<{ total: number; learned: number; onOpen: () => void }> = ({ total, learned, onOpen }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      className="flex min-h-16 w-full items-center gap-3.5 rounded-tile bg-white/[0.18] px-3.5 py-2.5 text-left text-ink transition-colors hover:bg-white/25 active:bg-white/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <span className="grid h-[38px] w-[54px] shrink-0 place-items-center rounded-chip bg-ink/[0.08]">
        <PageGlyph />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <b className="text-base font-bold leading-snug">{t("player.wordsTitle")}</b>
        <span className="font-mono text-[11px] tracking-[0.04em] text-ink/65">
          {t("words.entryMeta", { total, count: learned })}
        </span>
      </span>
      <IoChevronForward size={18} className="shrink-0 text-ink/55" aria-hidden="true" />
    </button>
  );
};

WordsButton.displayName = "WordsButton";
export default WordsButton;
