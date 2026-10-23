import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { IoVolumeHigh } from 'react-icons/io5';
import autumnEn from '../../../assets/landing/autumn-en.wav';
import desktopPlayer from '../../../assets/landing/d2-player.webp';
import phonePlayer from '../../../assets/landing/m2-player.webp';
import { useWordLook, wordPageClass } from '../../../modules/vocab/wordLook';
import { WordWindow } from '../../Player/Vocabulary/WordWindow';
import type { AudioOwner, EndReason } from '../landingAudio';
import { useLandingData } from '../leoPart1';
import { Reveal } from '../Reveal';
import { DemoPlayer } from './DemoPlayer';

/**
 * «Как малако это решает»: three answers to the three problems, each with
 * something that works (docs/landing-guide/c.html, the solutions section). The
 * speed answer is the mini player, the subtitles answer is a button that
 * refuses, the spelling answer is the app's own word window.
 */

function Tag({ n, children }: { n: number; children: ReactNode }) {
  return (
    <span className="sol-tag">
      <b>{n}</b>
      <span>{children}</span>
    </span>
  );
}

/** The player's phone screenshot, in a phone. */
function PhoneShot() {
  return (
    <div className="phone green">
      <div className="screen">
        <img src={phonePlayer} alt="" loading="lazy" width={780} height={1688} />
      </div>
    </div>
  );
}

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

/**
 * The app's word window on Leo's part 1, drawn on its own page (ink or paper,
 * the visitor's pick, as in the app) and sized as a panel: the window is made
 * to fill whatever holds it, and scrolls inside.
 */
function WordPanel() {
  const { leo, learnedWords, playWord, failed } = useLandingData();
  const [look] = useWordLook();

  return (
    <div
      aria-busy={!leo && !failed ? true : undefined}
      className={`flex h-[36rem] flex-col overflow-hidden rounded-card border pt-5 shadow-[0_24px_48px_-28px_rgba(15,21,28,0.5)] ${wordPageClass(look)} ${look === 'ink' ? 'border-transparent' : 'border-line'}`}
    >
      {leo && (
        <WordWindow
          variant="sheet"
          words={leo.words}
          shape={leo.shape}
          seed="leo-1"
          partNumber={1}
          learnedWords={learnedWords}
          onPlay={playWord}
        />
      )}
    </div>
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
            <Tag n={1}>{t('landing.solve.s1.tag')}</Tag>
            <h3>{t('landing.solve.s1.title')}</h3>
            <p>{t('landing.solve.s1.text')}</p>
            <div className="sol-shots">
              <figure>
                <PhoneShot />
                <figcaption>{t('landing.devices.phone')}</figcaption>
              </figure>
              <figure style={{ flex: 1 }}>
                <div className="browser">
                  <div className="browser-bar">
                    <i />
                    <i />
                    <i />
                  </div>
                  <img src={desktopPlayer} alt="" loading="lazy" width={1600} height={1000} />
                </div>
                <figcaption>{t('landing.devices.desktop')}</figcaption>
              </figure>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <DemoPlayer />
          </Reveal>
        </article>

        <article className="sol flip">
          <Reveal className="sol-text">
            <Tag n={2}>{t('landing.solve.s2.tag')}</Tag>
            <h3>{t('landing.solve.s2.title')}</h3>
            <p>{t('landing.solve.s2.text')}</p>
            <CaptionsButton />
          </Reveal>
          <Reveal delay={120} className="marked">
            <PhoneShot />
            <Mark at="k1">{marks[0]}</Mark>
            <Mark at="k2">{marks[2]}</Mark>
            <Mark at="k3">{marks[1]}</Mark>
          </Reveal>
        </article>

        <article className="sol">
          <Reveal className="sol-text">
            <Tag n={3}>{t('landing.solve.s3.tag')}</Tag>
            <h3>{t('landing.solve.s3.title')}</h3>
            <p>{t('landing.solve.s3.text')}</p>
            <p className="micro">{t('landing.solve.s3.try')}</p>
            <AutumnChip />
            <p>{t('landing.solve.s3.game')}</p>
          </Reveal>
          <Reveal delay={120}>
            <WordPanel />
          </Reveal>
        </article>
      </div>
    </section>
  );
}
