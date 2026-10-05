import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { IoArrowBack, IoCheckmarkCircle, IoRefresh } from "react-icons/io5";
import type { PanelQuiz as PanelQuizData } from "../../../services/storyServices";
import { useClipPlayer } from "../../../hooks/useClipPlayer";
import { fitInside } from "../../../modules/comicPractice/boxes";
import { buildRound, questionsFromClips } from "../../../modules/comicPractice/panelQuizRounds";
import { playChime } from "../../../utils/soundEffects";

interface PanelQuizProps {
  comicUrl: string;
  /** The part's own audio — every line the game plays is a stretch of it. */
  audioUrl: string;
  quiz: PanelQuizData;
  onClose: () => void;
  /** Called once per finished round, with its score. */
  onFinish?: (score: number, total: number) => void;
}

/** How long an answer stays on screen before the next line plays. */
const NEXT_AFTER_RIGHT_MS = 900;
const NEXT_AFTER_WRONG_MS = 1800;
const SLOW_RATE = 0.75;

/**
 * "Where did it happen?" — the part's comic page, and lines of its audio played
 * out of order. The student taps the panel each line belongs to.
 *
 * Practice, not a test: nothing is scored on the server and nothing unlocks.
 * The panels can only be tapped once the line has played to its end, the same
 * listen-first rule as the quiz, so it cannot be answered by guessing early.
 *
 * What is being asked about must be unmistakable: a bar under the prompt runs
 * for exactly the stretch that is the question, and lines that follow each
 * other on one panel are asked together as one moment (questionsFromClips).
 */
