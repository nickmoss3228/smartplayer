import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { IoBookmark, IoBookmarkOutline, IoClose, IoPlay, IoVolumeHigh } from "react-icons/io5";
import { useAuth } from "../../../context/AuthContext";
import { playChime } from "../../../utils/soundEffects";
import type { WindowWord } from "../../../modules/vocab/textShape";
import { useVocabBookmarks } from "../../../modules/vocab/vocabBookmarks";
import { JarDrawing, JarIcon } from "../../../modules/vocab/JarIcon";

interface WordBoardProps {
  /** The board: the part's words, or a set of bookmarked words. */
  words: WindowWord[];
  onPlay: (audioKey: string, audioUrl: string) => HTMLAudioElement | null;
  /** Already in the копилка before this game — they fly in too, but earn nothing new. */
  learnedWords?: Set<string>;
  /** Keys answered right in this game, once: when it ends, or when the board is left. */
  onComplete?: (keys: string[]) => void;
  /** The micro-label at the top: "Слова · часть 2", or "Закладки". */
  eyebrow: string;
  /** Leaving the game; the end screen's second way out. */
  onClose?: () => void;
  /**
   * Play the first word as the board appears (the default: the board is opened
   * by a tap). Off where the board simply sits on a page, so it waits on
   * «Нажми, чтобы начать» instead of speaking while someone scrolls; a restart
   * is a tap, so it still starts by itself.
   */
  autoStart?: boolean;
}

/** Right answers wait this long before the next word. A miss waits for «Дальше». */
const NEXT_AFTER_RIGHT_MS = 650;
const FLY_MS = 560;

const shuffle = <T,>(list: readonly T[]): T[] => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const micro = "font-mono text-[10px] uppercase tracking-[0.16em] text-panel-dim";
const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal";
const primaryOnInk = `min-h-12 rounded-[3px] bg-white px-5 text-[15px] font-semibold text-ink transition-opacity hover:opacity-90 ${focus}`;
const secondaryOnInk = `min-h-12 rounded-[3px] border border-panel-line px-5 text-[15px] font-semibold text-panel-text transition-colors hover:border-panel-dim ${focus}`;

/** A copy of the tile, flown from where it was to the jar chip, then removed. */
function flyToJar(from: DOMRect, jar: Element | null, text: string) {
  if (!jar || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const to = jar.getBoundingClientRect();
  const el = document.createElement("div");
  el.textContent = text;
  el.setAttribute("aria-hidden", "true");
  Object.assign(el.style, {
    position: "fixed",
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    display: "grid",
    placeItems: "center",
    borderRadius: "8px",
    background: "var(--color-green-500)",
    color: "#fff",
    font: "700 14px var(--font-sans)",
    zIndex: "70",
    pointerEvents: "none",
    boxShadow: "0 8px 20px rgba(0,0,0,.3)",
    transition: `transform ${FLY_MS}ms cubic-bezier(.5,0,.2,1), opacity ${FLY_MS}ms`,
  } as CSSStyleDeclaration);
  document.body.appendChild(el);
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      el.style.transform = `translate(${dx}px, ${dy}px) scale(0.18) rotate(-12deg)`;
      el.style.opacity = "0.2";
    }),
  );
  window.setTimeout(() => el.remove(), FLY_MS + 60);
}

/**
 * «Слова»: clear the board into the копилка.
 *
 * A word plays in English; the student taps its tile. Right, and the tile flies
 * into the jar and leaves the board. Wrong, and the right tile lights up, the
 * word stays on the board, and the strip offers to bookmark it. When every word
 * left has been asked once, the leftovers get another lap — the board shrinks
 * until it is empty, or until «Хватит».
 *
 * The answers unlock once the word has played to the end, the same rule as the
 * quiz. Right answers reach the копилка (and BitWord) through onComplete, which
 * runs once: when the game ends, or when the board is left mid-game, so a
 * half-played board is never lost.
 */
