import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { RepeatDrawing } from '../../Method/RepeatDrawing';
import { useLanding } from '../landingStore';
import { SceneSlot } from './SceneSlot';

/**
 * Right after the hero: listen and repeat, and that the app does it with you.
 *
 * With the 3D on, the card has its own scene (chapter 6): the listener from
 * «В наушниках» listens, says the phrase into the phone, then hears both
 * voices played back above their head and smiles. The three steps light up
 * with the scene's beats (landingStore.repeatUI). Without the 3D (reduced
 * motion, no WebGL) the card shows the same three beats as a drawing
 * (Method/RepeatDrawing, shared with /how-to-use), the steps on its clock.
 */
export function RepeatCard() {
  const { t } = useTranslation();
  const steps = t('landing.repeat.steps', { returnObjects: true }) as string[];
  const is3d = useLanding((s) => s.is3d);
  const beat = useLanding((s) => s.repeatUI);
  const list = useRef<HTMLOListElement>(null);

  // Without the 3D: the steps can appear after the drawing has started (when the copy arrives), so put them on its clock.
  useEffect(() => {
    if (is3d) return;
    const ol = list.current;
    const clock = ol?.closest('.rp')?.querySelector('.rp-w1')?.getAnimations?.()[0];
    if (!ol || !clock || clock.currentTime === null) return;
    ol.querySelectorAll('li').forEach((li) => li.getAnimations?.().forEach((a) => (a.currentTime = clock.currentTime)));
  }, [steps.length, is3d]);

  return (
    <section className="ch rp" data-ch="repeat" data-scene="6">
      <div className="card">
        <SceneSlot ch={6} />
        {!is3d && (
          <div className="rp-panel">
            <RepeatDrawing />
          </div>
        )}
        <p className="eyebrow">{t('landing.repeat.eyebrow')}</p>
        <h2>{t('landing.repeat.title')}</h2>
        <p>{t('landing.repeat.body')}</p>
        <ol className="rp-steps" ref={list}>
          {steps.map((s, i) => (
            <li key={i} className={is3d ? (beat === i ? 'on' : undefined) : `rp-cyc rp-s${i + 1}`}>
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
