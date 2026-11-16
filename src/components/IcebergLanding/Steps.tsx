import { lazy, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon } from '@heroicons/react/24/outline';
import Bubbles from './Bubbles';
import Fish from './Fish';
import Wave from './Wave';
import Lazy3D from './Lazy3D';
import AudioWords from './AudioWords';
import { ComicShowcase } from './FeatureCarousel';
import PhotoDeck from './PhotoDeck';

const MarineSnow = lazy(() => import('./three/MarineSnow'));

/** The water of each point on the way up, deep to light, as in the section's gradient (for the top bar). */

/**
 * What to do about it, drawn as the way up: three points, then the claim.
 * 1. load an audio vocabulary instead of a written one: the one answer that
 *    belongs to one problem, spelling;
 * 2. slowing down, atoms and repetition, together: speed, perception and
 *    linking are tangled up with each other, so they are met as one;
 * 3. making it stick: the quiz, the comics, and saying it aloud and hearing
 *    yourself.
 * Point 1 shows five hard words turning into waveforms (AudioWords); points 2
 * and 3 list their parts inside the card. No icons, no screenshots,
 * no rope (the screens may come back later; StepShot and the step captures are
 * kept for that). Scrolling down is rising: the water lightens card by card, a
 * card lights when it reaches the middle of the screen, and past the last one
 * the page breaks the surface and the claim stands in the open air.
 */

interface Part {
  title: string;
  text: string;
}
interface Item {
  title: string;
  short?: string;
  text: string;
  parts?: Part[];
}

export default function Steps() {
  const { t } = useTranslation();
  const items = t('iceberg.steps.items', { returnObjects: true }) as Item[];
  /** Which problems each point answers, named as in the problems block: spelling, then the other three together. */
  const FOR: string[][] = [['spelling'], ['speed', 'perception', 'linking']];
  const forLabel = (i: number) => FOR[i]?.map((k, n) => {
    const name = t(`iceberg.berg.${k}.title`);
    return n ? name.toLowerCase() : name;
  }).join(', ');
  const stepRefs = [useRef<HTMLLIElement>(null), useRef<HTMLLIElement>(null)];
  const afterRef = useRef<HTMLDivElement>(null);
  const [lit, setLit] = useState(-1);

  // A card lights once its top passes the middle of the screen.
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const mid = window.innerHeight * 0.55;
      let n = -1;
      [...stepRefs, afterRef].forEach((ref, i) => {
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
        <Fish count={5} seed={3} />
        <Bubbles count={8} />
        <Lazy3D className="dv-3d"><MarineSnow density={1.2} /></Lazy3D>
        {/* light from the surface, reaching down into the lighter half */}
        <svg className="dv-rays" viewBox="0 0 1000 700" preserveAspectRatio="none" aria-hidden="true">
          <path d="M300 700 L360 700 L240 0 L200 0Z" />
          <path d="M560 700 L600 700 L620 0 L590 0Z" />
          <path d="M780 700 L840 700 L930 0 L890 0Z" />
        </svg>

        <div className="ib-wrap">
          <h2 id="ib-steps-title" className="ib-kicker">{t('iceberg.steps.micro')}</h2>

          {/* the two problem groups, numbered "Problem 1" and "Problem 2" */}
          <ol className="dv-fix-list">
            {items.slice(0, 2).map((it, i) => (
              <li key={i} ref={stepRefs[i]} className={`dv-fix${i <= lit ? ' lit' : ''}`}>
                <article className="ib-card dv-fix-card">
                  <p className="dv-fix-num">{t('iceberg.steps.problem')} #{i + 1}</p>
                  <div className="dv-fix-body">
                    {forLabel(i) && <p className="dv-fix-for">{forLabel(i)}</p>}
                    <h3 className="dv-fix-title">{it.title}</h3>
                    <p className="dv-fix-text">{it.text}</p>
                    {/* the first point's picture: hard words turning into what the ear gets */}
                    {i === 0 && <AudioWords />}
                    {it.parts && (
                      <ul className="dv-fix-parts">
                        {it.parts.map((p, k) => (
                          <li key={k} className="dv-fix-part">
                            <h4 className="ib-h3">{p.title}</h4>
                            <p>{p.text}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </article>
              </li>
            ))}
          </ol>

          {/* the comics, right after problem 2: a picture to every part makes the sound easier to follow */}
          <div className="dv-show">
            <article className="ib-card dv-show-card">
              <ComicShowcase />
            </article>
          </div>

          {/* the last point is not a problem but what holds it all together, so it is a block of its own: everything else malako has, as a carousel */}
          {items[2] && (
            <div ref={afterRef} className={`dv-fix dv-fix-after${lit >= 2 ? ' lit' : ''}`}>
              <article className="ib-card dv-fix-card">
                <div className="dv-fix-body">
                  <h3 className="dv-fix-title">{items[2].title}</h3>
                  <p className="dv-fix-text">{items[2].text}</p>
                  <PhotoDeck />
                </div>
              </article>
            </div>
          )}
        </div>
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
