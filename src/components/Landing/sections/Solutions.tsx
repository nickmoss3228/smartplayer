import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { IoVolumeHigh } from 'react-icons/io5';
import autumnEn from '../../../assets/landing/autumn-en.wav';
import desktopPlayer from '../../../assets/landing/d3-player.webp';
import desktopRepeat from '../../../assets/landing/d5-repeat.webp';
import phoneReplay from '../../../assets/landing/m5-replay.webp';
import phonePlayer from '../../../assets/landing/m3-player.webp';
import wordsWindow from '../../../assets/landing/m4-words.webp';
import type { AudioOwner, EndReason } from '../landingAudio';
import { useLandingData } from '../leoPart1';
import { Reveal } from '../Reveal';
import { AppWindow, Screens } from './Screens';

/**
 * «Как малако это решает»: the player's answer to each difficulty above (docs/
 * landing-guide/c.html, the solutions section): the player itself, then
 * «Повтори за мной» for speaking, then a subtitles button that refuses, then
 * the word window and the word «осень», spoken. The player and the mic mode
 * are screenshots, on a computer and a phone; the word list is its window.
 */

function Mark({ at, children }: { at: 'k1' | 'k2' | 'k3'; children: ReactNode }) {
  return (
    <span className={`mk ${at}`}>
      <i />
      <span>{children}</span>
    </span>
  );
}

/** The subtitles button the player does not have: it shakes and says so. */
function CaptionsButton() {
  const { t } = useTranslation();
  const button = useRef<HTMLButtonElement>(null);
  const [refused, setRefused] = useState(false);

  const press = () => {
    // The shake plays again on every press. Remounting the button to restart it
    // would drop its keyboard focus, so the class is taken off and put back.
    const el = button.current;
    if (el) {
      el.classList.remove('no');
      void el.offsetWidth;
      el.classList.add('no');
    }
    setRefused(true);
  };

  return (
    <>
      <button ref={button} type="button" className="cc" onClick={press}>
        <span className="ccb">CC</span>
        <span>{t('landing.solve.s2.cc')}</span>
      </button>
      <p className="cc-msg" aria-live="polite">
        {refused ? t('homepage.badge') : ''}
      </p>
    </>
  );
}

/** A clip on a bare Audio element, for when the page's own audio has not loaded yet. Same contract as LandingAudio.playClip. */
function playBare(src: string, done: (why: EndReason) => void): () => void {
  const clip = new Audio(src);
  clip.onended = () => done(undefined);
  void (async () => {
    try {
      await clip.play();
    } catch {
      done('blocked');
    }
  })();
  return () => {
    clip.onended = null;
    clip.pause();
  };
}

/** «осень», spoken: the word as it sounds, not as it is spelled. */
function AutumnChip() {
  const { t } = useTranslation();
  const { audio } = useLandingData();
  const [playing, setPlaying] = useState(false);
  /** The press that is sounding now, if any. */
  const active = useRef<AudioOwner | null>(null);

  // Leaving the page mid-word must not leave it sounding.
  useEffect(() => {
    const current = active;
    return () => current.current?.stop();
  }, []);

  const say = () => {
    active.current?.stop(); // pressed again while it sounds: start over
    let cancel = () => {};
    const finish = () => {
      if (active.current !== owner) return; // an earlier press, ending late
      active.current = null;
      audio?.release(owner);
      setPlaying(false);
    };
    const owner: AudioOwner = {
      stop() {
        cancel();
        finish();
      },
    };
    active.current = owner;
    setPlaying(true);
    if (audio) {
      audio.claim(owner);
      cancel = audio.playClip(autumnEn, finish);
    } else {
      cancel = playBare(autumnEn, finish);
    }
  };

  return (
    <button type="button" className={`autumn-chip${playing ? ' playing' : ''}`} onClick={say}>
      <span className="spk">
        <IoVolumeHigh aria-hidden="true" />
      </span>
      <span>{t('landing.spelling.chip')}</span>
    </button>
  );
}

export function Solutions() {
  const { t } = useTranslation();
  const marks = t('landing.solve.s2.marks', { returnObjects: true }) as string[];

  return (
    <section className="reg" id="solve">
      <div className="wrap">
        <Reveal className="sec-head">
          <p className="eyebrow">{t('landing.solve.eyebrow')}</p>
          <h2 className="h2">{t('landing.solve.title')}</h2>
          <p className="body">{t('landing.solve.text')}</p>
        </Reveal>

        <article className="sol">
          <Reveal className="sol-text">
            <h3>{t('landing.solve.s1.title')}</h3>
            <p>{t('landing.solve.s1.text')}</p>
          </Reveal>
          <Reveal delay={120}>
            <Screens desktop={desktopPlayer} mobile={phonePlayer} label={t('landing.solve.s1.shot')} />
          </Reveal>
        </article>

        {/* Speaking: «Повтори за мной» in the player, and «Послушай себя» after the part. */}
        <article className="sol flip">
          <Reveal className="sol-text">
            <h3>{t('landing.solve.mic.title')}</h3>
            <p>{t('landing.solve.mic.text')}</p>
          </Reveal>
          <Reveal delay={120}>
            <Screens desktop={desktopRepeat} mobile={phoneReplay} label={t('landing.solve.mic.shot')} />
          </Reveal>
        </article>

        <article className="sol">
          <Reveal className="sol-text">
            <h3>{t('landing.solve.s2.title')}</h3>
            <p>{t('landing.solve.s2.text')}</p>
            <CaptionsButton />
          </Reveal>
          <Reveal delay={120} className="marked">
            <img className="screens-solo" src={phonePlayer} alt="" loading="lazy" width={780} height={1688} />
            <Mark at="k1">{marks[0]}</Mark>
            <Mark at="k2">{marks[2]}</Mark>
            <Mark at="k3">{marks[1]}</Mark>
          </Reveal>
        </article>

        <article className="sol flip">
          <Reveal className="sol-text">
            <h3>{t('landing.solve.s3.title')}</h3>
            <p>{t('landing.solve.s3.text')}</p>
            <p className="micro">{t('landing.solve.s3.try')}</p>
            <AutumnChip />
            <p>{t('landing.solve.s3.game')}</p>
          </Reveal>
          <Reveal delay={120}>
            <AppWindow desktop={wordsWindow} mobile={wordsWindow} label={t('landing.solve.s3.shot')} />
          </Reveal>
        </article>
      </div>
    </section>
  );
}
