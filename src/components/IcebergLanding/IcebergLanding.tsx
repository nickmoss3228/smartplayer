import { lazy, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { ArrowDownIcon, ArrowRightIcon, CheckIcon } from '@heroicons/react/24/outline';
import Slogan from '../Brand/Slogan';
import Iceberg from './Iceberg';
import Speed from './Speed';
import Perception from './Perception';
import LetterO from './LetterO';
import Linking from './Linking';
import Rivals from './Rivals';
import Bubbles from './Bubbles';
import LayerBar from './LayerBar';
import Steps from './Steps';
import Fish from './Fish';
import Lazy3D, { prefersStill } from './Lazy3D';
import StickyCta from './StickyCta';
import HeroMark from './HeroMark';

// three.js scenes, in their own chunks: fetched only when the first one nears the screen
const MarineSnow = lazy(() => import('./three/MarineSnow'));
const Iceberg3D = lazy(() => import('./three/Iceberg3D'));
import './icebergLanding.css';
import { TRY_IT_PATH, TRY_IT_STATE } from './tryIt';

/**
 * The landing (/), built as one argument and drawn as a dive down the iceberg
 * and back up (2026-11-13):
 * 1. what learners say ("I know the grammar, I have the vocabulary. By ear?
 *    I don't understand...") and the iceberg that answers it, with the way in
 *    (the CTA) on the first screen;
 * 2. the four layers under the water, in the iceberg's order: spelling (the letter
 *    "o"), speed, perception, linking. Each sits in its own band of water,
 *    darker the deeper it is; each band fades into the next, fish cross them,
 *    bubbles and 3D marine snow drift in the deep ones, and a bar pinned under the navbar lights the layer
 *    being read, until the steps' own bar takes over;
 * 3. the way up (Steps): five steps on a rope, each with its place in the app,
 *    the water lightening until the claim breaks the surface;
 * 4. why podcasts and AI tutors don't (Rivals), on the surface;
 * 5. the comparison and the features the steps don't show (Features), floating;
 * 6. "Try it yourself" over the whole iceberg in 3D, the page ending in the water.
 *
 * The flat version before the dive is backed up in
 * player/backups/landing-iceberg-before-dive-2026-11-13. The earlier landings
 * open in dev at /landing-problems and /landing-old.
 */

/** The water of each band, top to bottom; the first is the page's own background. */
const ROOM = '#f5f8fa';
const WATER = ['#cfe6f3', '#2a6390', '#1b4b72', '#0d2c47'] as const;
/**
 * How far the fade into each band reaches, in px: [above the line where the band
 * starts (so into the band before), below it]. Longer the deeper the band, so the
 * water changes more softly on the way down. The first fade is the shortest below
 * the line: the white heading of band 2 needs dark water under it.
 */
const FADES = [[0, 140], [260, 140], [360, 320], [480, 420]] as const;
const FADE_STEPS = 6;

/** One colour of a fade, `t` of the way from `a` to `b`, eased so neither end shows as an edge. */
const mix = (a: string, b: string, t: number) => `color-mix(in oklab, ${a} ${Math.round((1 - t * t * (3 - 2 * t)) * 100)}%, ${b})`;

/** A band's water: the end of the fade from the band above, its own colour, then the start of the fade into the band below. */
function water(i: number) {
  const stops: string[] = [];
  const [above, below] = FADES[i];
  const start = above / (above + below);
  for (let k = 0; k <= FADE_STEPS; k++) {
    const t = start + ((1 - start) * k) / FADE_STEPS;
    stops.push(`${mix(i === 0 ? ROOM : WATER[i - 1], WATER[i], t)} ${Math.round(t * (above + below) - above)}px`);
  }
  if (i < WATER.length - 1) {
    const [reach, rest] = FADES[i + 1];
    for (let k = 0; k <= FADE_STEPS; k++) {
      const t = ((reach / (reach + rest)) * k) / FADE_STEPS;
      stops.push(`${mix(WATER[i], WATER[i + 1], t)} calc(100% - ${Math.round(reach - t * (reach + rest))}px)`);
    }
  }
  return `linear-gradient(180deg, ${stops.join(', ')})`;
}

const LAYER_KEYS = ['spelling', 'speed', 'perception', 'linking'] as const;

/** The page's bands: each one's loops (waves, bubbles, rays, floes) run only while it is on screen. */
const BANDS = '.ib-hero, .dv-wave, .dv-zone, .dv-ascent, .dv-air, .ib-sec, .ib-final';

/** The flat berg, shown until the 3D one loads and wherever WebGL is missing: tip above the middle line, body below. */
function BergDrawing() {
  return (
    <svg className="dv-final-svg" viewBox="0 0 600 440" preserveAspectRatio="xMidYMid meet">
      <polygon points="240,220 286,140 312,100 350,220" fill="#ffffff" />
      <polygon points="312,100 350,220 390,220 342,144" fill="#cfe2ee" />
      <polygon points="240,220 200,290 170,360 120,440 480,440 450,360 420,290 390,220" fill="#ffffff" opacity={0.35} />
    </svg>
  );
}

/**
 * The hero settles in on the first open of the page: it stays hidden until
 * Manrope is in (so the wordmark never jumps from the fallback font), then its
 * pieces rise in one after another (.ib-intro / .ib-go in the CSS). Once per
 * page load: coming back to / from inside the app shows it at rest. Skipped
 * for reduced motion.
 */
let introPlayed = false;
const FONT_WAIT = 600;
const BERG_AFTER = 650;

function useHeroIntro() {
  const [intro] = useState(() => !introPlayed && !prefersStill());
  const [go, setGo] = useState(false);
  const [bergReady, setBergReady] = useState(!intro);
  useEffect(() => {
    if (!intro) return;
    introPlayed = true;
    let started = false;
    let raf = 0;
    const timers: number[] = [];
    const start = () => {
      if (started) return;
      started = true;
      raf = requestAnimationFrame(() => setGo(true));
      // the iceberg's own reveal (labels, lines) waits until the berg itself has risen
      timers.push(window.setTimeout(() => setBergReady(true), BERG_AFTER));
    };
    const fonts = document.fonts;
    if (fonts) {
      const text = 'малакоAa';
      Promise.all([fonts.load('800 16px Manrope', text), fonts.load('500 16px Manrope', text), fonts.ready]).then(start, start);
    }
    timers.push(window.setTimeout(start, fonts ? FONT_WAIT : 0));
    return () => {
      started = true;
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
    };
  }, [intro]);
  return { heroClass: `ib-hero${intro ? ' ib-intro' : ''}${go ? ' ib-go' : ''}`, bergReady };
}

export default function IcebergLanding() {
  const { t } = useTranslation();
  const checks = t('iceberg.hero.checks', { returnObjects: true }) as string[];
  const zones = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)];
  const layers = LAYER_KEYS.map((k, i) => ({ ref: zones[i], label: t(`iceberg.berg.${k}.title`) }));
  const sections = [<LetterO key="letter" />, <Speed key="speed" />, <Perception key="perception" />, <Linking key="linking" />];
  const rootRef = useRef<HTMLDivElement>(null);
  const { heroClass, bergReady } = useHeroIntro();

  // Pause every band that is off screen (.dv-idle in the CSS), so the page never animates more than what is in view.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const bands = Array.from(root.querySelectorAll(BANDS));
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.target.classList.toggle('dv-idle', !e.isIntersecting)),
      { rootMargin: '120px 0px' },
    );
    bands.forEach((b) => io.observe(b));
    return () => {
      io.disconnect();
      bands.forEach((b) => b.classList.remove('dv-idle'));
    };
  }, []);

  return (
    // data-skin="deep": the underwater cards as smoked glass (end of icebergLanding.css); drop it to get the white cards back
    <div ref={rootRef} className="ib ib-dive" data-skin="deep">
      <header className={heroClass}>
        <div className="ib-wrap">
          <HeroMark />
          <p className="ib-brand">{t('brand')}</p>
          <Slogan className="ib-slogan" />
          {/* what learners say: two things ticked off and greyed, so the eye lands on the one that hurts */}
          <h1 className="ib-question">
            {checks.map((line) => (
              <span key={line} className="ib-q-check">
                <CheckIcon aria-hidden="true" />
                {line}
              </span>
            ))}
            <span className="ib-q-pain">
              <Trans t={t} i18nKey="iceberg.hero.pain" components={{ u: <span className="ib-q-hurt" /> }} />
            </span>
          </h1>
          {/* the way in, on the first screen too, not only at the bottom */}
          <Link to={TRY_IT_PATH} state={TRY_IT_STATE} className="ib-cta dv-hero-cta">
            {t('iceberg.cta.button')}
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </div>
        <div className="ib-berg-wrap">
          <Iceberg ready={bergReady} />
        </div>
        <div className="ib-wrap ib-hero-foot">
          <a href="#ib-letter-title" className="ib-down">
            {t('iceberg.hero.down')}
            <ArrowDownIcon aria-hidden="true" />
          </a>
        </div>
      </header>

      <LayerBar stops={layers} colors={WATER} label={t('iceberg.berg.listening')} until=".dv-ascent" />
      <StickyCta label={t('iceberg.cta.button')} />

      {sections.map((section, i) => (
        <div key={LAYER_KEYS[i]}>
          {/* no strip between the bands: each one's own water fades from the band above and into the band below */}
          <div ref={zones[i]} className={`dv-zone dv-z${i + 1}${i > 0 ? ' dv-dark' : ''}`} style={{ background: water(i) }}>
            <Fish count={i === 0 ? 4 : 3} seed={i * 5} />
            {i > 0 && <Bubbles count={2 + i * 2} />}
            {i > 0 && <Lazy3D className="dv-3d"><MarineSnow density={0.5 + i * 0.25} /></Lazy3D>}
            {section}
          </div>
        </div>
      ))}

      {/* the way up: the steps rise out of the deep and break the surface */}
      <Steps />
      <Rivals />

      {/* the whole iceberg at last: the tip in the air, the body under the waterline */}
      <section className="ib-final dv-final">
        <p className="ib-brand">{t('brand')}</p>
        <Slogan className="ib-slogan" />
        <h2 className="ib-h2">{t('iceberg.cta.title')}</h2>
        <Link to={TRY_IT_PATH} state={TRY_IT_STATE} className="ib-cta">
          {t('iceberg.cta.button')}
          <ArrowRightIcon aria-hidden="true" />
        </Link>
        {/* the waterline is the middle of this stage: the 3D berg's camera sits at water level.
            The page ends here: the last two lines sit in the water, over the berg's body. */}
        <div className="dv-final-stage">
          <Lazy3D className="dv-final-3d" still fallback={<BergDrawing />}>
            <Iceberg3D still={prefersStill()} />
          </Lazy3D>
          <div className="dv-final-notes">
            <footer>
              <p className="ib-micro">{t('howToUse.footer')}</p>
            </footer>
          </div>
        </div>
      </section>
    </div>
  );
}
