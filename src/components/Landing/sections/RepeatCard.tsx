import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { RepeatDrawing } from '../../Method/RepeatDrawing';

/**
 * Right after the hero: listen and repeat. A drawing, not 3D
 * (Method/RepeatDrawing, shared with /how-to-use), with the three steps lit
 * in time with it.
 *
 * On desktop it sits over the hero's 3D (data-scene="0" keeps that scene);
 * on a phone the drawing is the card's own window, like the 3D cards'.
 * The drawing animates only while on screen; the steps follow its clock.
 */

export function RepeatCard() {
  const { t } = useTranslation();
  const steps = t('landing.repeat.steps', { returnObjects: true }) as string[];
  const list = useRef<HTMLOListElement>(null);

  // The steps can appear after the drawing has started (when the copy arrives): put them on its clock.
  useEffect(() => {
    const ol = list.current;
    const clock = ol?.closest('.rp')?.querySelector('.rp-w1')?.getAnimations?.()[0];
    if (!ol || !clock || clock.currentTime === null) return;
    ol.querySelectorAll('li').forEach((li) => li.getAnimations?.().forEach((a) => (a.currentTime = clock.currentTime)));
  }, [steps.length]);

  return (
    <section className="ch rp" data-ch="repeat" data-scene="0">
      <div className="card">
        <div className="rp-panel">
          <RepeatDrawing />
        </div>
        <p className="eyebrow">{t('landing.repeat.eyebrow')}</p>
        <h2>{t('landing.repeat.title')}</h2>
        <p>{t('landing.repeat.body')}</p>
        <ol className="rp-steps" ref={list}>
          {steps.map((s, i) => (
            <li key={i} className={`rp-cyc rp-s${i + 1}`}>
              {i + 1} · {s}
            </li>
          ))}
        </ol>
        <div className="app-note">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
          </svg>
          <span>{t('landing.repeat.note')}</span>
        </div>
      </div>
    </section>
  );
}
