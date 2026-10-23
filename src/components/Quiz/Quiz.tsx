import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { IoCheckmark, IoClose, IoLockClosedOutline, IoPlay, IoRefresh, IoTimerOutline, IoVolumeHigh } from "react-icons/io5";
import { QuizProps } from "../../types/Quiz";
import { useQuestionAudio } from "./useQuestionAudio";
import QuizConfetti from "./QuizConfetti";
import { playFanfare } from "../../utils/soundEffects";
import { useAuth } from "../../context/AuthContext";
import { CURRENCIES, QUIZ_PASS_BITAWARD } from "../../config/currencies";
import { checkQuizAnswer } from "../../services/quizServices";

const BitAwardIcon = CURRENCIES[0].icon;

/** How long a right answer stays on screen before the next question. A miss waits for «Дальше». */
const NEXT_AFTER_RIGHT_MS = 1100;
const PASS_SHARE = 0.7;
const RING_R = 54;
const RING_C = 2 * Math.PI * RING_R;

interface Answer {
  picked: number;
  correct: boolean;
  /** The right option, when the server sent it. */
  correctOption?: number;
}

// Inside the ink panel (the Practice window's material): text, secondary text, dividers.
const micro = "font-mono text-[10px] uppercase tracking-[0.16em] text-panel-dim";
const chip =
  "inline-flex min-h-10 items-center gap-1.5 rounded-[3px] border border-panel-line px-3 text-[13px] font-semibold text-panel-text transition-colors hover:border-panel-dim focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal";
const primaryOnInk =
  "min-h-12 rounded-[3px] bg-white px-5 text-[15px] font-semibold text-ink transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal";
const secondaryOnInk =
  "min-h-12 rounded-[3px] border border-panel-line px-5 text-[15px] font-semibold text-panel-text transition-colors hover:border-panel-dim focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal";

/**
 * The part's quiz, in the Practice window's ink panel.
 *
 * Each question is a recording: the big button plays it and its ring fills
 * with the playhead; the answers unlock once it has been heard to the end.
 * After an answer the question appears in writing — heard first, read second
 * — and a miss marks the right option. A right answer moves on by itself; a
 * miss waits for «Дальше», so the correction can be read.
 *
 * The result says what the round means (the next part is open, or how many
 * answers it takes) and leads there, with every question listed to hear again.
 * Scoring stays on the server: checkQuizAnswer for each answer, and the
 * authoritative re-grade in onQuizComplete.
 */