export const WordBoard: React.FC<WordBoardProps> = ({ words, onPlay, learnedWords, onComplete, eyebrow, onClose, autoStart = true }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const bookmarks = useVocabBookmarks();
  const byKey = useMemo(() => new Map(words.map((w) => [w.key, w])), [words]);

  const fresh = () => {
    const board = shuffle(words.map((w) => w.key));
    return { board, queue: shuffle(board), lap: 1 };
  };
  const [{ board, queue, lap }, setRound] = useState(fresh);
  const [current, setCurrent] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "right" | "wrong">("idle");
  const [picked, setPicked] = useState<string | null>(null);
  const [heard, setHeard] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [done, setDone] = useState(false);
  const [right, setRight] = useState<string[]>([]);
  const [missed, setMissed] = useState<string[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const jarRef = useRef<HTMLSpanElement>(null);
  const tileRefs = useRef(new Map<string, HTMLButtonElement>());

  // The копилка as it was when this board started. Reading the live set would
  // count this game's words as old the moment onComplete has saved them.
  const [baseline, setBaseline] = useState(() => new Set(learnedWords ?? []));
  // Until the first word plays, follow the копилка: it loads in parallel for a
  // signed-in student, and a board that mounted first would count their words as new.
  useEffect(() => {
    if (current || right.length > 0 || done) return;
    setBaseline(new Set(learnedWords ?? []));
    // Only the копилка arriving should move it; the game's own progress must not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [learnedWords]);
  const added = right.filter((k) => !baseline.has(k)).length;
  const jarTotal = baseline.size + added;

  // ── reporting, exactly once ──────────────────────────────────────────────
  const reported = useRef(false);
  const report = useRef(() => {});
  useLayoutEffect(() => {
    report.current = () => {
      if (reported.current || right.length === 0) return;
      reported.current = true;
      onComplete?.(right);
    };
  });
  useEffect(() => () => report.current(), []);

  // ── sound ────────────────────────────────────────────────────────────────
  const say = useCallback(
    (key: string) => {
      const word = byKey.get(key);
      audioRef.current?.pause();
      setHeard(false);
      const audio = word ? onPlay(word.audioKey, word.audioUrl) : null;
      if (!audio) {
        // No clip: nothing to wait for, or the word could never be answered.
        setHeard(true);
        return;
      }
      audioRef.current = audio;
      // Shown as playing only once it really plays: a blocked autoplay leaves
      // the play button showing, and one tap on it plays the word.
      setPlaying(false);
      audio.addEventListener("play", () => {
        if (audioRef.current === audio) setPlaying(true);
      });
      const finish = () => {
        if (audioRef.current !== audio) return;
        setPlaying(false);
        setHeard(true);
      };
      audio.addEventListener("ended", finish);
      audio.addEventListener("error", finish);
      audio.addEventListener("pause", () => {
        if (audioRef.current === audio && !audio.ended) setPlaying(false);
      });
    },
    [byKey, onPlay],
  );
  useEffect(() => () => audioRef.current?.pause(), []);

  // ── flow ─────────────────────────────────────────────────────────────────
  const next = useCallback(() => {
    setStatus("idle");
    setPicked(null);
    let q = queue;
    const b = board;
    let l = lap;
    if (current) q = q.filter((k) => k !== current);
    if (q.length === 0) {
      if (b.length === 0) {
        setCurrent(null);
        setDone(true);
        return;
      }
      q = shuffle(b);
      // A word just missed does not open the next lap straight away.
      if (q.length > 1 && q[0] === current) q.push(q.shift()!);
      l = lap + 1;
    }
    setRound({ board: b, queue: q, lap: l });
    setCurrent(q[0]);
    say(q[0]);
  }, [queue, board, lap, current, say]);

  const start = () => {
    if (current || done) return;
    setCurrent(queue[0]);
    say(queue[0]);
  };

  // The game opens on a tap, so the first word can play straight away (the
  // effect under restart() below starts every board, this first one included).
  const startRef = useRef(start);
  useLayoutEffect(() => {
    startRef.current = start;
  });

  const nextRef = useRef(next);
  useLayoutEffect(() => {
    nextRef.current = next;
  });
  useEffect(() => {
    if (status !== "right") return;
    const timer = window.setTimeout(() => nextRef.current(), NEXT_AFTER_RIGHT_MS);
    return () => window.clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (!done) return;
    playChime();
    report.current();
  }, [done]);

  const tap = (key: string) => {
    if (!current || status !== "idle" || !heard) return;
    audioRef.current?.pause();
    if (key === current) {
      const tile = tileRefs.current.get(key);
      if (tile) flyToJar(tile.getBoundingClientRect(), jarRef.current, byKey.get(key)?.word ?? "");
      setRound((r) => ({ ...r, board: r.board.filter((k) => k !== key) }));
      setRight((r) => (r.includes(key) ? r : [...r, key]));
      setStatus("right");
    } else {
      setPicked(key);
      setMissed((m) => (m.includes(current) ? m : [...m, current]));
      setStatus("wrong");
    }
  };

  const [restarts, setRestarts] = useState(0);
  const restart = () => {
    setRestarts((n) => n + 1);
    report.current();
    reported.current = false;
    setBaseline(new Set(learnedWords ?? []));
    setRight([]);
    setMissed([]);
    setRound(fresh());
    setCurrent(null);
    setStatus("idle");
    setPicked(null);
    setDone(false);
    setHeard(false);
  };
  // A restart clears `current`; the next render starts the new board.
  useEffect(() => {
    if (!done && !current && right.length === 0 && missed.length === 0 && (autoStart || restarts > 0)) startRef.current();
  }, [done, current, right.length, missed.length, autoStart, restarts]);

  const hear = (key: string) => {
    const word = byKey.get(key);
    if (!word) return;
    audioRef.current?.pause();
    audioRef.current = onPlay(word.audioKey, word.audioUrl);
  };

  const card =
    "relative flex min-h-0 w-full flex-1 flex-col overflow-y-auto rounded-card bg-ink px-4 pb-4 pt-5 text-left text-panel-text shadow-xl dialog-panel-in sm:px-6 md:mx-auto md:max-w-[680px]";

  const jarChip = (
    <span
      ref={jarRef}
      className="inline-flex h-[34px] items-center gap-1.5 rounded-chip bg-sky-400/15 pl-2 pr-2.5 text-sm font-extrabold text-sky-300"
      aria-label={t("wordGame.jarLabel", { added, total: jarTotal })}
    >
      <JarIcon size={19} />+{added}
      <span className="text-xs font-semibold text-panel-dim">· {jarTotal}</span>
    </span>
  );

  // ── the end ──────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className={card}>
        <div className="flex items-center justify-between">
          <span className={micro}>{eyebrow}</span>
          {jarChip}
        </div>
        <JarDrawing fresh={Math.min(added, 4)} tone="ink" className="mx-auto mt-4 h-[132px] w-[118px]" />
        <p className="mt-2 text-center text-[50px] font-extrabold leading-none tracking-[-0.04em] tabular-nums">+{added}</p>
        <h2 className="mt-2.5 text-balance text-center text-[22px] font-extrabold leading-tight tracking-[-0.02em]">
          {board.length === 0 ? t("wordGame.boardEmpty") : t("wordGame.boardLeft", { count: board.length })}
        </h2>
        <p className="mt-1 text-balance text-center text-sm text-panel-dim">
          {added > 0 ? `${t("wordGame.newInJar", { count: added })} ` : ""}
          {t("wordGame.totalInJar", { count: jarTotal })}
        </p>
        {user && added > 0 && (
          <span className="mt-3 inline-flex h-8 items-center gap-1.5 self-center rounded-chip bg-sky-400/15 px-2.5 text-[13px] font-bold text-sky-300">
            <JarIcon size={15} />
            {t("wordGame.reward", { count: added })}
          </span>
        )}

        {missed.length > 0 && (
          <>
            <span className={`${micro} mt-5`}>{t("wordGame.notFirstTry")}</span>
            <ul className="mt-1.5 border-t border-panel-line">
              {missed.map((key) => {
                const word = byKey.get(key);
                if (!word) return null;
                const marked = bookmarks.has(key);
                return (
                  <li key={key} className="flex min-h-12 items-center gap-2.5 border-b border-panel-line">
                    <button
                      type="button"
                      onClick={() => hear(key)}
                      aria-label={t("wordGame.hear", { word: word.word })}
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-ink ${focus}`}
                    >
                      <IoVolumeHigh size={15} />
                    </button>
                    <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{word.word}</span>
                    <button
                      type="button"
                      onClick={() => bookmarks.toggle(key)}
                      aria-pressed={marked}
                      aria-label={marked ? t("words.bookmarked") : t("words.bookmark")}
                      className={`grid h-11 w-11 shrink-0 place-items-center text-panel-text ${focus}`}
                    >
                      {marked ? <IoBookmark size={18} /> : <IoBookmarkOutline size={18} />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <div className="mt-auto flex flex-col gap-2 pt-5">
          <button type="button" onClick={() => navigate("/kopilka")} className={primaryOnInk}>
            {t("wordGame.openKopilka")}
          </button>
          <button type="button" onClick={restart} className={secondaryOnInk}>
            {t("wordGame.again")}
          </button>
          {onClose && (
            <button type="button" onClick={onClose} className={`min-h-11 text-sm font-semibold text-panel-dim hover:text-panel-text ${focus}`}>
              {t("wordGame.back")}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── the board ────────────────────────────────────────────────────────────
  const small = board.length <= 6;
  const basis = small ? "40%" : board.length <= 12 ? "28%" : "21%";
  const currentWord = current ? byKey.get(current) : null;

  return (
    <div className={card}>
      <div className="flex items-center justify-between">
        <span className={micro}>{eyebrow}</span>
        {jarChip}
      </div>

      <div className="mt-4 flex items-center gap-3.5">
        <button
          type="button"
          onClick={() => (current ? say(current) : start())}
          disabled={status !== "idle"}
          aria-label={current ? t("wordGame.replay") : t("wordGame.start")}
          className={`relative grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full bg-white text-ink transition-transform active:scale-95 disabled:opacity-60 ${focus}`}
        >
          {playing ? (
            <span className="flex h-7 items-center gap-1" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className="quiz-eq-bar w-[4px] rounded-full bg-ink" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </span>
          ) : (
            <IoPlay size={28} aria-hidden="true" />
          )}
        </button>
        <div className="flex min-w-0 flex-col gap-0.5" aria-live="polite">
          <b className="text-[17px] font-extrabold leading-snug">
            {!current
              ? t("wordGame.start")
              : status === "right"
                ? t("wordGame.intoJar")
                : playing
                  ? t("wordGame.listening")
                  : t("wordGame.ask")}
          </b>
          <span className="text-[13px] text-panel-dim">{current ? t("wordGame.askHint") : t("wordGame.startHint")}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.14em] text-panel-dim">
        <span>{t("wordGame.lap", { n: lap, count: board.length })}</span>
        <button
          type="button"
          onClick={() => {
            audioRef.current?.pause();
            setDone(true);
          }}
          className={`min-h-9 px-1 font-sans text-[13px] font-semibold normal-case tracking-normal text-panel-text underline decoration-panel-line underline-offset-[3px] ${focus}`}
        >
          {t("wordGame.stop")}
        </button>
      </div>

      <div className="mt-2.5 flex flex-wrap content-start gap-[7px]">
        {board.map((key) => {
          const word = byKey.get(key);
          if (!word) return null;
          let tone = "border-panel-line bg-white/[0.05]";
          if (status === "wrong") {
            if (key === picked) tone = "border-red-500 bg-red-500/20 word-shake";
            else if (key === current) tone = "border-green-500 bg-green-500/20";
            else tone = "border-panel-line bg-white/[0.05] opacity-35";
          }
          return (
            <button
              key={key}
              ref={(el) => {
                if (el) tileRefs.current.set(key, el);
                else tileRefs.current.delete(key);
              }}
              type="button"
              onClick={() => tap(key)}
              disabled={!heard || status !== "idle"}
              style={{ flex: `1 1 ${basis}` }}
              className={`grid place-items-center rounded-tile border px-2 py-2 text-center leading-tight text-panel-text transition-[opacity,border-color,background-color] enabled:hover:border-panel-dim disabled:cursor-default ${
                small ? "min-h-[76px] text-[17px] font-bold" : "min-h-[52px] text-[14.5px] font-semibold"
              } ${tone} ${focus}`}
            >
              {word.word}
            </button>
          );
        })}
      </div>

      {status === "wrong" && current && currentWord && (
        <div className="mt-auto pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-tile bg-white/[0.06] py-3 pl-3.5 pr-3" aria-live="polite">
            <div className="flex min-w-0 flex-[1_1_100%] flex-col gap-0.5">
              <span className="flex items-center gap-1.5 text-[15px] font-extrabold text-red-300">
                <IoClose size={17} aria-hidden="true" />
                {t("wordGame.wasWord", { word: currentWord.word })}
              </span>
              <span className="text-[12.5px] text-panel-dim">{t("wordGame.staysOnBoard")}</span>
            </div>
            <div className="ml-auto flex gap-1.5">
              <button
                type="button"
                onClick={() => bookmarks.toggle(current)}
                aria-pressed={bookmarks.has(current)}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-[3px] border px-3 text-[13.5px] font-semibold ${
                  bookmarks.has(current) ? "border-panel-text bg-panel-text text-ink" : "border-panel-line text-panel-text"
                } ${focus}`}
              >
                {bookmarks.has(current) ? <IoBookmark size={15} /> : <IoBookmarkOutline size={15} />}
                {bookmarks.has(current) ? t("words.bookmarked") : t("words.bookmark")}
              </button>
              <button type="button" onClick={next} className={`${primaryOnInk} min-h-11 px-4 text-sm`}>
                {t("quiz.next")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

WordBoard.displayName = "WordBoard";
export default WordBoard;
