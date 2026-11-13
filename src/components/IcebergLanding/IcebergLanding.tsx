import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowDownIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import Slogan from '../Brand/Slogan';
import Iceberg from './Iceberg';
import Speed from './Speed';
import Perception from './Perception';
import LetterO from './LetterO';
import Linking from './Linking';
import Steps from './Steps';
import Rivals from './Rivals';
import Features from './Features';
import './icebergLanding.css';

/**
 * The landing (/), built as one argument:
 * 1. what learners say ("I know the grammar, I have the vocabulary. By ear?
 *    I don't understand...") and the iceberg that answers it;
 * 2. the four layers under the water, in the iceberg's order: speed (syllables),
 *    perception (sounds Russian lacks), spelling (the letter "o"), linking;
 * 3. five steps that fight it, and malako doing all five for you;
 * 4. why podcasts and AI tutors don't;
 * 5. what the player has that they lack, with screenshots;
 * 6. "Try it yourself".
 *
 * The landing before it (four learner complaints with 3D scenes) was never
 * shipped; it is backed up in player/backups/landing-problems-before-iceberg-2026-11-08.
 * The short guide before that (components/Landing) opens in dev at /landing-old.
 */
export default function IcebergLanding() {
  const { t } = useTranslation();
  const lines = t('iceberg.hero.lines', { returnObjects: true }) as string[];

  return (
    <div className="ib">
      <header className="ib-hero">
        <div className="ib-wrap">
          <p className="ib-brand">{t('brand')}</p>
          <Slogan className="ib-slogan" />
          <h1 className="ib-question">
            {lines.map((line) => <span key={line} className="ib-q-line">{line}</span>)}
          </h1>
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

      <Speed />
      <Perception />
      <LetterO />
      <Linking />
      <Steps />
      <Rivals />
      <Features />

      <section className="ib-final">
        <p className="ib-brand">{t('brand')}</p>
        <Slogan className="ib-slogan" />
        <h2 className="ib-h2">{t('iceberg.cta.title')}</h2>
        <Link to="/levels" className="ib-cta">
          {t('iceberg.cta.button')}
          <ArrowRightIcon aria-hidden="true" />
        </Link>
        <p className="ib-micro">{t('iceberg.cta.text')}</p>
      </section>
      <footer className="ib-foot">
        <p className="ib-micro">{t('howToUse.footer')}</p>
      </footer>
    </div>
  );
}
