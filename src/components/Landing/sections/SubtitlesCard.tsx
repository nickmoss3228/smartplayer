import { useTranslation } from 'react-i18next';
import { StillScene } from './StillScene';
import { focusChapter, landingStore, setSubs, useLanding } from '../landingStore';

/**
 * Chapter 2, problem 2: while there is text on screen the eyes do the work and
 * the ears rest. The switch and the attention bar follow `landingStore.subs`,
 * which the 3D scene also flips on its own until the switch has been pressed.
 */
export function SubtitlesCard() {
  const { t } = useTranslation();
  const on = useLanding((s) => s.subs.on);

  const toggle = () => {
    focusChapter(2, 6000);
    // The store, not the render: the scene may have flipped it a moment ago.
    setSubs(!landingStore.get().subs.on, true);
  };

  return (
    <section className="ch" data-ch="2">
      <div className="card">
        <StillScene scene="subtitles" />
        <p className="eyebrow">{t('landing.subtitles.eyebrow')}</p>
        <h2>{t('landing.subtitles.title')}</h2>
        <p>{t('landing.subtitles.text')}</p>
        <button type="button" className="switch" role="switch" aria-checked={on} onClick={toggle}>
          <i />
          <span>{t('landing.subtitles.toggle')}</span>
          <small>{on ? t('landing.subtitles.on') : t('landing.subtitles.off')}</small>
        </button>
        <div className={on ? 'att' : 'att ears'}>
          <span className="micro">{t('landing.subtitles.attention')}</span>
          <div className="att-bar">
            <i className="e1" style={{ flexGrow: on ? 18 : 100 }} />
            <i className="e2" style={{ flexGrow: on ? 82 : 0 }} />
          </div>
          <div className="att-leg">
            <span>{t('landing.subtitles.ears')}</span>
            <span>{t('landing.subtitles.eyes')}</span>
          </div>
        </div>
        <p className="att-note" aria-live="polite">
          {on ? t('landing.subtitles.noteOn') : t('landing.subtitles.noteOff')}
        </p>
      </div>
    </section>
  );
}
