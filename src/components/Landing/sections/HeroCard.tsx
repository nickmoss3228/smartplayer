import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { IoChevronForward } from 'react-icons/io5';
import { SceneSlot } from './SceneSlot';

/**
 * Chapter 0: the promise — listen and repeat, that's it — and the way in.
 * The name and its slogan sit above it, as the page's own header (Landing.tsx).
 *
 * The `.probs` row is the still version's stand-in for the 3D scene (hidden
 * while the 3D runs).
 */
export function HeroCard() {
  const { t } = useTranslation();
  const scenes = t('landing.hero.scenes', { returnObjects: true }) as string[];

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
        <h1>
          <span>{t('landing.hero.title1')}</span>
          <span className="soft">{t('landing.hero.title2')}</span>
        </h1>
        <p>{t('landing.hero.lead')}</p>
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
