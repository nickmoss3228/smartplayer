import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { IoVolumeHigh } from 'react-icons/io5';
import type { PanelQuiz } from '../../../services/storyServices';
import type { AudioOwner, LandingAudio } from '../landingAudio';
import { landingActions, landingStore, type ComicGameState } from '../landingStore';
import { useLandingData } from '../leoPart1';
import './ComicGame.css';

type Clip = PanelQuiz['clips'][number];

/**
 * The order the lines are asked in: indexes into Leo's eight clips by start
 * time, so that the first question is an easy one (the cat at the door).
 */
const CLIP_ORDER = [1, 5, 2, 6, 3, 7, 0, 4];
/** The app's PanelQuiz plays its "Slower" button at this rate. */
const SLOW_RATE = 0.75;
/** How long an answer stays on screen before the next line plays by itself. */
const FEEDBACK_MS = 1500;

/** The round's clips, in the order they are asked. Any other number than eight is asked as it comes. */
function roundClips(clips: readonly Clip[]): Clip[] {
  const byTime = [...clips].sort((a, b) => a.start - b.start);
  return byTime.length === CLIP_ORDER.length ? CLIP_ORDER.map((k) => byTime[k]) : byTime;
}

interface Round {
  /** The latest snapshot, which is also what the store holds. */
  readonly state: ComicGameState;
  /** Play the current line, at the slow rate or not. Does nothing while an answer is showing or the round is over. */
  listen(slow: boolean): void;
  answer(panel: number): void;
  restart(): void;
  /** The speaker: play the current line, or start a finished round again. */
  play(): void;
  /** Unmount: stop the sound and the timer and give the audio back. */
  dispose(): void;
}

/**
 * One round of «Найди сцену», as the guide's createComicGame wrote it: listen
 * to a line, tap the panel it belongs to, see the answer for a moment, and the
 * next line plays by itself.
 *
 * It is a closure and not component state because everything that drives it
 * arrives from outside React: the audio's callbacks, the feedback timer, and
 * the 3D scene's taps. Each has to find the game as it is now, not as it was
 * when it was last rendered. The component only draws the snapshots published
 * through `onState` (every change but the playhead's), and `onProgress` moves
 * the bar without a render.
 */
function createRound(
  audio: LandingAudio,
  clips: readonly Clip[],
  initial: ComicGameState,
  onState: (g: ComicGameState) => void,
  onProgress: (p: number) => void,
): Round {
  let g = initial;
  let cancel: (() => void) | null = null;
  let timer = 0;
  /** Someone else took the audio while an answer was showing: the next line waits for a tap rather than cutting them off. */
  let interrupted = false;
  let disposed = false;

  /** Publish a changed copy; snapshots are never edited in place, so the store's selectors can compare them by reference. */
  const set = (patch: Partial<ComicGameState>) => {
    if (disposed) return;
    g = { ...g, ...patch, answer: clips[patch.i ?? g.i].panel };
    onState(g);
  };
  const cancelRange = () => {
    cancel?.();
    cancel = null;
  };

  /** What LandingAudio.claim calls when another demo starts: stop sounding, but keep the round. */
  const self: AudioOwner = {
    stop() {
      cancelRange();
      if (g.phase === 'playing') {
        set({ phase: g.heard ? 'asking' : 'idle' });
      } else if (g.phase === 'feedback') {
        // The answer's timer is not sound, so it runs on (the guide cleared it, which left the round stuck on the answer).
        interrupted = true;
      }
    },
  };

  const listen = (slow: boolean) => {
    if (g.phase === 'feedback' || g.phase === 'done') return;
    audio.claim(self);
    const c = clips[g.i];
    cancelRange();
    onProgress(0);
    set({ phase: 'playing' });
    cancel = audio.playRange(
      c.start,
      c.end,
      slow ? SLOW_RATE : 1,
      (time) => onProgress(Math.max(0, Math.min(1, (time - c.start) / (c.end - c.start)))),
      (why) => {
        cancel = null;
        // The browser refused to play without a tap: wait for one.
        if (why === 'blocked') {
          set({ phase: 'idle' });
          return;
        }
        onProgress(1);
        set({ heard: true, phase: 'asking' });
      },
    );
  };

  const answer = (panel: number) => {
    if (g.phase !== 'asking') return;
    interrupted = false;
    set({ chosen: panel, phase: 'feedback', score: g.score + (panel === g.answer ? 1 : 0) });
    timer = window.setTimeout(() => {
      timer = 0;
      onProgress(0);
      if (g.i + 1 >= clips.length) {
        set({ chosen: null, heard: false, phase: 'done' });
        return;
      }
      set({ chosen: null, heard: false, i: g.i + 1, phase: 'idle' });
      if (!interrupted) listen(false);
    }, FEEDBACK_MS);
  };

  const restart = () => {
    cancelRange();
    window.clearTimeout(timer);
    interrupted = false;
    onProgress(0);
    set({ i: 0, score: 0, chosen: null, heard: false, phase: 'idle' });
    listen(false);
  };

  return {
    get state() {
      return g;
    },
    listen,
    answer,
    restart,
    play: () => (g.phase === 'done' ? restart() : listen(false)),
    dispose() {
      disposed = true;
      cancelRange();
      window.clearTimeout(timer);
      audio.release(self);
    },
  };
}

interface GameProps {
  audio: LandingAudio;
  quiz: PanelQuiz;
  comicUrl: string | null;
  external: boolean;
}

