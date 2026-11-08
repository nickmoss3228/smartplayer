import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowDownIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import Slogan from '../Brand/Slogan';
import Iceberg from './Iceberg';
import LetterO from './LetterO';
import Steps from './Steps';
import Rivals from './Rivals';
import Features from './Features';
import './icebergLanding.css';

/**
 * The landing (/), built as one argument:
 * 1. the question learners ask ("I know the grammar and the words, but can't
 *    understand English by ear. Why?") and the iceberg that answers it;
 * 2. the deepest part, shown on the letter "o" in Russian and in English;
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
  const { t, i18n } = useTranslation();
  const ru = i18n.language.startsWith('ru');
  const question = t('iceberg.hero.question');

  return (
    <div className="ib">
      <header className="ib-hero">
        <div className="ib-wrap">
          <p className="ib-brand">{t('brand')}</p>
          <Slogan className="ib-slogan" />
          <h1 className="ib-question">{ru ? `«${question}»` : `“${question}”`}</h1>
          <p className="ib-lead">{t('iceberg.hero.lead')}</p>
        </div>
        <div className="ib-berg-wrap">
          <Iceberg />
        </div>
        <div className="ib-wrap ib-hero-foot">
          <p className="ib-body">{t('iceberg.berg.caption')}</p>
          <a href="#ib-letter-title" className="ib-down">
            {t('iceberg.hero.down')}
            <ArrowDownIcon aria-hidden="true" />
          </a>
        </div>
      </header>

      <LetterO />
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
