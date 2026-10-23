import { useEffect, useId, useMemo, useRef, useSyncExternalStore, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { IoChevronBack, IoChevronForward, IoPause, IoPlay } from 'react-icons/io5';
import { PLAYBACK_RATES, SPEED_SEQUENCES, formatTime } from '../../Player/hooks/constants';
import type { AudioOwner, LandingAudio } from '../landingAudio';
import { useLandingData } from '../leoPart1';
import './DemoPlayer.css';

/**
 * The landing's mini player: a working copy of the app's phone player, playing
 * Leo's real part 1 (docs/landing-guide/shared/engine.js, M.mountPlayer). The
 * same drill — each phrase up to three times, 0.65, 0.8, then 1.0 — or the
 * whole part straight through at one speed.
 *
 * The playback logic lives in createEngine, outside React, as in the prototype:
 * it is a chain of callbacks (a range ends, a timer fires, the next pass
 * starts) that all read the same few values, and closures over React state
 * would each see a stale copy. The component only draws what the engine says.
 * The playhead has a channel of its own, because it moves every frame and only
 * the bar and the clock need to follow it.
 */

type Mode = 'phrases' | 'free';

/** What the player draws, apart from the playhead. */
interface PlayerState {
  mode: Mode;
  speed: number;
  repeat: number;
  /** The current phrase. */
  seg: number;
  /** Which pass of the phrase is sounding (an index into the speed ladder). */
  pass: number;
  playing: boolean;
  /** Pressed Play at least once: until then the hint asks for it. */
  started: boolean;
  /** The story's length: the real one once its metadata is in. */
  duration: number;
}

interface Engine {
  subscribe(listener: () => void): () => void;
  getSnapshot(): PlayerState;
  subscribeTime(listener: () => void): () => void;
  getTime(): number;
  /** Starts following the audio element. The undo it returns also stops the sound and lets go of the claim. */
  connect(): () => void;
  toggle(): void;
  next(): void;
  prev(): void;
  /** The R key: this phrase again from its start, playing. */
  replay(): void;
  jump(index: number): void;
  /** Jump to the phrase that `time` (seconds) falls in. */
  seekTo(time: number): void;
  setMode(mode: Mode): void;
  setSpeed(speed: number): void;
  setRepeat(repeat: number): void;
}

/** The pause between the passes of one phrase, and the longer one before the next phrase. */
const PASS_GAP_MS = 380;
const PHRASE_GAP_MS = 560;
/** The player opens on Leo's third line. */
const START_SEG = 2;
const REPEATS = [1, 2, 3];

const NO_MARKERS: number[] = [];
const IDLE: PlayerState = { mode: 'phrases', speed: 1, repeat: 3, seg: 0, pass: 0, playing: false, started: false, duration: 0 };
const getIdle = () => IDLE;
const noopSubscribe = () => () => {};
const getZero = () => 0;

/** The last phrase that has started by `time`, to within 10 ms. */
function phraseAt(markers: number[], time: number): number {
  let seg = 0;
  for (let k = 0; k < markers.length; k++) if (time >= markers[k] - 0.01) seg = k;
  return seg;
}

/** Where phrase `seg` stops: the next one's start, or the end of the story. */
const phraseEnd = (markers: number[], seg: number, duration: number) => (seg + 1 < markers.length ? markers[seg + 1] : duration);

function createEngine(audio: LandingAudio, markers: number[]): Engine {
  const N = markers.length;
  const st: PlayerState = {
    mode: 'phrases',
    speed: 1,
    repeat: 3,
    seg: Math.min(START_SEG, N - 1),
    pass: 0,
    playing: false,
    started: false,
    duration: audio.duration(),
  };
  let snap: PlayerState = { ...st };
  /** The playhead, in seconds. */
  let playhead = markers[st.seg];
  let cancel: (() => void) | null = null;
  let gap: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();
  const timeListeners = new Set<() => void>();

  /** Publish `st` (a new snapshot object, which is what tells React something changed). */
  function emit() {
    st.duration = audio.duration();
    snap = { ...st };
    listeners.forEach((l) => l());
  }
  function setT(time: number) {
    playhead = time;
    timeListeners.forEach((l) => l());
  }

  /** Stop the sound and any pause between passes. */
  function halt() {
    st.playing = false;
    clearTimeout(gap);
    cancel?.();
    cancel = null;
    emit();
  }
  // Whoever claims the audio next stops this one.
  const self: AudioOwner = { stop: halt };

  /** One pass of the current phrase; then the next pass, the next phrase, or the end. */
  function playSeg() {
    const seq = SPEED_SEQUENCES[st.repeat];
    const from = markers[st.seg];
    setT(from);
    emit();
    cancel = audio.playRange(from, phraseEnd(markers, st.seg, audio.duration()), seq[st.pass], setT, (why) => {
      cancel = null;
      if (!st.playing) return;
      if (why === 'blocked') {
        halt();
        return;
      }
      st.pass++;
      if (st.pass < seq.length) {
        emit();
        gap = setTimeout(playSeg, PASS_GAP_MS);
        return;
      }
      st.pass = 0;
      if (st.seg < N - 1) {
        st.seg++;
        emit();
        gap = setTimeout(playSeg, PHRASE_GAP_MS);
      } else {
        // The last phrase is done: back to the first, stopped.
        st.seg = 0;
        setT(markers[0]);
        halt();
      }
    });
  }

  /** From the playhead to the end of the part, at one speed; the phrase follows the playhead. */
  function playFree() {
    cancel = audio.playRange(
      playhead,
      audio.duration(),
      st.speed,
      (time) => {
        setT(time);
        const seg = phraseAt(markers, time);
        if (seg !== st.seg) {
          st.seg = seg;
          emit();
        }
      },
      (why) => {
        cancel = null;
        if (why !== 'blocked') {
          st.seg = 0;
          setT(markers[0]);
        }
        halt();
      },
    );
  }

  function start() {
    audio.claim(self);
    st.playing = true;
    st.started = true;
    if (st.mode === 'phrases') {
      st.pass = 0;
      playSeg();
    } else {
      playFree();
    }
    emit();
  }

  function jump(index: number) {
    const wasPlaying = st.playing;
    halt();
    st.seg = Math.max(0, Math.min(N - 1, index));
    st.pass = 0;
    setT(markers[st.seg]);
    emit();
    if (wasPlaying) start();
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snap,
    subscribeTime(listener) {
      timeListeners.add(listener);
      return () => {
        timeListeners.delete(listener);
      };
    },
    getTime: () => playhead,
    connect() {
      const onMeta = () => {
        if (audio.duration() !== snap.duration) emit();
      };
      audio.story.addEventListener('loadedmetadata', onMeta);
      onMeta(); // it may have arrived between the render and now
      return () => {
        audio.story.removeEventListener('loadedmetadata', onMeta);
        halt();
        audio.release(self);
      };
    },
    toggle: () => (st.playing ? halt() : start()),
    next: () => jump(st.seg + 1),
    prev: () => jump(st.seg - 1),
    replay() {
      jump(st.seg);
      if (!st.playing) start();
    },
    jump,
    seekTo: (time) => jump(phraseAt(markers, time)),
    setMode(mode) {
      if (st.mode === mode) return;
      const wasPlaying = st.playing;
      halt();
      st.mode = mode;
      st.pass = 0;
      setT(markers[st.seg]);
      emit();
      if (wasPlaying) start();
    },
    setSpeed(speed) {
      st.speed = speed;
      // Straight through only: phrase by phrase, the ladder of passes sets the rate.
      if (st.playing && st.mode === 'free') audio.story.playbackRate = speed;
      emit();
    },
    setRepeat(repeat) {
      st.repeat = repeat;
      if (st.playing) {
        halt();
        st.pass = 0;
        start();
      } else {
        emit();
      }
    },
  };
}

function useEngineTime(engine: Engine | null): number {
  const getTime = engine ? engine.getTime : getZero;
  return useSyncExternalStore(engine ? engine.subscribeTime : noopSubscribe, getTime, getTime);
}

/** The bar's filled part. Its own component so that only it re-renders as the playhead moves. */
function Fill({ engine, duration }: { engine: Engine | null; duration: number }) {
  const time = useEngineTime(engine);
  return <div className="mp-fill" style={{ width: duration > 0 ? `${Math.min(100, (time / duration) * 100)}%` : '0%' }} />;
}

function Clock({ engine }: { engine: Engine | null }) {
  const time = useEngineTime(engine);
  return <span className="tnum">{formatTime(time)}</span>;
}

/** The comic sits this far up in the frame, so the window shows Leo's first panels. */
const PAN = { '--pan': '-38%' } as CSSProperties;

export function DemoPlayer() {
  const { t } = useTranslation();
  const { leo, audio, failed } = useLandingData();
  const rootRef = useRef<HTMLDivElement>(null);
  const modeLabel = useId();
  const speedLabel = useId();
  const repeatLabel = useId();

  const markers = leo?.markers ?? NO_MARKERS;
  const N = markers.length;
  const engine = useMemo(() => (audio && markers.length > 0 ? createEngine(audio, markers) : null), [audio, markers]);
  const getSnapshot = engine ? engine.getSnapshot : getIdle;
  const state = useSyncExternalStore(engine ? engine.subscribe : noopSubscribe, getSnapshot, getSnapshot);

  useEffect(() => engine?.connect(), [engine]);

  // Desktop shortcuts, only while at least 40% of the player is on screen.
  useEffect(() => {
    const root = rootRef.current;
    if (!engine || !root || typeof IntersectionObserver === 'undefined') return;
    let visible = false;
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[entries.length - 1].isIntersecting;
      },
      { threshold: 0.4 },
    );
    io.observe(root);
    const onKeyDown = (e: KeyboardEvent) => {
      if (!visible || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = document.activeElement?.tagName ?? '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space') {
        // On a focused button or link, Space presses that.
        if (/^(BUTTON|A|SELECT|SUMMARY)$/.test(tag)) return;
        e.preventDefault();
        engine.toggle();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        engine.next();
      } else if (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') {
        e.preventDefault();
        engine.replay();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      io.disconnect();
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [engine]);

  const phrases = state.mode === 'phrases';
  const seq = SPEED_SEQUENCES[state.repeat];
  const D = state.duration;
  const at = (time: number) => (D > 0 ? `${(time / D) * 100}%` : '0%');
  const segStart = N > 0 ? markers[state.seg] : 0;
  const segEnd = N > 0 ? phraseEnd(markers, state.seg, D) : 0;
  /** The rate the sounding pass runs at. */
  const liveRate = phrases && state.playing ? seq[state.pass] : null;
  const phraseLabel = N > 0 ? t('player.phraseOf', { n: state.seg + 1, total: N }) : '';

  // Before the first press it asks for one; after, it says where the drill is.
  let hint = '';
  if (failed) {
    hint = t('panelQuiz.audioError');
  } else if (engine) {
    if (!state.started) {
      hint = t('landing.player.tapPlay');
    } else if (phrases) {
      hint = [
        phraseLabel,
        t('landing.player.passOf', { n: Math.min(state.pass + 1, seq.length), total: seq.length }),
        `${seq[Math.min(state.pass, seq.length - 1)]}×`,
      ].join(' · ');
    } else {
      hint = `${t('controls.modeFree')} · ${state.speed}×`;
    }
  }

  return (
    <div
      ref={rootRef}
      className={engine ? 'mp' : 'mp mp-off'}
      role="group"
      aria-label={t('landing.player.label')}
      aria-busy={!engine && !failed ? true : undefined}
    >
      <div className="mp-head">
        <span className="micro">{t('landing.player.story')}</span>
        <b>{t('landing.player.title')}</b>
      </div>

      <div className="mp-stage">
        {leo?.comicUrl && <img src={leo.comicUrl} alt="" loading="lazy" style={PAN} />}
        <span className="mp-nosub">
          <i />
          {t('auth.panel.subtitlesOff')}
        </span>
        <div className="mp-ladder" aria-hidden="true">
          {PLAYBACK_RATES.map((rate) => {
            const index = seq.indexOf(rate);
            const used = phrases ? index >= 0 : rate === state.speed;
            const on = used && state.playing && (phrases ? index === state.pass : true);
            const done = used && phrases && state.playing && index < state.pass;
            return (
              <span key={rate} className={[!used && 'off', on && 'on', done && 'done'].filter(Boolean).join(' ') || undefined}>
                {rate === 1 ? '1.0' : rate}×
              </span>
            );
          })}
        </div>
      </div>

      <div
        className="mp-track"
        onClick={(e) => {
          if (!engine) return;
          const rect = e.currentTarget.getBoundingClientRect();
          if (rect.width > 0) engine.seekTo(((e.clientX - rect.left) / rect.width) * D);
        }}
      >
        <div className="mp-rail" />
        <div className="mp-seg" style={N > 0 ? { left: at(segStart), width: at(segEnd - segStart) } : undefined} />
        <Fill engine={engine} duration={D} />
        {markers.map((time, i) => (
          <button
            key={i}
            type="button"
            className={`mp-dot${i < state.seg ? ' past' : i === state.seg ? ' cur' : ''}`}
            style={{ left: at(time) }}
            aria-label={t('player.phraseOf', { n: i + 1, total: N })}
            onClick={(e) => {
              e.stopPropagation();
              engine?.jump(i);
            }}
          />
        ))}
      </div>

      <div className="mp-time">
        <Clock engine={engine} />
        <span>{phraseLabel}</span>
        <span className="tnum">{formatTime(D)}</span>
      </div>

      <div className="mp-ctrl">
        <span />
        <button type="button" className="mp-round" disabled={!engine} aria-label={t('controls.prevPhrase')} onClick={() => engine?.prev()}>
          <IoChevronBack aria-hidden="true" />
        </button>
        <button
          type="button"
          className={`mp-round mp-play${state.playing ? ' on' : ''}`}
          disabled={!engine}
          aria-label={t(state.playing ? 'controls.pause' : 'controls.play')}
          onClick={() => engine?.toggle()}
        >
          {state.playing ? <IoPause aria-hidden="true" /> : <IoPlay aria-hidden="true" />}
        </button>
        <button type="button" className="mp-round" disabled={!engine} aria-label={t('controls.nextPhrase')} onClick={() => engine?.next()}>
          <IoChevronForward aria-hidden="true" />
        </button>
        <span />
      </div>

      <div className="mp-sets">
        <div className="mp-set">
          <span className="micro" id={modeLabel}>
            {t('controls.mode')}
          </span>
          <div className="mp-seg-ctl" role="radiogroup" aria-labelledby={modeLabel}>
            {(['free', 'phrases'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={state.mode === mode}
                disabled={!engine}
                onClick={() => engine?.setMode(mode)}
              >
                {t(mode === 'free' ? 'controls.modeFree' : 'controls.modePhrases')}
              </button>
            ))}
          </div>
        </div>

        <div className="mp-set">
          <span className="micro" id={speedLabel}>
            {t('controls.speed')}
          </span>
          <div className={`mp-seg-ctl${phrases ? ' locked' : ''}`} role="group" aria-labelledby={speedLabel}>
            {PLAYBACK_RATES.map((rate) => (
              <button
                key={rate}
                type="button"
                className={liveRate === rate ? 'live' : undefined}
                aria-pressed={!phrases && state.speed === rate}
                disabled={!engine || phrases}
                onClick={() => engine?.setSpeed(rate)}
              >
                {rate}
              </button>
            ))}
          </div>
        </div>

        <div className="mp-set">
          <span className="micro" id={repeatLabel}>
            {t('controls.repeat')}
          </span>
          <div className={`mp-seg-ctl${phrases ? '' : ' locked'}`} role="group" aria-labelledby={repeatLabel}>
            {REPEATS.map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={phrases && state.repeat === n}
                disabled={!engine || !phrases}
                onClick={() => engine?.setRepeat(n)}
              >
                ×{n}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="mp-hint" aria-live="polite">
        {hint}
      </p>

      <div className="mp-keys" aria-hidden="true">
        <span>
          <kbd>{t('controls.keySpace')}</kbd>
          {t('controls.keyPause')}
        </span>
        <span>
          <kbd>→</kbd>
          {t('controls.keyNext')}
        </span>
        <span>
          <kbd>R</kbd>
          {t('controls.keyReplay')}
        </span>
      </div>
    </div>
  );
}
