import React, { useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { IoCheckmark, IoVolumeHigh } from "react-icons/io5";
import { useWordClip } from "./useWordClip";

interface RailWord {
  word: string;
  audioKey?: string;
  /** Resolved by modules/story/resolveStory.ts; empty means no clip exists. */
  audioUrl?: string;
}

type PlayFn = (audioKey: string, audioUrl: string) => HTMLAudioElement | null;

interface WordRowProps extends RailWord {
  onPlay: PlayFn;
  volume: number;
  isLearned: boolean;
}

/** One word of the rail: tap to hear it, a tick once it has been learned. */
const WordRow: React.FC<WordRowProps> = React.memo(({ word, audioKey, audioUrl, onPlay, volume, isLearned }) => {
  const { t } = useTranslation();
  const { isPlaying, toggle } = useWordClip({ word, audioKey, audioUrl, onPlay, volume });

  return (
    <button
      type="button"
      onClick={toggle}
      className={`flex min-h-10 w-full shrink-0 cursor-pointer items-center gap-3 rounded-tile px-2.5 py-1.5 text-left text-sm font-semibold text-white transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white ${
        isPlaying ? "bg-white/20 ring-1 ring-inset ring-white/60" : "hover:bg-white/10"
      }`}
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/15" aria-hidden="true">
        <IoVolumeHigh size={14} />
      </span>
      <span className="min-w-0 flex-1 leading-snug">{word}</span>
      {isLearned && (
        // White, not the app's success green: on the easy level's green
        // gradient a green tick all but disappears.
        <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-white text-ink">
          <IoCheckmark size={12} aria-hidden="true" />
          <span className="sr-only">{t("player.wordKnown")}</span>
        </span>
      )}
    </button>
  );
});
WordRow.displayName = "WordRow";

interface WordRailProps {
  vocabulary: RailWord[];
  phrasalVerbs: RailWord[];
  onPlay: PlayFn;
  volume: number;
  /** Keys (lowercased audioKey ?? word) the student has already answered correctly */
  learnedWords?: Set<string>;
  /** Pinned under the list — the practice card. */
  footer?: React.ReactNode;
}

type TabId = "vocab" | "phrasal";

const keyOf = (w: RailWord) => (w.audioKey ?? w.word).toLowerCase();

/**
 * The desktop player's right-hand column: how many of the part's words are
 * known, the words and the phrasal verbs as two tabs of rows, and the practice
 * card at the foot. The list scrolls inside the rail, so a part with many words
 * never pushes anything off the screen. Phones keep VocabularyRow's chips.
 */
export const WordRail: React.FC<WordRailProps> = ({
  vocabulary,
  phrasalVerbs,
  onPlay,
  volume,
  learnedWords,
  footer,
}) => {
  const { t } = useTranslation();
  const baseId = useId();
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({ vocab: null, phrasal: null });

  const tabs = (
    [
      { id: "vocab", label: t("player.vocabulary"), words: vocabulary },
      { id: "phrasal", label: t("player.phrasal-verbs"), words: phrasalVerbs },
    ] as const
  ).filter((tab) => tab.words.length > 0);

  const [activeId, setActiveId] = useState<TabId>(tabs[0]?.id ?? "vocab");
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  const total = vocabulary.length + phrasalVerbs.length;
  const known = [...vocabulary, ...phrasalVerbs].filter((w) => learnedWords?.has(keyOf(w))).length;

  const onTabKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = tabs.findIndex((tab) => tab.id === active?.id);
    const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    if (!next) return;
    setActiveId(next.id);
    tabRefs.current[next.id]?.focus();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3.5" data-tour="tour-vocabulary">
      {total > 0 && active && (
        <>
          <div className="flex shrink-0 flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-base font-bold text-white">{t("player.wordsTitle")}</h2>
              <span className="font-mono text-[11px] tabular-nums text-white/85">
                {t("player.wordsKnown", { known, total })}
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-black/15" aria-hidden="true">
              <div className="h-full rounded-full bg-white" style={{ width: `${(known / total) * 100}%` }} />
            </div>
          </div>

          <div role="tablist" className="flex shrink-0 gap-1 border-b border-white/25" onKeyDown={onTabKey}>
            {tabs.map((tab) => {
              const selected = tab.id === active.id;
              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    tabRefs.current[tab.id] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`${baseId}-tab-${tab.id}`}
                  aria-selected={selected}
                  aria-controls={`${baseId}-panel`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveId(tab.id)}
                  className={`-mb-px cursor-pointer border-b-2 px-2.5 pb-2 pt-1.5 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-white ${
                    selected ? "border-white text-white" : "border-transparent text-white/70 hover:text-white"
                  }`}
                >
                  {tab.label}
                  <span className="ml-1.5 font-mono text-[11px] opacity-75">{tab.words.length}</span>
                </button>
              );
            })}
          </div>

          <div
            role="tabpanel"
            id={`${baseId}-panel`}
            aria-labelledby={`${baseId}-tab-${active.id}`}
            // The bottom fade says "there is more"; pb-6 lets the last row
            // scroll clear of it.
            className="-mx-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1 pb-6 [mask-image:linear-gradient(to_bottom,black_calc(100%_-_1.5rem),transparent)] [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.35)_transparent]"
          >
            {active.words.map(({ word, audioKey, audioUrl }) => (
              <WordRow
                key={word}
                word={word}
                audioKey={audioKey}
                audioUrl={audioUrl}
                onPlay={onPlay}
                volume={volume}
                isLearned={Boolean(learnedWords?.has(keyOf({ word, audioKey })))}
              />
            ))}
          </div>
        </>
      )}

      {footer && <div className={`shrink-0 ${total > 0 ? "" : "mt-auto"}`}>{footer}</div>}
    </div>
  );
};

WordRail.displayName = "WordRail";
export default WordRail;
