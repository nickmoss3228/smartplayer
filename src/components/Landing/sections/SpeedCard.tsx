import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { IoPause, IoPlay } from 'react-icons/io5';
import BrandMark from '../../Brand/BrandMark';
import { StillScene } from './StillScene';
import { SPEED_SEQUENCES } from '../../Player/hooks/constants';
import type { AudioOwner, LandingAudio } from '../landingAudio';
import { focusChapter, landingStore, useLanding, type LandingState } from '../landingStore';
import { DANCE_PHRASE, useLandingData } from '../leoPart1';
import { SceneSlot } from './SceneSlot';

/** Leo's phrase at 0.65, 0.8 and 1.0: the three passes the player makes of every line. */
const RATES = SPEED_SEQUENCES[3];
/** Silence between two passes, while the dancer holds still. */
const GAP_MS = 380;

const rateLabel = (rate: number) => `${Number.isInteger(rate) ? rate.toFixed(1) : rate}×`;

interface ListenLadder {
  /** The button: start the three passes, or stop them. */
  toggle(): void;
  /** The card is leaving: silence and release, without the scene pin a Stop leaves behind. */
  dispose(): void;
}

/**
 * «Послушать фразу так же»: the phrase from `from` to `to` at each of RATES in
 * turn, the way the player says every line. The 3D dancer follows
 * `landingStore.ladder`, written as the prototype's `audioLadder` was
 * (docs/landing-guide/c.html): `on`, `pass` and `gap` as a pass begins and
 * ends, and `start` when a pass's first frame plays.
 */
function createListenLadder(audio: LandingAudio, from: number, to: number): ListenLadder {
  let cancel: (() => void) | null = null;
  let gapTimer = 0;
  /** What `audio.claim` calls when something else starts to sound. */
  const self: AudioOwner = { stop };

  function patch(change: Partial<LandingState['ladder']>) {
    landingStore.set({ ladder: { ...landingStore.get().ladder, ...change } });
  }

  /** Silence; the ladder is off and the audio is handed back. */
  function halt() {
    window.clearTimeout(gapTimer);
    cancel?.();
    cancel = null;
    if (landingStore.get().ladder.on) patch({ on: false });
    audio.release(self);
  }

  /** `halt`, and keep this scene in the 3D band a moment longer. */
  function stop() {
    const wasOn = landingStore.get().ladder.on;
    halt();
    if (wasOn) focusChapter(1, 1200);
  }

  function next(pass: number) {
    if (pass >= RATES.length) {
      stop();
      return;
    }
    let first = true;
    cancel = audio.playRange(
      from,
      to,
      RATES[pass],
      () => {
        if (!first) return;
        first = false;
        patch({ start: performance.now(), gap: false });
      },
      (why) => {
        cancel = null;
        if (why === 'blocked') {
          stop();
          return;
        }
        patch({ pass: pass + 1, gap: true });
        gapTimer = window.setTimeout(() => next(pass + 1), GAP_MS);
      },
    );
  }

  function start() {
    // A marker list too short for the phrase must not play the whole story.
    if (!(to > from)) return;
    audio.claim(self);
    focusChapter(1, 12000);
    patch({ on: true, pass: 0, gap: true });
    next(0);
  }

  return {
    toggle() {
      if (landingStore.get().ladder.on) stop();
      else start();
    },
    dispose: halt,
  };
}

/**
 * Chapter 1, problem 1: nobody learns a dance at full speed. The ladder and the
 * four counts show where the dancer's clock is (`ladderUI`, written by the 3D
 * scene); the button plays the same three passes on Leo's real audio.
 */
export function SpeedCard() {
  const { t } = useTranslation();
  const { leo, audio } = useLandingData();
  const pass = useLanding((s) => s.ladderUI.pass);
  const beat = useLanding((s) => s.ladderUI.beat);
  const listening = useLanding((s) => s.ladder.on);
  const ladder = useRef<ListenLadder | null>(null);
  const steps = t('landing.speed.steps', { returnObjects: true }) as string[];
  const count = t('landing.speed.count', { returnObjects: true }) as string[];

  useEffect(() => {
    if (!leo || !audio) return;
    const made = createListenLadder(audio, leo.markers[DANCE_PHRASE], leo.markers[DANCE_PHRASE + 1]);
    ladder.current = made;
    return () => {
      made.dispose();
      ladder.current = null;
    };
  }, [leo, audio]);

  return (
    <section className="ch" data-ch="1">
      <div className="card">
        <SceneSlot ch={1} />
        <StillScene scene="passes" />
        <p className="eyebrow">{t('landing.speed.eyebrow')}</p>
        <h2>{t('landing.speed.title')}</h2>
        <p>{t('landing.speed.text')}</p>
        <div className="ladder">
          {RATES.map((rate, i) => (
            <div key={rate} className={pass === i ? 'on' : undefined}>
              <b>{rateLabel(rate)}</b>
              <small>{steps[i]}</small>
            </div>
          ))}
        </div>
        <div className="beats only3d">
          {count.map((word, i) => (
            <span key={i} className={beat === i ? 'on' : undefined}>{word}</span>
          ))}
        </div>
        <div className="app-note">
          <span><BrandMark variant="drop" /></span>
          <span>{t('landing.speed.app')}</span>
        </div>
        <div className="btn-row">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={!leo || !audio}
            onClick={() => ladder.current?.toggle()}
          >
            <span className="ico">{listening ? <IoPause aria-hidden="true" /> : <IoPlay aria-hidden="true" />}</span>
            <span>{listening ? t('landing.speed.stop') : t('landing.speed.listen')}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
