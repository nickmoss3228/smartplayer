import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { IoBookmark, IoBookmarkOutline, IoCheckmark, IoChevronForward, IoClose, IoRefresh } from "react-icons/io5";
import type { TextShape } from "../../../services/storyServices";
import { shapeFor, type WindowWord } from "../../../modules/vocab/textShape";
import { useVocabBookmarks } from "../../../modules/vocab/vocabBookmarks";
import { useWordLook, type WordLook } from "../../../modules/vocab/wordLook";
import { JarIcon } from "../../../modules/vocab/JarIcon";

type Filter = "all" | "new" | "marks";

interface WordWindowProps {
  words: WindowWord[];
  /** The part's transcript shape from the server; null draws an invented page. */
  shape: TextShape | null | undefined;
  /** Seeds the invented page, so it is the same every time: story and part. */
  seed: string;
  partNumber: number;
  learnedWords?: Set<string>;
  onPlay: (audioKey: string, audioUrl: string) => HTMLAudioElement | null;
  volume?: number;
  /** "sheet": the phone's bottom sheet, with a close button. "rail": the desktop column. */
  variant: "sheet" | "rail";
  onClose?: () => void;
  /** id for the title, so a dialog around the window can name itself after it. */
  titleId?: string;
  /**
   * "page" (the default): the student's ink or paper page — the phone's sheet
   * covers the player and needs one. "clear": no page at all, white on the
   * level's colour like the desktop word list beside it; no page to choose.
   */
  surface?: "page" | "clear";
}

// The two pages, and the clear surface. Everything that differs between them is here.
const LOOKS: Record<WordLook | "clear", {
  text: string;
  dim: string;
  line: string;
  pill: string;
  phrasal: string;
  on: string;
  chip: string;
  chipOn: string;
  button: string;
  buttonOn: string;
  /** The "in the копилка" tick, on a chip and on the selected chip. */
  tick: string;
  tickOn: string;
}> = {
  ink: {
    text: "text-panel-text",
    dim: "text-panel-dim",
    line: "border-panel-line",
    pill: "bg-white/10 border-transparent",
    phrasal: "bg-transparent border-dashed border-panel-text/50",
    on: "bg-panel-text text-ink border-panel-text",
    chip: "bg-white/[0.06] text-panel-text",
    chipOn: "bg-panel-text text-ink",
    button: "border-panel-line text-panel-text hover:border-panel-dim",
    buttonOn: "bg-panel-text text-ink border-panel-text",
    tick: "bg-green-500 text-white",
    tickOn: "bg-green-500 text-white",
  },
  paper: {
    text: "text-ink",
    dim: "text-dim",
    line: "border-line",
    pill: "bg-ink/[0.07] border-transparent",
    phrasal: "bg-transparent border-dashed border-ink/40",
    on: "bg-ink text-white border-ink",
    chip: "bg-room text-ink",
    chipOn: "bg-ink text-white",
    button: "border-line-strong text-ink hover:border-ink/40",
    buttonOn: "bg-ink text-white border-ink",
    tick: "bg-green-500 text-white",
    tickOn: "bg-green-500 text-white",
  },
  clear: {
    text: "text-white",
    dim: "text-white/75",
    line: "border-white/25",
    pill: "bg-white/15 border-transparent",
    phrasal: "bg-transparent border-dashed border-white/60",
    on: "bg-white text-ink border-white",
    chip: "bg-black/10 text-white hover:bg-black/15",
    chipOn: "bg-white text-ink",
    button: "border-white/35 text-white hover:border-white/70",
    buttonOn: "bg-white text-ink border-white",
    // White, like the word list's: a green tick all but disappears on the
    // easy level's green.
    tick: "bg-white text-ink",
    tickOn: "bg-ink text-white",
  },
};


/**
 * The part's words as a page of dots — what is said, without the letters —
 * with each word sitting where it is said, in Russian. Tapping a word plays it
 * in English; its spelling is never shown. The bar at the foot repeats the
 * word and bookmarks it. The student picks an ink or a paper page.
 *
 * The phone opens this in a bottom sheet from one button under the comic
 * (WordsButton); the desktop shows it in the player's right-hand column.
 */
