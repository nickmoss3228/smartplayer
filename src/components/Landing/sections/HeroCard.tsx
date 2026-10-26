import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { IoChevronForward } from 'react-icons/io5';
import { SceneSlot } from './SceneSlot';

/**
 * Chapter 0: the promise, the three problems by name, and the way in.
 *
 * The first `.probs` row is the still version's stand-in for the 3D scene
 * (hidden while the 3D runs); the second names the three problems the next
 * cards take one at a time.
 */
export function HeroCard() {
  const { t } = useTranslation();
  const scenes = t('landing.hero.scenes', { returnObjects: true }) as string[];
  const problems = t('landing.hero.problems', { returnObjects: true }) as string[];

  return (
    <section className="ch first" data-ch="0">
      <div className="card">
        <SceneSlot ch={0} />
        <div className="still">
          <div className="probs">
            {scenes.map((name, i) => (
              <span key={i}><b>{i + 1}</b>{name}</span>
            ))}
          </div>
        </div>
        <p className="eyebrow">{t('homepage.eyebrow')}</p>
        <h1>
          <span className="soft">{t('howToUse.intro.title1')}</span>
          <span>{t('howToUse.intro.title2')}</span>
        </h1>
        <p>{t('landing.hero.lead')}</p>
        <div className="probs">
          {problems.map((name, i) => (
            <span key={i}><b>{i + 1}</b>{name}</span>
          ))}
        </div>
        <div className="cta">
          <Link to="/levels" className="btn btn-primary btn-hero">{t('homepage.startFree')}</Link>
          <Link to="/login" className="link-quiet">{t('homepage.account')}</Link>
        </div>
        <span className="scroll only3d">
          <span>{t('landing.scroll')}</span>
          <span className="ico"><IoChevronForward aria-hidden="true" /></span>
        </span>
      </div>
    </section>
  );
}