const Quiz: React.FC<QuizProps> = ({
  questions,
  difficulty,
  storyId,
  partNumber,
  nextPart = null,
  onQuizComplete,
  onAnswerResult,
  onClose,
  onNextPart,
  isSubmitting = false,
  autoPlay = true,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [index, setIndex] = useState(0);
  /** Rounds started over with «Ещё раз»; a restart is a tap, so its first question may play by itself. */
  const [round, setRound] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [current, setCurrent] = useState<Answer | null>(null);
  const [checking, setChecking] = useState(false);
  const [finished, setFinished] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  const question = questions[index];
  const total = questions.length;
  const passMark = Math.ceil(total * PASS_SHARE);
  const score = answers.filter((a) => a.correct).length;
  const passed = score >= passMark;
  const streak = (() => {
    let n = 0;
    for (const a of [...answers, ...(current ? [current] : [])].reverse()) {
      if (!a.correct) break;
      n++;
    }
    return n;
  })();

  const audio = useQuestionAudio({ fastSrc: question?.audio?.fast, slowSrc: question?.audio?.slow });
  const hasAudio = Boolean(question?.audio?.fast);
  const locked = hasAudio && !audio.heard && !current;

  // Each question plays by itself as it appears. The quiz is opened by a tap,
  // so the browser allows it; where it does not, the button waits for one.
  // With autoPlay off — a quiz that is simply on the page, like the landing's —
  // the first question waits for its button; every later one still follows.
  const playRef = useRef(audio.play);
  useLayoutEffect(() => {
    playRef.current = audio.play;
  });
  useEffect(() => {
    if (!finished && (autoPlay || index > 0 || round > 0)) playRef.current("fast");
  }, [index, finished, round, autoPlay]);

  // The ring follows the playhead without re-rendering the quiz every frame.
  const ringRef = useRef<SVGCircleElement>(null);
  const { playing: audioPlaying, heard: audioHeard, progress: audioProgress } = audio;
  useEffect(() => {
    const ring = ringRef.current;
    if (!ring) return;
    if (!audioPlaying) {
      ring.style.strokeDashoffset = String(audioHeard || current ? 0 : RING_C);
      return;
    }
    let frame = 0;
    const tick = () => {
      ring.style.strokeDashoffset = String(RING_C * (1 - audioProgress()));
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [audioPlaying, audioHeard, audioProgress, current]);

  const advance = useCallback(() => {
    if (!current) return;
    const all = [...answers, current];
    setAnswers(all);
    setCurrent(null);
    if (index + 1 < total) {
      setIndex(index + 1);
      return;
    }
    setFinished(true);
    onQuizComplete?.({
      correctAnswers: all.filter((a) => a.correct).length,
      totalQuestions: total,
      answers: all.map((a) => a.picked),
    });
  }, [current, answers, index, total, onQuizComplete]);

  // A right answer moves on by itself.
  const advanceRef = useRef(advance);
  useLayoutEffect(() => {
    advanceRef.current = advance;
  });
  useEffect(() => {
    if (!current?.correct) return;
    const timer = window.setTimeout(() => advanceRef.current(), NEXT_AFTER_RIGHT_MS);
    return () => window.clearTimeout(timer);
  }, [current]);

  // Confetti and the fanfare, once, as a passing result appears.
  useEffect(() => {
    if (!finished || !passed) return;
    setCelebrate(true);
    playFanfare();
  }, [finished, passed]);

  const pick = async (option: number) => {
    if (locked || current || checking || isSubmitting) return;
    audio.stop();
    setChecking(true);
    let result: Answer = { picked: option, correct: false };
    try {
      const check = await checkQuizAnswer(difficulty, storyId, partNumber, index, option);
      result = { picked: option, correct: check.correct, correctOption: check.correctOption };
    } catch (error) {
      console.error("Failed to check quiz answer:", error);
    }
    setChecking(false);
    setCurrent(result);
    onAnswerResult?.(result.correct, index);
  };

  const restart = () => {
    setAnswers([]);
    setCurrent(null);
    setIndex(0);
    setFinished(false);
    setCelebrate(false);
    setRound((n) => n + 1);
  };

  // Hearing a question again from the result list.
  const reviewAudio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => reviewAudio.current?.pause(), []);
  const replayQuestion = (i: number) => {
    const src = questions[i]?.audio?.fast;
    if (!src) return;
    reviewAudio.current?.pause();
    reviewAudio.current = new Audio(src);
    reviewAudio.current.play().catch(() => {});
  };

  const card =
    "relative flex min-h-0 w-full flex-1 flex-col overflow-y-auto rounded-card bg-ink px-4 pb-4 pt-5 text-left text-panel-text shadow-xl dialog-panel-in sm:px-6 md:mx-auto md:max-w-[620px]";

  // ── result ───────────────────────────────────────────────────────────────
  if (finished) {
    const head = passed
      ? nextPart
        ? t("quiz.end.passedNext", { n: nextPart })
        : t("quiz.end.passedLast")
      : t("quiz.end.failTitle", { pass: passMark, total });
    const sub = passed
      ? t("quiz.end.passMark", { pass: passMark, total })
      : nextPart
        ? t("quiz.end.failSubNext", { n: nextPart, pass: passMark, total })
        : t("quiz.end.failSubLast", { pass: passMark, total });

    return (
      <div className={card}>
        <QuizConfetti active={celebrate} />
        <span className={micro}>{t("quiz.eyebrow", { n: partNumber })}</span>

        <div className="mt-6 flex justify-center gap-2.5" aria-hidden="true">
          {answers.map((a, i) => (
            <span
              key={i}
              className={`grid h-9 w-9 place-items-center rounded-full text-white quiz-pip-in ${a.correct ? "bg-green-500" : "bg-red-500"}`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {a.correct ? <IoCheckmark size={18} /> : <IoClose size={18} />}
            </span>
          ))}
        </div>

        <p className="mt-4 text-center text-[52px] font-extrabold leading-none tracking-[-0.04em] tabular-nums">
          {score}
          <span className="ml-1.5 text-xl font-bold tracking-normal text-panel-dim">{t("quiz.end.of", { total })}</span>
        </p>
        <h2 className="mt-3 text-balance text-center text-[23px] font-extrabold leading-tight tracking-[-0.02em]">{head}</h2>
        <p className="mt-1 text-balance text-center text-sm text-panel-dim">{sub}</p>

        {passed && user && (
          <span className="mt-3 inline-flex h-8 items-center gap-1.5 self-center rounded-chip bg-amber-400/15 px-2.5 text-[13px] font-bold text-amber-300">
            <BitAwardIcon size={15} />
            {t("quiz.end.reward", { amount: QUIZ_PASS_BITAWARD })}
          </span>
        )}

        <ul className="mt-5 border-t border-panel-line">
          {questions.map((q, i) => (
            <li key={i} className="flex min-h-11 items-center gap-2.5 border-b border-panel-line py-1 text-[13.5px]">
              <span className="w-4 shrink-0 font-mono text-[11px] text-panel-dim">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate">{q.question}</span>
              {q.audio?.fast && (
                <button
                  type="button"
                  onClick={() => replayQuestion(i)}
                  aria-label={t("quiz.end.replay", { n: i + 1 })}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-panel-dim transition-colors hover:text-panel-text focus-visible:outline-2 focus-visible:outline-signal"
                >
                  <IoVolumeHigh size={16} />
                </button>
              )}
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-white ${answers[i]?.correct ? "bg-green-500" : "bg-red-500"}`}
              >
                {answers[i]?.correct ? <IoCheckmark size={12} /> : <IoClose size={12} />}
                <span className="sr-only">{answers[i]?.correct ? t("quiz.end.right") : t("quiz.end.wrong")}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-auto flex flex-col gap-2 pt-5">
          {isSubmitting ? (
            <p className="flex items-center justify-center gap-3 py-3 text-sm text-panel-dim">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-panel-text border-t-transparent" />
              {t("quiz.end.saving")}
            </p>
          ) : passed ? (
            <>
              {nextPart && onNextPart ? (
                <button type="button" onClick={onNextPart} className={primaryOnInk}>
                  {t("quiz.end.listenNext", { n: nextPart })}
                </button>
              ) : (
                <button type="button" onClick={onClose} className={primaryOnInk}>
                  {t("quiz.end.backToPart")}
                </button>
              )}
              <button type="button" onClick={restart} className={secondaryOnInk}>
                {t("quiz.end.again")}
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={restart} className={primaryOnInk}>
                {t("quiz.end.again")}
              </button>
              <button type="button" onClick={onClose} className={secondaryOnInk}>
                {t("quiz.end.relisten", { n: partNumber })}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── a question ───────────────────────────────────────────────────────────
  const rightOption = current ? (current.correct ? current.picked : current.correctOption) : undefined;
  const last = index === total - 1;

  let caption: React.ReactNode;
  if (current) {
    caption = (
      <div className="flex max-w-[22rem] flex-col items-center gap-1 quiz-reveal-in">
        <span className={micro}>{t("quiz.question")}</span>
        <p className="text-balance text-center text-[16.5px] font-bold leading-snug">{question.question}</p>
      </div>
    );
  } else if (audio.playing) {
    caption = (
      <>
        <b className="text-lg font-extrabold">{t("quiz.listen.playing")}</b>
        <span className="text-[13px] text-panel-dim">{t("quiz.listen.hint")}</span>
      </>
    );
  } else if (!hasAudio || audio.heard) {
    caption = (
      <>
        {hasAudio && (
          <div className="flex gap-2">
            <button type="button" className={chip} onClick={() => audio.play("fast")}>
              <IoRefresh size={15} aria-hidden="true" />
              {t("quiz.listen.again")}
            </button>
            {audio.hasSlow && (
              <button type="button" className={chip} onClick={() => audio.play("slow")}>
                <IoTimerOutline size={15} aria-hidden="true" />
                {t("quiz.listen.slower")}
              </button>
            )}
          </div>
        )}
        <span className="text-[13px] text-panel-dim">{t("quiz.listen.pick")}</span>
      </>
    );
  } else {
    caption = (
      <>
        <b className="text-lg font-extrabold">{t("quiz.listen.title")}</b>
        <span className="flex items-center gap-1.5 text-[13px] text-panel-dim">
          <IoLockClosedOutline size={13} aria-hidden="true" />
          {t("quiz.listen.hint")}
        </span>
      </>
    );
  }

  return (
    <div className={card}>
      <div className="flex items-center justify-between">
        <span className={micro}>{t("quiz.eyebrow", { n: partNumber })}</span>
        <span className="font-mono text-[11px] tabular-nums text-panel-dim">
          {index + 1} / {total}
        </span>
      </div>
      <div className="mt-2.5 flex gap-1" aria-hidden="true">
        {questions.map((_, i) => {
          const a = i < answers.length ? answers[i] : i === index ? current : null;
          const fill = a ? (a.correct ? "bg-green-500" : "bg-red-500") : i === index ? "bg-panel-text" : "bg-panel-line";
          return <span key={i} className={`h-1 flex-1 rounded-full ${fill}`} />;
        })}
      </div>

      <div className="mb-4 mt-5 flex flex-col items-center gap-3">
        {hasAudio && (
          <button
            type="button"
            onClick={() => audio.play("fast")}
            disabled={Boolean(current)}
            aria-label={t("quiz.audio.playQuestion")}
            className="relative grid h-[116px] w-[116px] shrink-0 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal disabled:cursor-default"
          >
            <svg viewBox="0 0 116 116" className="absolute inset-0 -rotate-90" aria-hidden="true">
              <circle cx="58" cy="58" r={RING_R} fill="none" strokeWidth="4" className="stroke-panel-line" />
              <circle
                ref={ringRef}
                cx="58"
                cy="58"
                r={RING_R}
                fill="none"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={RING_C}
                strokeDashoffset={RING_C}
                className="stroke-white"
              />
            </svg>
            <span className="grid h-[94px] w-[94px] place-items-center rounded-full bg-white text-ink">
              {audio.playing ? (
                <span className="flex h-8 items-center gap-1" aria-hidden="true">
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className="quiz-eq-bar w-[5px] rounded-full bg-ink" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </span>
              ) : (
                <IoPlay size={34} aria-hidden="true" />
              )}
            </span>
          </button>
        )}
        <div className="flex min-h-[64px] flex-col items-center justify-center gap-1 text-center" aria-live="polite">
          {caption}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {question.options.map((option, i) => {
          let tone = "border-panel-line bg-white/[0.04]";
          let key: React.ReactNode = String.fromCharCode(65 + i);
          let keyTone = "border-panel-line text-panel-dim";
          if (locked) key = <IoLockClosedOutline size={13} aria-hidden="true" />;
          if (current) {
            if (i === current.picked) {
              tone = current.correct ? "border-green-500 bg-green-500/15" : "border-red-500 bg-red-500/15";
              keyTone = current.correct ? "border-green-500 bg-green-500 text-white" : "border-red-500 bg-red-500 text-white";
              key = current.correct ? <IoCheckmark size={15} /> : <IoClose size={15} />;
            } else if (i === rightOption) {
              tone = "border-dashed border-green-500 bg-transparent";
              keyTone = "border-green-500 text-green-400";
              key = <IoCheckmark size={15} />;
            } else {
              tone = "border-panel-line bg-transparent opacity-40";
            }
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => pick(i)}
              disabled={locked || Boolean(current) || checking || isSubmitting}
              className={`flex min-h-14 w-full items-center gap-3 rounded-tile border px-3.5 py-2.5 text-left text-[15px] font-medium leading-snug text-panel-text transition-colors enabled:hover:border-panel-dim disabled:cursor-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal ${tone} ${locked ? "opacity-40" : ""}`}
            >
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-bold ${keyTone}`}>{key}</span>
              <span className="flex-1">{option}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto pt-4">
        <div
          className={`flex items-center justify-between gap-3 rounded-tile bg-white/[0.06] py-3 pl-3.5 pr-3 transition-opacity ${current ? "opacity-100" : "invisible opacity-0"}`}
          aria-live="polite"
        >
          <div className="flex min-w-0 flex-col gap-0.5">
            {current?.correct ? (
              <>
                <span className="flex items-center gap-1.5 text-[15.5px] font-extrabold text-green-400">
                  <IoCheckmark size={18} aria-hidden="true" />
                  {t("quiz.right")}
                  {streak >= 2 && (
                    <span className="rounded-chip bg-green-500/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em]">
                      {t("quiz.streak", { count: streak })}
                    </span>
                  )}
                </span>
                <span className="text-[13px] text-panel-dim">{last ? t("quiz.lastQuestion") : t("quiz.nextSoon")}</span>
              </>
            ) : (
              <span className="flex items-center gap-1.5 text-[15.5px] font-extrabold text-red-300">
                <IoClose size={18} aria-hidden="true" />
                {rightOption !== undefined ? t("quiz.wrongMarked") : t("quiz.wrong")}
              </span>
            )}
          </div>
          <button type="button" onClick={advance} disabled={!current} className={`${primaryOnInk} min-h-11 shrink-0 px-4 text-sm`}>
            {last ? t("quiz.toResult") : t("quiz.next")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Quiz;
