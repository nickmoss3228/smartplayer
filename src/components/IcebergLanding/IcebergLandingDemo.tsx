import { lazy, useEffect, useRef } from 'react';
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
import { TRY_IT_PATH, TRY_IT_STATE } from './tryIt';
import { BANDS, BergDrawing, LAYER_KEYS, WATER, useHeroIntro, water } from './IcebergLanding';
import './icebergLanding.css';
import './landingDemo.css';

const MarineSnow = lazy(() => import('./three/MarineSnow'));
const Iceberg3D = lazy(() => import('./three/Iceberg3D'));

/**
 * A reordered copy of the landing at /landing-demo (hidden: not linked, not
 * indexed), to compare before deciding. Order: the hero; "Hear the difference
 * yourself" (the final berg, without the footer); the steps; the four problem
 * bands; Rivals; the footer. The seams the new neighbours create are smoothed in
 * landingDemo.css and in the first band's background below.
 */

/** The first band normally fades up from the page colour; here it follows the steps, which end in the first water. */
const firstBandWater = `linear-gradient(180deg, ${WATER[0]} 0, ${WATER[0]} 1px, transparent 180px), ${water(0)}`;

export default function IcebergLandingDemo() {
  const { t } = useTranslation();
  const checks = t('iceberg.hero.checks', { returnObjects: true }) as string[];
  const zones = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)];
  const layers = LAYER_KEYS.map((k, i) => ({ ref: zones[i], label: t(`iceberg.berg.${k}.title`) }));
  const sections = [<LetterO key="letter" />, <Speed key="speed" />, <Perception key="perception" />, <Linking key="linking" />];
  const rootRef = useRef<HTMLDivElement>(null);
  const { heroClass, bergReady } = useHeroIntro();

  // Pause every band that is off screen (.dv-idle in the CSS), as on the landing.
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
    <div ref={rootRef} className="ib ib-dive ib-demo" data-skin="deep">
      {/* /landing-demo is a draft for comparison: keep it out of every index. React 19 hoists the tag into <head>. */}
      <meta name="robots" content="noindex, nofollow" />
      <header className={heroClass}>
        <div className="ib-wrap">
          <p className="ib-brand">{t('brand')}</p>
          <Slogan className="ib-slogan" />
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
          <Link to={TRY_IT_PATH} state={TRY_IT_STATE} className="ib-cta dv-hero-cta">
            {t('iceberg.cta.button')}
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </div>
        <div className="ib-berg-wrap">
          <Iceberg ready={bergReady} />
        </div>
        <div className="ib-wrap ib-hero-foot">
          {/* «Вот почему ты не слышишь» promises the why, so it jumps to the
              first problem band, as on the landing, not to the CTA below. */}
          <a href="#ib-letter-title" className="ib-down">
            {t('iceberg.hero.down')}
            <ArrowDownIcon aria-hidden="true" />
          </a>
        </div>
      </header>

      <StickyCta label={t('iceberg.cta.button')} />

      {/* "Hear the difference yourself": the landing's last section, without its footer */}
      <section id="ib-demo-final" className="ib-final dv-final">
        <h2 className="ib-h2">{t('iceberg.cta.title')}</h2>
        <Link to={TRY_IT_PATH} state={TRY_IT_STATE} className="ib-cta">
          {t('iceberg.cta.button')}
          <ArrowRightIcon aria-hidden="true" />
        </Link>
        <div className="dv-final-stage">
          <Lazy3D className="dv-final-3d" still fallback={<BergDrawing />}>
            <Iceberg3D still={prefersStill()} />
          </Lazy3D>
        </div>
      </section>

      {/* the berg's water, light, runs into the steps, which start in the deep */}
      <div className="ib-demo-spacer ib-demo-spacer-down" aria-hidden="true" />
      <Steps />

      <LayerBar stops={layers} colors={WATER} label={t('iceberg.berg.listening')} until=".ib-rivals" />

      {sections.map((section, i) => (
        <div key={LAYER_KEYS[i]}>
          <div
            ref={zones[i]}
            className={`dv-zone dv-z${i + 1}${i > 0 ? ' dv-dark' : ''}`}
            style={{ background: i === 0 ? firstBandWater : water(i) }}
          >
            <Fish count={i === 0 ? 4 : 3} seed={i * 5} />
            {i > 0 && <Bubbles count={2 + i * 2} />}
            {i > 0 && <Lazy3D className="dv-3d"><MarineSnow density={0.5 + i * 0.25} /></Lazy3D>}
            {section}
          </div>
        </div>
      ))}

      {/* the deepest water rises to the page colour before Rivals */}
      <div className="ib-demo-spacer ib-demo-spacer-up" aria-hidden="true" />
      <Rivals />

      <footer className="ib-demo-footer">
        <p className="ib-micro">{t('howToUse.footer')}</p>
        <nav className="ib-footer-nav" aria-label={t('iceberg.footer.label')}>
          <Link to="/how-to-use" className="ib-micro">{t('iceberg.footer.howToUse')}</Link>
          <Link to="/levels" className="ib-micro">{t('iceberg.footer.levels')}</Link>
          <Link to="/legal/terms" className="ib-micro">{t('iceberg.footer.terms')}</Link>
          <Link to="/legal/privacy" className="ib-micro">{t('iceberg.footer.privacy')}</Link>
          <Link to="/legal/consent" className="ib-micro">{t('iceberg.footer.consent')}</Link>
        </nav>
      </footer>
    </div>
  );
}
