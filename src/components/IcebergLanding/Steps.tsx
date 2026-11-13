import { lazy, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon } from '@heroicons/react/24/outline';
import { GLYPHS } from './stepGlyphs';
import Bubbles from './Bubbles';
import DepthGauge from './DepthGauge';
import Wave from './Wave';
import Lazy3D from './Lazy3D';
import StepShot, { type Crop } from './StepShot';
import step1d from '../../assets/landing/steps/step1-d.webp';
import step1m from '../../assets/landing/steps/step1-m.webp';
import step2d from '../../assets/landing/steps/step2-d.webp';
import step2m from '../../assets/landing/steps/step2-m.webp';
import step34d from '../../assets/landing/steps/step34-d.webp';
import step34m from '../../assets/landing/steps/step34-m.webp';
import step5d from '../../assets/landing/steps/step5-d.webp';
import step5m from '../../assets/landing/steps/step5-m.webp';

const MarineSnow = lazy(() => import('./three/MarineSnow'));

/**
 * How to fight it, drawn as the way up: five steps and the claim. Scrolling down is rising: the water starts as
 * deep as the last layer and lightens at every step, light reaches down from
 * the surface, and the steps hang off one rope that fills as you scroll,
 * lighting each step when it reaches the middle of the screen. Past the last
 * step the page breaks the surface and the claim stands in the open air.
 */

interface Item {
  title: string;
  short?: string;
  text: string;
  app: string;
}

/** A whole capture, in CSS pixels (the files are 2x), with an optional spotlight. */
const whole = (src: string, w: number, h: number, spot?: Crop['spot']): Crop => ({ src, size: [w, h], box: [0, 0, w, h], spot });

/**
 * Each step's place in the app, in step order: a capture of the desktop player
 * (1440px) and of the phone player (390px), shown by screen width. `feature`
 * is the feature from `iceberg.features.items` the step's screenshot shows;
 * its title and text move here from the features section, which now lists only
 * the rest. Recapture with the player at /levels/easy/leo/1, phrase 4, 0.65x, x3.
 */
const SHOTS: { d: Crop; m: Crop; feature?: number }[] = [
  // 1. the words of the part, each one heard before it is read
  { d: whole(step1d, 360, 410), m: whole(step1m, 390, 472), feature: 1 },
  // 2. one stream, cut into phrases: phrase 4 lit on the waveform / the dots
  { d: whole(step2d, 656, 96, [66, 6, 38, 68]), m: whole(step2m, 390, 160, [8, 10, 374, 30]) },
  // 3. the three speeds, 0.65 picked
  { d: whole(step34d, 656, 190, [256, 128, 144, 46]), m: whole(step34m, 390, 175, [20, 110, 168, 56]) },
  // 4. the repeats, x3 picked
  { d: whole(step34d, 656, 190, [505, 128, 136, 46]), m: whole(step34m, 390, 175, [204, 110, 164, 56]) },
  // 5. "your turn: repeat": the player waits for you to say the phrase
  { d: whole(step5d, 472, 72, [20, 18, 36, 36]), m: whole(step5m, 390, 68, [20, 20, 36, 36]), feature: 3 },
];

