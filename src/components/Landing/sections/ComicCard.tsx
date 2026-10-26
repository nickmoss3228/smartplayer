import { useTranslation } from 'react-i18next';
import { IoAdd } from 'react-icons/io5';
import { useLanding } from '../landingStore';
import { ComicGame } from './ComicGame';
import { SceneSlot } from './SceneSlot';

/**
 * Chapter 4: what the app gives back for taking the subtitles away, the comic,
 * and «Найди сцену» to try it with. With the 3D scene on, the scene draws the
 * page as eight panels and this card only holds the game's controls (and says
 * to tap a panel there); without it, the game draws the page itself.
 */
export function ComicCard() {
  const { t } = useTranslation();
  const is3d = useLanding((s) => s.is3d);

  return (
    <section className="ch" data-ch="4">
      <div className="card">
        <SceneSlot ch={4} />
        <p className="eyebrow">{t('landing.given.eyebrow')}</p>
        <h2>{t('landing.given.title')}</h2>
        <div className="taken">
          <details>
            <summary>
              <span className="slg">{t('homepage.why.visualMemory.slogan')}</span>
              <span>{t('homepage.why.visualMemory.title')}</span>
              <span className="pl">
                <IoAdd aria-hidden="true" />
              </span>
            </summary>
            <p>{t('homepage.why.visualMemory.takeaway')}</p>
          </details>
        </div>
        <div className="on-light">
          <ComicGame
            external={is3d}
            hint={
              is3d ? (
                <span className="tap-hint">
                  <i />
                  <span>{t('landing.tapPanel')}</span>
                </span>
              ) : null
            }
          />
        </div>
      </div>
    </section>
  );
}
