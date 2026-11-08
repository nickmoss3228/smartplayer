import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { useTranslation } from "react-i18next";
import { IoArrowBack, IoChevronBack, IoChevronForward, IoMicOffOutline, IoMicOutline } from "react-icons/io5";
import type WaveSurfer from "wavesurfer.js";
import type { AdminStory } from "../../../services/adminStoryServices";
import { useAppDispatch, useAppSelector } from "../../../hooks/hooks";
import playerReducer, { setIsPlaying } from "../../../store/playerslice";
import { PlayerPreviewContext } from "../../../context/PlayerPreviewContext";
import WaveformPlayer from "../../Player/WaveformPlayer";
import { playerThemes } from "../../Player/playerThemes";
import { useRepeatMode } from "../../Player/hooks/useRepeatMode";
import { RepeatModeBar } from "../../Player/RepeatMode/RepeatModeBar";
import { RepeatReplay } from "../../Player/RepeatMode/RepeatReplay";
import { PracticeModal, type PracticeKind, type PracticeOption } from "../../Player/Practice/PracticeModal";
import { PanelQuiz } from "../../Player/PanelQuiz/PanelQuiz";
import { WordBoard } from "../../Player/Vocabulary/WordBoard";
import { useVocabAudio } from "../../Player/hooks/useVocabAudio";
import Quiz from "../../Quiz/Quiz";
import { questionsFromClips } from "../../../modules/comicPractice/panelQuizRounds";
import { wordKey, type WindowWord } from "../../../modules/vocab/textShape";
import { studentPreviewTrack, studentPreviewWords } from "./studentPreviewData";

interface PreviewProps {
  story: AdminStory;
  initialPart: number;
  onClose: () => void;
}

/** Mounts the production player and practice components with isolated preview state. */
export default function StudentPlayerPreview(props: PreviewProps) {
  const [store] = useState(() => configureStore({ reducer: { player: playerReducer } }));
  const [bookmarkKeys, setBookmarkKeys] = useState<string[]>([]);
  const practiceState = useMemo(() => ({ bookmarkKeys, setBookmarkKeys }), [bookmarkKeys]);
  return createPortal(
    <Provider store={store}>
      <PlayerPreviewContext.Provider value={practiceState}>
        <PreviewPlayer {...props} />
      </PlayerPreviewContext.Provider>
    </Provider>,
    document.body,
  );
}