export const WordWindow: React.FC<WordWindowProps> = ({
  words,
  shape,
  seed,
  partNumber,
  learnedWords,
  onPlay,
  volume = 1,
  variant,
  onClose,
  titleId,
  surface = "page",
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fallbackId = useId();
  const [look, setLook] = useWordLook();
  const tone = surface === "clear" ? "clear" : look;
  const L = LOOKS[tone];
  const bookmarks = useVocabBookmarks();

  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const byKey = useMemo(() => new Map(words.map((w) => [w.key, w])), [words]);
  const page = useMemo(() => shapeFor(shape, seed, words), [shape, seed, words]);
  const learned = (key: string) => Boolean(learnedWords?.has(key));
  const learnedCount = words.filter((w) => learned(w.key)).length;
  const markedCount = words.filter((w) => bookmarks.has(w.key)).length;

  useEffect(() => () => audioRef.current?.pause(), []);
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const play = (key: string) => {
    const word = byKey.get(key);
    if (!word) return;
    setSelected(key);
    const current = audioRef.current;
    if (current && !current.paused && playing === key) {
      current.pause();
      return;
    }
    current?.pause();
    const audio = onPlay(word.audioKey, word.audioUrl);
    if (!audio) return;
    audio.volume = volume;
    audioRef.current = audio;
    setPlaying(key);
    const done = () => setPlaying((p) => (p === key ? null : p));
    audio.addEventListener("ended", done);
    audio.addEventListener("pause", done);
    audio.addEventListener("error", done);
  };

  const pill = (key: string, i: number) => {
    const word = byKey.get(key);
    if (!word) return null;
    const isLearned = learned(key);
    const isMarked = bookmarks.has(key);
    const dim = (filter === "new" && isLearned) || (filter === "marks" && !isMarked);
    const on = selected === key;
    return (
      <button
        key={`${key}-${i}`}
        type="button"
        onClick={() => play(key)}
        aria-pressed={on}
        className={`mx-[0.14em] inline-flex items-center gap-1.5 whitespace-nowrap rounded-chip border px-2 py-px align-baseline text-[16px] font-semibold leading-[1.55] transition-[background-color,color,opacity] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-signal ${
          on ? L.on : `${word.phrasal ? L.phrasal : L.pill} ${L.text}`
        } ${dim ? "opacity-25" : ""}`}
      >
        {playing === key && (
          <span className="flex h-3 items-center gap-0.5" aria-hidden="true">
            {[0, 1, 2].map((b) => (
              <span key={b} className="word-eq-bar w-[2.5px] rounded-full bg-current" style={{ animationDelay: `${b * 0.12}s` }} />
            ))}
          </span>
        )}
        {word.word}
        {isLearned && (
          <span className={`grid h-[15px] w-[15px] place-items-center rounded-full ${on ? L.tickOn : L.tick}`}>
            <IoCheckmark size={10} aria-hidden="true" />
            <span className="sr-only">{t("words.stateLearned")}</span>
          </span>
        )}
        {isMarked && (
          <>
            <IoBookmark size={12} aria-hidden="true" />
            <span className="sr-only">{t("words.bookmarked")}</span>
          </>
        )}
      </button>
    );
  };

  const draw = (token: number | string, i: number) =>
    typeof token === "string" ? (
      pill(token, i)
    ) : token === 0 ? (
      <span key={i} className="word-end" aria-hidden="true" />
    ) : (
      <span key={i} className="word-dots" style={{ "--n": token } as React.CSSProperties} aria-hidden="true" />
    );

  const selectedWord = selected ? byKey.get(selected) : null;
  const filters: { id: Filter; label: string; n: number }[] = [
    { id: "all", label: t("words.filterAll"), n: words.length },
    { id: "new", label: t("words.filterNew"), n: words.length - learnedCount },
    { id: "marks", label: t("words.filterMarked"), n: markedCount },
  ];

  return (
    // text-left: the player panel this opens inside centres its text, and a
    // centred page of dots reads as ragged lines rather than paragraphs.
    <div className={`word-vars-${tone} flex min-h-0 flex-1 flex-col text-left ${L.text} ${variant === "sheet" ? "px-5" : surface === "clear" ? "" : "px-4 pt-4"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className={`font-mono text-[10px] uppercase tracking-[0.16em] ${L.dim}`}>
            {t("words.eyebrow", { n: partNumber })}
          </span>
          {/* The phone's sheet keeps its title for screen readers only: the
              button that opened it already said it, and every line of the
              short screen goes to the words. */}
          <h2
            id={titleId ?? fallbackId}
            className={variant === "sheet" ? "sr-only" : "mt-0.5 text-[22px] font-extrabold leading-tight tracking-[-0.02em]"}
          >
            {t("player.wordsTitle")}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {surface === "page" && (
          <div className={`flex gap-1 rounded-full p-1 ${look === "ink" ? "bg-white/[0.06]" : "bg-room"}`} role="group" aria-label={t("words.lookLabel")}>
            {(["ink", "paper"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLook(l)}
                aria-pressed={look === l}
                aria-label={l === "ink" ? t("words.lookInk") : t("words.lookPaper")}
                className={`h-6 w-6 rounded-full border-2 transition-[box-shadow] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal ${
                  l === "ink" ? "border-panel-dim bg-ink" : "border-line-strong bg-white"
                } ${look === l ? "shadow-[0_0_0_2px_var(--color-signal)]" : ""}`}
              />
            ))}
          </div>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label={t("words.close")}
              className={`-mr-3 grid h-11 w-11 place-items-center ${L.dim} transition-colors hover:opacity-80 focus-visible:outline-2 focus-visible:outline-signal`}
            >
              <IoClose size={20} />
            </button>
          )}
        </div>
      </div>

      {variant === "rail" && (
        <button
          type="button"
          onClick={() => navigate("/kopilka")}
          className="mt-1.5 inline-flex items-center gap-1.5 self-start text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
        >
          <JarIcon size={18} />
          {t("words.inKopilka", { count: learnedCount, total: words.length })}
          <IoChevronForward size={13} className={L.dim} aria-hidden="true" />
        </button>
      )}

      <div className="mt-3 flex gap-1.5">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-chip px-3 text-[13px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal ${
              filter === f.id ? L.chipOn : L.chip
            }`}
          >
            {f.label}
            <span className="font-mono text-[10.5px] opacity-70">{f.n}</span>
          </button>
        ))}
      </div>

      <div className="relative -mx-1 mt-2 min-h-0 flex-1 overflow-y-auto px-1 pb-6 pt-2 [mask-image:linear-gradient(to_bottom,black_calc(100%_-_1.75rem),transparent)]">
        <div className="text-[17px] leading-[2.3]">
          {page.paragraphs.map((paragraph, p) => (
            <p key={p} className="mb-2 indent-[1.4em]">
              {paragraph.map((token, i) => {
                // A sentence end is drawn together with what comes before it,
                // held on one line, so its dot never starts the next line.
                if (token === 0 && i > 0) return null;
                const item = draw(token, i);
                if (paragraph[i + 1] === 0) {
                  return (
                    <React.Fragment key={i}>
                      <span className="whitespace-nowrap">{item}{draw(0, i + 1)}</span>
                      {typeof token === "number" && " "}
                    </React.Fragment>
                  );
                }
                return typeof token === "number" ? <React.Fragment key={i}>{item}{" "}</React.Fragment> : item;
              })}
            </p>
          ))}
        </div>
        {page.missing.length > 0 && (
          <p className={`mt-2 text-[13px] leading-[2.2] ${L.dim}`}>
            {t("words.notInText")} {page.missing.map((key, i) => pill(key, 1000 + i))}
          </p>
        )}
        <div className={`mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[12.5px] ${L.dim}`}>
          <span className="inline-flex items-center gap-1.5">
            <span className={`inline-block h-3.5 w-5 rounded-[4px] border ${L.pill}`} />
            {t("words.legendWord")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className={`inline-block h-3.5 w-5 rounded-[4px] border ${L.phrasal}`} />
            {t("words.legendPhrasal")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className={`grid h-3.5 w-3.5 place-items-center rounded-full ${L.tick}`}>
              <IoCheckmark size={9} aria-hidden="true" />
            </span>
            {t("words.stateLearned")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <IoBookmark size={12} aria-hidden="true" />
            {t("words.bookmarked")}
          </span>
        </div>
      </div>

      <div className={`flex min-h-[84px] items-center justify-between gap-2.5 border-t ${L.line} pb-5 pt-3`} aria-live="polite">
        {selectedWord ? (
          <>
            <div className="flex min-w-0 flex-col">
              <span className={`font-mono text-[10px] uppercase tracking-[0.14em] ${L.dim}`}>
                {learned(selectedWord.key) ? t("words.stateLearned") : t("words.stateNew")}
                {selectedWord.phrasal ? ` · ${t("words.statePhrasal")}` : ""}
              </span>
              <b className="truncate text-lg font-extrabold">{selectedWord.word}</b>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                onClick={() => play(selectedWord.key)}
                aria-label={t("words.replay")}
                className={`grid h-11 w-11 place-items-center rounded-[3px] border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal ${L.button}`}
              >
                <IoRefresh size={17} />
              </button>
              <button
                type="button"
                onClick={() => bookmarks.toggle(selectedWord.key)}
                aria-pressed={bookmarks.has(selectedWord.key)}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-[3px] border px-3 text-[13.5px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal ${
                  bookmarks.has(selectedWord.key) ? L.buttonOn : L.button
                }`}
              >
                {bookmarks.has(selectedWord.key) ? <IoBookmark size={15} /> : <IoBookmarkOutline size={15} />}
                {bookmarks.has(selectedWord.key) ? t("words.bookmarked") : t("words.bookmark")}
              </button>
            </div>
          </>
        ) : (
          <span className={`text-sm ${L.dim}`}>{t("words.hint")}</span>
        )}
      </div>
    </div>
  );
};

WordWindow.displayName = "WordWindow";
export default WordWindow;