export default function Steps() {
  const { t } = useTranslation();
  const items = t('iceberg.steps.items', { returnObjects: true }) as Item[];
  const features = t('iceberg.features.items', { returnObjects: true }) as { title: string; text: string }[];
  const ropeRef = useRef<HTMLDivElement>(null);
  const stepRefs = [useRef<HTMLLIElement>(null), useRef<HTMLLIElement>(null), useRef<HTMLLIElement>(null), useRef<HTMLLIElement>(null), useRef<HTMLLIElement>(null)];
  const [fill, setFill] = useState(0);
  const [lit, setLit] = useState(-1);

  // The rope fills to the middle of the screen; a step lights once its knot is above it.
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const rope = ropeRef.current;
      if (!rope) return;
      const mid = window.innerHeight * 0.55;
      const r = rope.getBoundingClientRect();
      setFill(Math.round(Math.min(1, Math.max(0, (mid - r.top) / r.height)) * 1000) / 1000);
      let n = -1;
      stepRefs.forEach((ref, i) => {
        const el = ref.current;
        if (el && el.getBoundingClientRect().top + 30 <= mid) n = i;
      });
      setLit(n);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(measure); };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
    // The refs are stable for the life of the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <section className="ib-sec ib-steps dv-ascent" aria-labelledby="ib-steps-title">
        <Bubbles count={8} />
        <Lazy3D className="dv-3d"><MarineSnow density={1.2} /></Lazy3D>
        {/* light from the surface, reaching down into the lighter half */}
        <svg className="dv-rays" viewBox="0 0 1000 700" preserveAspectRatio="none" aria-hidden="true">
          <path d="M300 700 L360 700 L240 0 L200 0Z" />
          <path d="M560 700 L600 700 L620 0 L590 0Z" />
          <path d="M780 700 L840 700 L930 0 L890 0Z" />
        </svg>

        <div className="ib-wrap">
          <p className="ib-kicker">{t('iceberg.steps.micro')}</p>
          <h2 id="ib-steps-title" className="ib-h2">{t('iceberg.steps.title')}</h2>

          <div className="dv-climb">
            <div ref={ropeRef} className="dv-rope" aria-hidden="true">
              <i style={{ transform: `scaleY(${fill})` }} />
              <b style={{ top: `${fill * 100}%` }} />
            </div>
            <ol className="dv-climb-list">
              {items.map((it, i) => (
                <li
                  key={i}
                  ref={stepRefs[i]}
                  className={`dv-climb-step${i % 2 ? ' dv-right' : ''}${i <= lit ? ' lit' : ''}`}
                >
                  <span className="dv-knot" aria-hidden="true">{i + 1}</span>
                  <article className="ib-card dv-climb-card">
                    <div className="ib-glyph" aria-hidden="true">{GLYPHS[i]}</div>
                    <div className="ib-step-body">
                      <h3 className="ib-h3">{it.title}</h3>
                      <p>{it.text}</p>
                      <p className="ib-step-app">
                        <CheckIcon className="ib-check" aria-hidden="true" />
                        <span>
                          <span className="ib-step-app-k">{t('iceberg.steps.app')}:</span> {it.app}
                        </span>
                      </p>
                    </div>
                    <figure className="dv-step-media">
                      <StepShot className="dv-shot-d" crop={SHOTS[i].d} alt={SHOTS[i].feature !== undefined ? features[SHOTS[i].feature!].title : it.app} />
                      <StepShot className="dv-shot-m" crop={SHOTS[i].m} alt={SHOTS[i].feature !== undefined ? features[SHOTS[i].feature!].title : it.app} />
                      {SHOTS[i].feature !== undefined && (
                        <figcaption>
                          <b>{features[SHOTS[i].feature!].title}</b> {features[SHOTS[i].feature!].text}
                        </figcaption>
                      )}
                    </figure>
                  </article>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <DepthGauge
          label={t('iceberg.steps.micro')}
          stops={items.map((it, i) => ({ ref: stepRefs[i], label: it.short ?? it.title }))}
          end="surface"
        />
      </section>

      {/* breaking the surface: the claim in the open air */}
      <Wave from="#cfe6f3" to="#eef6fb" tall />
      <section className="dv-air">
        <span className="dv-sun" aria-hidden="true" />
        <div className="ib-wrap">
          <div className="ib-claim">
            <ol className="ib-claim-dots" aria-hidden="true">
              {items.map((_, i) => (
                <li key={i} style={{ animationDelay: `${i * 0.18}s` }}>
                  <CheckIcon />
                </li>
              ))}
            </ol>
            <p className="ib-claim-text">
              {t('iceberg.steps.claimA')} <em>{t('iceberg.steps.claimB')}</em>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