function Game({ audio, quiz, comicUrl, external }: GameProps) {
  const { t } = useTranslation();
  const clips = useMemo(() => roundClips(quiz.clips), [quiz.clips]);
  const total = clips.length;
  const initial = useMemo<ComicGameState>(
    () => ({ i: 0, score: 0, phase: 'idle', chosen: null, answer: clips[0].panel, heard: false }),
    [clips],
  );
  const [game, setGame] = useState(initial);
  /** The comic's own size, once it has loaded: the panel boxes are fractions of it, so the page must have its ratio. */
  const [pageSize, setPageSize] = useState<{ w: number; h: number } | null>(null);
  const round = useRef<Round | null>(null);
  const bar = useRef<HTMLElement>(null);

  useEffect(() => {
    const setBar = (p: number) => {
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
    };
    const r = createRound(
      audio,
      clips,
      initial,
      (g) => {
        landingStore.set({ comic: g });
        setGame(g);
      },
      setBar,
    );
    round.current = r;
    setBar(0);
    setGame(initial);
    landingStore.set({ comic: initial });

    // The 3D scene draws the panels and forwards its taps here.
    const answer = (panel: number) => r.answer(panel);
    landingActions.comicAnswer = answer;
    landingActions.comicListen = r.play;

    return () => {
      r.dispose();
      round.current = null;
      if (landingActions.comicAnswer === answer) delete landingActions.comicAnswer;
      if (landingActions.comicListen === r.play) delete landingActions.comicListen;
      landingStore.set({ comic: null });
    };
  }, [audio, clips, initial]);

  const feedback = game.phase === 'feedback';
  const right = game.chosen === game.answer;
  const message =
    game.phase === 'idle'
      ? t('panelQuiz.tapToListen')
      : game.phase === 'playing'
        ? t('panelQuiz.playing')
        : game.phase === 'asking'
          ? t('panelQuiz.nowTap')
          : feedback
            ? t(right ? 'panelQuiz.right' : 'panelQuiz.wrong')
            : t('panelQuiz.doneScore', { score: game.score, total });

  return (
    <div className={game.phase === 'asking' ? 'cg asking' : 'cg'}>
      <div className="cg-top">
        <span className="micro">{t('panelQuiz.prompt')}</span>
        <span className="micro tnum">
          {`${Math.min(game.i + 1, total)} / ${total} · ${t('panelQuiz.score', { score: game.score })}`}
        </span>
      </div>
      <div className="cg-prog" aria-hidden="true">
        <i ref={bar} />
      </div>
      {!external && (
        <div
          className={feedback ? 'cg-page cg-dim' : 'cg-page'}
          style={pageSize ? { aspectRatio: `${pageSize.w} / ${pageSize.h}` } : undefined}
        >
          {comicUrl && (
            <img
              src={comicUrl}
              alt=""
              loading="lazy"
              onLoad={(e) => {
                const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
                if (w && h) setPageSize({ w, h });
              }}
            />
          )}
          {quiz.panels.map((box, i) => {
            const state = feedback && i === game.answer ? ' ok' : feedback && i === game.chosen ? ' bad' : '';
            return (
              <button
                key={i}
                type="button"
                className={`cg-panel${state}`}
                aria-label={t('panelQuiz.panel', { n: i + 1 })}
                disabled={game.phase !== 'asking'}
                onClick={() => round.current?.answer(i)}
                style={{
                  left: `${box.x * 100}%`,
                  top: `${box.y * 100}%`,
                  width: `${box.w * 100}%`,
                  height: `${box.h * 100}%`,
                }}
              />
            );
          })}
          {game.phase === 'done' && (
            <div className="cg-done">
              <b>{t('panelQuiz.doneTitle')}</b>
              <span>{t('panelQuiz.doneScore', { score: game.score, total })}</span>
              <button type="button" className="btn btn-light" onClick={() => round.current?.restart()}>
                {t('panelQuiz.again')}
              </button>
            </div>
          )}
        </div>
      )}
      <div className="cg-bottom">
        <p className={feedback ? `cg-msg ${right ? 'ok' : 'bad'}` : 'cg-msg'} aria-live="polite">
          {message}
        </p>
        <div className="cg-btns">
          <button
            type="button"
            className={game.phase === 'idle' ? 'cg-spk pulse' : 'cg-spk'}
            aria-label={t('panelQuiz.replay')}
            onClick={() => round.current?.play()}
          >
            <IoVolumeHigh aria-hidden="true" />
          </button>
          <button
            type="button"
            className="cg-slow"
            disabled={game.phase !== 'asking'}
            onClick={() => round.current?.listen(true)}
          >
            {t('panelQuiz.slower')}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * «Найди сцену» on Leo's real part 1 (the same game as the player's comic
 * practice): a line plays, the visitor taps the comic panel it belongs to.
 *
 * `external`: the page is not drawn here. The 3D scene draws it as eight
 * panels and forwards the taps through `landingActions`; what remains is the
 * prompt, the score, the progress bar and the speaker. `hint` is shown above
 * the game, and only if there is one: nothing renders while the story loads or
 * if it could not be loaded, or for a part without the game.
 */
export function ComicGame({ external = false, hint }: { external?: boolean; hint?: ReactNode }) {
  const { leo, audio } = useLandingData();
  const quiz = leo?.panelQuiz;
  if (!leo || !audio || !quiz || quiz.clips.length === 0 || quiz.panels.length === 0) return null;
  return (
    <>
      {hint}
      <Game audio={audio} quiz={quiz} comicUrl={leo.comicUrl} external={external} />
    </>
  );
}
