import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { IoVolumeHigh } from 'react-icons/io5';
import autumnEn from '../../../assets/landing/autumn-en.wav';
import autumnRu from '../../../assets/landing/autumn-ru.wav';
import type { AudioOwner } from '../landingAudio';
import { focusChapter, landingActions, setTilesStep, useLanding } from '../landingStore';
import { useLandingData } from '../leoPart1';
import { SceneSlot } from './SceneSlot';

/** The «autumn» clip this card is playing, and how to cut it short. */
interface Clip {
  cancel(): void;
}

/** A refused play() (autoplay policy) has nothing to tell the visitor: the clip stays silent. */
async function playQuietly(el: HTMLAudioElement) {
  try {
    await el.play();
  } catch {
    /* blocked */
  }
}

/**
 * Chapter 3, problem 3: AUTUMN as it is written, as the eye reads it, as it
 * sounds, and as malako shows it. The four steps follow `landingStore.tiles`
 * (the 3D scene steps through them until one is chosen by hand); choosing one
 * also says the word. Registers `landingActions.sayAutumn` for a tap on the
 * scene's tiles.
 */
export function SpellingCard() {
  const { t } = useTranslation();
  const { audio } = useLandingData();
  const step = useLanding((s) => s.tiles.step);
  const steps = t('landing.spelling.steps', { returnObjects: true }) as string[];
  const heard = useRef<Clip | null>(null);
  /** This card's claim on the page's sound: its clip stops when anything else starts. */
  const owner = useMemo<AudioOwner>(
    () => ({
      stop() {
        heard.current?.cancel();
        heard.current = null;
      },
    }),
    [],
  );

  const say = useCallback(
    (which: 'ru' | 'en') => {
      const src = which === 'ru' ? autumnRu : autumnEn;
      owner.stop();
      const clip: Clip = { cancel: () => {} };
      if (audio) {
        audio.claim(owner);
        clip.cancel = audio.playClip(src, () => {
          // Not if a newer clip has taken over: only the latest one gives the audio back.
          if (heard.current !== clip) return;
          heard.current = null;
          audio.release(owner);
        });
      } else {
        // Leo's part is still loading, and these two clips do not need it.
        const plain = new Audio(src);
        clip.cancel = () => plain.pause();
        void playQuietly(plain);
      }
      heard.current = clip;
    },
    [audio, owner],
  );

  /** A step chosen by hand: the tiles move to it, the scene stays in view, and the word is said. */
  const choose = useCallback(
    (index: number) => {
      setTilesStep(index, true);
      focusChapter(3, 6000);
      if (index === 1) say('ru');
      if (index === 2 || index === 3) say('en');
    },
    [say],
  );

  useEffect(() => {
    const sayAutumn = (which: 'ru' | 'en') => choose(which === 'ru' ? 1 : 2);
    landingActions.sayAutumn = sayAutumn;
    return () => {
      if (landingActions.sayAutumn === sayAutumn) delete landingActions.sayAutumn;
    };
  }, [choose]);

  // Leaving the page: the clip stops and the audio is handed back. Two effects so that
  // Leo's audio arriving mid-clip (which changes `audio`) does not cut the clip short.
  useEffect(() => () => owner.stop(), [owner]);
  useEffect(() => {
    if (!audio) return;
    return () => audio.release(owner);
  }, [audio, owner]);

  return (
    <section className="ch" data-ch="3">
      <div className="card">
        <SceneSlot ch={3} />
        <div className="still still-tiles">
          <div><small>{steps[0]}</small><b>AUTUMN</b></div>
          <div style={{ color: 'var(--signal-ink)' }}>
            <small>{steps[1]}</small>
            <b>{t('landing.spelling.eye')}</b>
          </div>
          <div style={{ color: 'var(--ok)' }}>
            <small>{steps[2]}</small>
            <b>{`${t('landing.spelling.ear')} ${t('landing.spelling.ipa')}`}</b>
          </div>
        </div>
        <h2>{t('landing.spelling.title')}</h2>
        <p>{t('landing.spelling.text')}</p>
        <div className="steps4">
          {steps.map((label, i) => (
            <button key={i} type="button" aria-current={step === i} onClick={() => choose(i)}>
              <b>0{i + 1}</b>
              {label}
            </button>
          ))}
        </div>
        <div className="btn-row">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => choose(1)}>
            <span className="ico"><IoVolumeHigh aria-hidden="true" /></span>
            <span>{t('landing.spelling.ru')}</span>
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => choose(2)}>
            <span className="ico"><IoVolumeHigh aria-hidden="true" /></span>
            <span>{t('landing.spelling.en')}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