function PreviewPlayer({ story, initialPart, onClose }: PreviewProps) {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const isPlaying = useAppSelector((state) => state.player.isPlaying);
  const [partNumber, setPartNumber] = useState(initialPart);
  const [stage, setStage] = useState<"player" | PracticeKind>("player");
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [heard, setHeard] = useState<Record<number, boolean>>({});
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [learned, setLearned] = useState(new Set<string>());
  const waveRef = useRef<WaveSurfer | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const titleId = useId();
  const descriptionId = useId();
  const parts = useMemo(() => [...story.parts].sort((a, b) => a.partNumber - b.partNumber), [story.parts]);
  const part = parts.find((item) => item.partNumber === partNumber) ?? parts[0];
  const partIndex = parts.findIndex((item) => item.partNumber === part?.partNumber);
  const track = useMemo(() => part ? studentPreviewTrack(story, part) : null, [story, part]);
  const vocabulary = useMemo(() => studentPreviewWords(part?.vocabulary ?? []), [part?.vocabulary]);
  const phrasalVerbs = useMemo(() => studentPreviewWords(part?.phrasalVerbs ?? []), [part?.phrasalVerbs]);
  const words = useMemo<WindowWord[]>(() => [
    ...vocabulary.map((word) => ({ ...word, key: wordKey(word), phrasal: false })),
    ...phrasalVerbs.map((word) => ({ ...word, key: wordKey(word), phrasal: true })),
  ], [vocabulary, phrasalVerbs]);
  const { playVocabWord, stop: stopWord } = useVocabAudio(`${story._id}:${partNumber}:${stage}`);
  const playWord = useCallback((_key: string, url: string) => playVocabWord(url), [playVocabWord]);

  const pause = useCallback(() => {
    waveRef.current?.pause();
    dispatch(setIsPlaying(false));
    stopWord();
  }, [dispatch, stopWord]);

  const repeat = useRepeatMode({
    isPlaying,
    resetKey: `${story._id}:${partNumber}:${stage}`,
    partKey: `${story._id}:${partNumber}`,
  });
  const { buildTrack, preloadOriginal } = repeat;
  const buildReplay = useCallback((kind: "me" | "dialogue") => buildTrack(kind, track?.audio ?? ""), [buildTrack, track?.audio]);
  const hasTakes = repeat.takeCount > 0;

  useEffect(() => {
    if (hasTakes && track?.audio) preloadOriginal(track.audio);
  }, [hasTakes, preloadOriginal, track?.audio]);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const appRoot = document.getElementById("root");
    const previousInert = appRoot?.inert ?? false;
    if (appRoot) appRoot.inert = true;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", escape);
    return () => {
      document.body.style.overflow = previousOverflow;
      if (appRoot) appRoot.inert = previousInert;
      document.removeEventListener("keydown", escape);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, []);

  const options = useMemo<PracticeOption[]>(() => {
    const result: PracticeOption[] = [];
    if (part?.quiz.length) result.push({ kind: "quiz", count: part.quiz.length, done: !!done[`${partNumber}:quiz`] });
    if (words.length >= 4) result.push({ kind: "words", count: words.length, done: words.every((word) => learned.has(word.key)) });
    const comicCount = part?.panelQuiz ? questionsFromClips(part.panelQuiz.clips).length : 0;
    if (comicCount > 0) result.push({ kind: "comic", count: comicCount, done: !!done[`${partNumber}:comic`] });
    if (repeat.takeCount > 0) result.push({ kind: "voice", count: repeat.takeCount, done: false });
    return result;
  }, [part, partNumber, done, words, learned, repeat.takeCount]);
  const practiceKinds = useMemo(() => options.map((option) => option.kind), [options]);
  const locale = i18n.language.startsWith("ru") ? "ru" : "en";
  const storyTitle = story.localized?.title[locale]?.trim() || story.storyName;
  const promptTitle = track?.title;
  const canRepeat = !!track?.timeMarkers.length;

  const selectPart = (index: number) => {
    if (!parts[index]) return;
    pause();
    setPracticeOpen(false);
    setStage("player");
    setPartNumber(parts[index].partNumber);
  };
  const pickPractice = (kind: PracticeKind) => {
    pause();
    setPracticeOpen(false);
    setStage(kind);
  };
  const closePractice = () => setStage("player");
  const completed = options.filter((option) => option.done).length;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}
      className={`fixed inset-0 z-50 flex h-dvh flex-col overflow-hidden bg-gradient-to-br ${playerThemes[story.difficulty].background}`} data-testid="student-player-preview">
      {/* The admin's own bar, outside the student's screen, so the way back to
          the editor is never confused with the player's controls. */}
      <div className="flex min-h-12 shrink-0 items-center justify-between gap-3 bg-ink px-3 text-white sm:px-5">
        <button ref={closeRef} type="button" onClick={onClose}
          className="inline-flex min-h-10 items-center gap-2 rounded-[3px] px-2 text-sm font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal">
          <IoArrowBack size={18} aria-hidden="true" />{t("contentStudio.backToEditor")}
        </button>
        <p id={descriptionId} className="min-w-0 truncate text-xs text-white/70">{t("contentStudio.preview")} · {storyTitle}</p>
        <span className="hidden shrink-0 font-mono text-[11px] text-white/50 sm:inline">Esc</span>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center pt-1">
        <div className="relative mx-auto flex h-full w-full max-w-[1100px] flex-col overflow-hidden rounded-[3px] bg-white/15 text-center md:h-[calc(100%-2rem)] md:w-[calc(100%-3rem)] md:gap-4 md:rounded-card md:px-8 md:pb-7 md:pt-5 lg:h-[min(760px,calc(100%-2rem))]">
          <header className="relative flex min-h-[52px] shrink-0 items-center justify-center gap-2 px-2 md:justify-start md:px-0">
            {stage !== "player" && <button type="button" onClick={closePractice} aria-label={t("player.back")}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-black/60 hover:bg-black/5"><IoArrowBack size={20} /></button>}
            <div className="min-w-0 flex-1 text-left">
              <h1 id={titleId} className="truncate text-lg font-bold text-black md:text-[22px] md:font-extrabold md:leading-tight md:tracking-tight">{promptTitle}</h1>
            </div>
            <div className="flex shrink-0 items-center">
              {canRepeat && stage === "player" && <button type="button" onClick={repeat.toggle} aria-pressed={repeat.enabled}
                aria-label={t(repeat.enabled ? "repeatMode.buttonOn" : "repeatMode.button")}
                className={`relative grid h-10 w-10 place-items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal ${repeat.enabled ? "bg-ink text-white shadow-lg repeat-head-on" : "text-black/50 hover:bg-black/5"}`}>
                {repeat.enabled && repeat.mic === "off" ? <IoMicOffOutline size={22} /> : <IoMicOutline size={22} />}
                {repeat.enabled && repeat.mic === "on" && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-signal ring-2 ring-ink" aria-hidden="true" />}
              </button>}
              <button type="button" onClick={() => selectPart(partIndex - 1)} disabled={partIndex <= 0} aria-label={t("contentStudio.previous")}
                className="grid h-10 w-8 place-items-center rounded-full text-black/60 hover:bg-black/5 disabled:opacity-30"><IoChevronBack size={18} /></button>
              <button type="button" onClick={() => selectPart(partIndex + 1)} disabled={partIndex >= parts.length - 1} aria-label={t("contentStudio.next")}
                className="grid h-10 w-8 place-items-center rounded-full text-black/60 hover:bg-black/5 disabled:opacity-30"><IoChevronForward size={18} /></button>
            </div>
          </header>

          {stage === "player" && <RepeatModeBar phase={repeat.phase} mic={repeat.mic} count={repeat.count} levelRef={repeat.levelRef} onSkip={repeat.skip} />}

          {!part || !track?.audio ? <p className="m-auto p-5 text-sm text-ink">{t("contentStudio.noAudio")}</p> : stage === "voice" && hasTakes ? (
            <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 md:px-0 md:pb-0">
              <RepeatReplay part={partNumber} count={repeat.takeCount} build={buildReplay} onClose={closePractice} />
            </div>
          ) : stage === "quiz" && part.quiz.length > 0 ? (
            <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 md:px-0 md:pb-0">
              <Quiz questions={part.quiz} difficulty={story.difficulty} storyId={story.storyId} partNumber={partNumber}
                nextPart={parts[partIndex + 1]?.partNumber ?? null} onClose={closePractice} onNextPart={() => selectPart(partIndex + 1)}
                checkAnswer={async (index, selected) => ({ correct: part.quiz[index]?.correctAnswer === selected, correctOption: part.quiz[index]?.correctAnswer })}
                onQuizComplete={(result) => setDone((before) => ({ ...before, [`${partNumber}:quiz`]: result.correctAnswers / result.totalQuestions >= 0.7 }))} />
            </div>
          ) : stage === "words" ? (
            <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 md:px-0 md:pb-0">
              <WordBoard key={partNumber} words={words} onPlay={playWord} learnedWords={learned}
                onComplete={(keys) => setLearned((before) => new Set([...before, ...keys]))} eyebrow={t("words.eyebrow", { n: partNumber })} onClose={closePractice} />
            </div>
          ) : stage === "comic" && part.panelQuiz ? (
            <div className="min-h-0 flex-1"><PanelQuiz comicUrl={part.comicUrl ?? ""} audioUrl={track.audio} quiz={part.panelQuiz} onClose={closePractice}
              onFinish={() => setDone((before) => ({ ...before, [`${partNumber}:comic`]: true }))} /></div>
          ) : (
            <div className="relative flex min-h-0 flex-1 flex-col">
              <WaveformPlayer key={`${story._id}:${partNumber}`} audioUrl={track.audio} slowCopies={track.slowCopies} trackId={track.id}
                vocabulary={vocabulary} phrasalVerbs={phrasalVerbs} textShape={null} difficulty={story.difficulty} level={String(partNumber)}
                subtitles={[]} timeMarkers={track.timeMarkers} storySlug={story.storyId} comicUrl={track.comicUrl} trackTitle={promptTitle}
                helpAudioUrls={track.helpAudio} onWavesurferMount={(wave) => { waveRef.current = wave; }}
                onAudioComplete={() => { setHeard((before) => ({ ...before, [partNumber]: true })); }}
                hasListenedFully={!!heard[partNumber] || hasTakes} practices={practiceKinds} practicesDone={completed}
                onOpenPractice={() => { pause(); setPracticeOpen(true); }} learnedWords={learned}
                repeatGate={repeat.enabled ? repeat.waitForRepeat : null} onRepeatModeExit={repeat.toggle} />
            </div>
          )}
        </div>
      </div>
      {practiceOpen && options.length > 0 && <PracticeModal part={partNumber} nextPart={parts[partIndex + 1]?.partNumber ?? null} options={options}
        onPick={pickPractice} onClose={() => setPracticeOpen(false)} />}
    </div>
  );
}
