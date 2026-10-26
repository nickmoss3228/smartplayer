import { useTranslation } from 'react-i18next';
import { SceneSlot } from './SceneSlot';

/**
 * Chapter 4: what the app gives back for taking the subtitles away, the comic,
 * told in a line. With the 3D scene on, the scene draws Leo's page as eight
 * panels; «Найди сцену» itself lives in the app's practice, not here.
 */
export function ComicCard() {
  const { t } = useTranslation();

  return (
    <section className="ch" data-ch="4">
      <div className="card">
        <SceneSlot ch={4} />
        <p className="eyebrow">{t('landing.given.eyebrow')}</p>
        <h2>{t('landing.given.title')}</h2>
        <p>{t('landing.given.text')}</p>
      </div>
    </section>
  );
}