export const PanelQuiz: React.FC<PanelQuizProps> = ({ comicUrl, audioUrl, quiz, onClose, onFinish }) => {
  const { t } = useTranslation();
  const questions = useMemo(() => questionsFromClips(quiz.clips), [quiz.clips]);
  const [order, setOrder] = useState(() => buildRound(questions));
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [heard, setHeard] = useState(false);
  const { state, play, stop } = useClipPlayer(audioUrl);
  const nextTimer = useRef<number | undefined>(undefined);

  const finished = round >= order.length;
  const clip = finished ? null : questions[order[round]];
  const answered = picked !== null;

  // Each play gets an id, so the progress bar restarts from empty on a replay.
  const [playback, setPlayback] = useState<{ id: number; seconds: number } | null>(null);

  const playClip = useCallback(
    (rate = 1) => {
      if (!clip) return;
      play(clip.start, clip.end, rate);
      setPlayback((p) => ({ id: (p?.id ?? 0) + 1, seconds: (clip.end - clip.start) / rate }));
    },
    [clip, play],
  );

  // Each new line plays by itself. Keyed on the round, not on playClip, so a
  // re-render never restarts a line the student is in the middle of. (Layout
  // effects run before plain ones, so the ref is current when the round's
  // effect reads it.)
  //
  // Only the sound starts here. The answer state is cleared where the round
  // changes (goToRound), never here: an effect runs AFTER the browser paints,
  // so the next line would first be drawn with the last line's answer still
  // set — showing the next line's panel as correct for a frame.
  const playRef = useRef(playClip);
  useLayoutEffect(() => {
    playRef.current = playClip;
  });
  useEffect(() => {
    if (!finished) playRef.current(1);
  }, [round, order, finished]);

  /** Moves to a round with a clean slate, in the same render that shows it. */
  const goToRound = (next: number) => {
    setPicked(null);
    setHeard(false);
    setRound(next);
  };

  useEffect(() => {
    if (state === "played") setHeard(true);
  }, [state]);

  const finishRef = useRef(onFinish);
  useLayoutEffect(() => {
    finishRef.current = onFinish;
  });
  // `score` is final here: the last answer's point was added before the round
  // advanced to `finished`, and nothing changes it until a restart clears
  // `finished` again — so this fires once per round.
  useEffect(() => {
    if (finished) {
      stop();
      playChime();
      finishRef.current?.(score, order.length);
    }
  }, [finished, stop, score, order.length]);

  useEffect(() => () => window.clearTimeout(nextTimer.current), []);

  const answer = (panel: number) => {
    if (!clip || answered || !heard) return;
    stop();
    setPicked(panel);
    const right = panel === clip.panel;
    if (right) setScore((s) => s + 1);
    nextTimer.current = window.setTimeout(
      () => goToRound(round + 1),
      right ? NEXT_AFTER_RIGHT_MS : NEXT_AFTER_WRONG_MS,
    );
  };

  const restart = () => {
    window.clearTimeout(nextTimer.current);
    setOrder(buildRound(questions));
    setScore(0);
    goToRound(0);
  };

  // ── the page, fitted into whatever space is left ─────────────────────────
  const stageRef = useRef<HTMLDivElement>(null);
  const [space, setSpace] = useState({ w: 0, h: 0 });
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setSpace({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [finished]);

  const page = natural ? fitInside(space.w, space.h, natural.w / natural.h) : { w: 0, h: 0 };

  if (finished) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 h-full px-4 pb-4 animate-scale-in">
        <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center mb-2">
          <IoCheckmarkCircle className="text-green-500" size={40} />
        </div>
        <p className="text-xl font-bold text-black">{t("panelQuiz.doneTitle")}</p>
        <p className="text-black/60 text-sm mb-4">
          {t("panelQuiz.doneScore", { score, total: order.length })}
        </p>
        <div className="flex gap-3">
          <button
            onClick={restart}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[3px] bg-gray-900 text-white font-semibold hover:bg-gray-800 transition-colors"
          >
            <IoRefresh size={16} />
            {t("panelQuiz.again")}
          </button>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[3px] bg-white/90 text-black shadow-sm hover:bg-white active:scale-95 transition-all"
          >
            <IoArrowBack size={16} />
            {t("panelQuiz.back")}
          </button>
        </div>
      </div>
    );
  }

  const right = answered && clip && picked === clip.panel;
  const status =
    state === "error"
      ? t("panelQuiz.audioError")
      : answered
        ? right
          ? t("panelQuiz.right")
          : t("panelQuiz.wrong")
        : state === "playing" || state === "loading"
          ? t("panelQuiz.playing")
          : !heard
            ? t("panelQuiz.tapToListen")
            : t("panelQuiz.nowTap");

  // Phone and narrow windows: prompt and bar above the page, controls below.
  // From lg: three columns — the task on the left, the page in the middle at
  // the full height of the panel, the listening controls on the right. The
  // page is portrait, so the height the stacked layout spent on chrome is
  // exactly what made its panels small. The left column's wrapper is
  // `contents` below lg, so the phone keeps its single column untouched.
  return (
    <div className="flex flex-col h-full min-h-0 px-3 pb-3 lg:grid lg:grid-cols-[220px_minmax(0,1fr)_220px] lg:grid-rows-[minmax(0,1fr)] lg:items-center lg:gap-x-8 lg:px-0 lg:pb-0">
      <div className="contents lg:col-start-1 lg:row-start-1 lg:flex lg:flex-col lg:gap-3 lg:text-left">
        <div className="shrink-0 flex items-center justify-between gap-3 py-2 lg:flex-col lg:items-start lg:gap-2 lg:py-0">
          <p className="font-mono text-black/60 text-[10px] uppercase tracking-[0.16em] text-left lg:text-[11px] lg:leading-relaxed lg:text-black/70">
            {t("panelQuiz.prompt")}
          </p>
          <span className="shrink-0 font-mono text-[11px] text-black/60 tabular-nums">
            {round + 1} / {order.length} · {t("panelQuiz.score", { score })}
          </span>
        </div>

        {/* The question, made visible: the bar fills for exactly the stretch of
            audio being asked about, and stays full once it has been heard. It
            waits (paused) while the audio seeks, so it never runs ahead. */}
        <div className="shrink-0 h-1.5 mb-2 rounded-full bg-black/10 overflow-hidden lg:mb-0" aria-hidden="true">
          {playback && (
            <div
              key={playback.id}
              className="h-full bg-gray-900 origin-left"
              style={{
                animation: `panelQuizLine ${playback.seconds}s linear forwards`,
                animationPlayState: state === "loading" || state === "idle" ? "paused" : "running",
              }}
            />
          )}
          <style>{`@keyframes panelQuizLine { from { transform: scaleX(0) } to { transform: scaleX(1) } }`}</style>
        </div>
      </div>

      <div ref={stageRef} className="relative flex-1 min-h-0 lg:col-start-2 lg:row-start-1 lg:h-full">
        <div
          className="absolute"
          style={{
            width: page.w,
            height: page.h,
            left: (space.w - page.w) / 2,
            top: (space.h - page.h) / 2,
          }}
        >
          <img
            src={comicUrl}
            alt=""
            draggable={false}
            onLoad={(e) =>
              setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
            }
            className="block w-full h-full rounded-[3px] select-none shadow-lg"
          />
          {quiz.panels.map((p, i) => {
            const isPicked = picked === i;
            const isAnswer = answered && clip?.panel === i;
            // Inset rings rather than borders: nothing shifts when they change,
            // and a white ring over a dark one reads on light and dark art alike.
            const look = isAnswer
              ? "shadow-[inset_0_0_0_3px_rgb(74,222,128),inset_0_0_0_5px_rgba(0,0,0,0.35)] bg-green-400/20"
              : isPicked
                ? "shadow-[inset_0_0_0_3px_rgb(239,68,68),inset_0_0_0_5px_rgba(0,0,0,0.35)] bg-red-500/20"
                : heard && !answered
                  ? "shadow-[inset_0_0_0_2px_rgba(255,255,255,0.7),inset_0_0_0_3px_rgba(0,0,0,0.3)] hover:bg-white/15 cursor-pointer"
                  : "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]";
            return (
              <button
                key={i}
                type="button"
                onClick={() => answer(i)}
                disabled={!heard || answered}
                aria-label={t("panelQuiz.panel", { n: i + 1 })}
                className={`absolute rounded-[2px] transition-colors duration-150 disabled:cursor-default ${look}`}
                style={{
                  left: `${p.x * 100}%`,
                  top: `${p.y * 100}%`,
                  width: `${p.w * 100}%`,
                  height: `${p.h * 100}%`,
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="shrink-0 flex flex-col items-center gap-2 pt-3 lg:col-start-3 lg:row-start-1 lg:gap-4 lg:pt-0">
        <p
          aria-live="polite"
          className={`h-5 text-sm font-bold lg:h-auto lg:min-h-6 lg:text-center lg:text-base ${
            answered ? (right ? "text-green-700" : "text-red-600") : "text-black/60"
          }`}
        >
          {status}
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => playClip(1)}
            disabled={answered}
            aria-label={t("panelQuiz.replay")}
            className={`w-14 h-14 rounded-full bg-gray-900 hover:bg-gray-800 text-white flex items-center justify-center active:scale-95 transition-all disabled:opacity-40 ${
              state === "idle" && !heard ? "animate-pulse" : ""
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
              <path d="M9.25 3.375a.75.75 0 0 0-1.28-.53L4.72 6H2.5A1.5 1.5 0 0 0 1 7.5v5A1.5 1.5 0 0 0 2.5 14h2.22l3.25 3.155a.75.75 0 0 0 1.28-.53V3.375ZM13.36 5.43a.75.75 0 0 1 1.06.02 7.5 7.5 0 0 1 0 9.1.75.75 0 1 1-1.13-.99 6 6 0 0 0 0-7.07.75.75 0 0 1 .07-1.06ZM11.3 7.92a.75.75 0 0 1 1.04.17 4.5 4.5 0 0 1 0 3.82.75.75 0 0 1-1.22-.87 3 3 0 0 0 0-2.08.75.75 0 0 1 .18-1.04Z" />
            </svg>
          </button>
          <button
            onClick={() => playClip(SLOW_RATE)}
            disabled={answered}
            className="px-3 py-1.5 rounded-[3px] bg-white/80 text-black text-xs font-semibold hover:bg-white active:scale-95 transition-all disabled:opacity-40"
          >
            {t("panelQuiz.slower")}
          </button>
        </div>
      </div>
    </div>
  );
};

PanelQuiz.displayName = "PanelQuiz";
export default PanelQuiz;
