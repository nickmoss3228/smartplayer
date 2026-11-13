import { lazy, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowDownIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import Slogan from '../Brand/Slogan';
import Iceberg from './Iceberg';
import Speed from './Speed';
import Perception from './Perception';
import LetterO from './LetterO';
import Linking from './Linking';
import Rivals from './Rivals';
import Bubbles from './Bubbles';
import DepthGauge from './DepthGauge';
import Steps from './Steps';
import Features from './Features';
import Wave from './Wave';
import Lazy3D, { prefersStill } from './Lazy3D';

// three.js scenes, in their own chunks: fetched only when the first one nears the screen
const MarineSnow = lazy(() => import('./three/MarineSnow'));
const Iceberg3D = lazy(() => import('./three/Iceberg3D'));
import './icebergLanding.css';

/**
 * The landing (/), built as one argument and drawn as a dive down the iceberg
 * and back up (2026-11-13):
 * 1. what learners say ("I know the grammar, I have the vocabulary. By ear?
 *    I don't understand...") and the iceberg that answers it, with the way in
 *    (the CTA) on the first screen;
 * 2. the four layers under the water, in the iceberg's order: speed, perception,
 *    spelling (the letter "o"), linking. Each sits in its own band of water,
 *    darker the deeper it is; moving waves join the bands, bubbles and 3D marine
 *    snow drift in the deep ones, and a depth gauge tracks the layer;
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
const LAYER_KEYS = ['speed', 'perception', 'spelling', 'linking'] as const;

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

export default function IcebergLanding() {
  const { t } = useTranslation();
  const lines = t('iceberg.hero.lines', { returnObjects: true }) as string[];
  const zones = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)];
  const layers = LAYER_KEYS.map((k, i) => ({ ref: zones[i], label: t(`iceberg.berg.${k}.title`) }));
  const sections = [<Speed key="speed" />, <Perception key="perception" />, <LetterO key="letter" />, <Linking key="linking" />];

  return (
    <div className="ib ib-dive">
      <header className="ib-hero">
        <div className="ib-wrap">
          <p className="ib-brand">{t('brand')}</p>
          <Slogan className="ib-slogan" />
          <h1 className="ib-question">
            {lines.map((line) => <span key={line} className="ib-q-line">{line}</span>)}
          </h1>
          {/* the way in, on the first screen too, not only at the bottom */}
          <Link to="/levels" className="ib-cta dv-hero-cta">
            {t('iceberg.cta.button')}
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </div>
        <div className="ib-berg-wrap">
          <Iceberg />
        </div>
        <div className="ib-wrap ib-hero-foot">
          <a href="#ib-speed-title" className="ib-down">
            {t('iceberg.hero.down')}
            <ArrowDownIcon aria-hidden="true" />
          </a>
        </div>
      </header>

      <DepthGauge stops={layers} label={t('iceberg.berg.listening')} />

      {sections.map((section, i) => (
        <div key={LAYER_KEYS[i]}>
          <Wave from={i === 0 ? ROOM : WATER[i - 1]} to={WATER[i]} flip={i % 2 === 1} />
          <div ref={zones[i]} className={`dv-zone dv-z${i + 1}${i > 0 ? ' dv-dark' : ''}`} style={{ background: WATER[i] }}>
            {i > 0 && <Bubbles count={2 + i * 2} />}
            {i > 0 && <Lazy3D className="dv-3d"><MarineSnow density={0.5 + i * 0.25} /></Lazy3D>}
            {section}
          </div>
        </div>
      ))}

      {/* the way up: the steps rise out of the deep and break the surface */}
      <Steps />
      <Rivals />
      <Features />

      {/* the whole iceberg at last: the tip in the air, the body under the waterline */}
      <section className="ib-final dv-final">
        <p className="ib-brand">{t('brand')}</p>
        <Slogan className="ib-slogan" />
        <h2 className="ib-h2">{t('iceberg.cta.title')}</h2>
        <Link to="/levels" className="ib-cta">
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
            <p className="ib-micro">{t('iceberg.cta.text')}</p>
            <footer>
              <p className="ib-micro">{t('howToUse.footer')}</p>
            </footer>
          </div>
        </div>
      </section>
    </div>
  );
}
