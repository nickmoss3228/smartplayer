import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon } from '@heroicons/react/24/outline';
import { useInView } from './useInView';

/**
 * How to fight it: five steps as one pipeline, each with a small animated
 * drawing and the malako feature that does it. Then the claim: malako covers
 * all five and does them for you.
 */

interface Item {
  title: string;
  text: string;
  app: string;
}

const BARS = [18, 34, 26, 46, 30, 14, 38, 52, 28, 20, 42, 24];

/** The five drawings, 120×120 each. */
const GLYPHS: ReactNode[] = [
  // 1. sound goes into the head, not letters
  <svg viewBox="0 0 120 120" key="vocab">
    <text x="66" y="24" className="g-abc">abc</text>
    <line x1="63" y1="18" x2="102" y2="18" className="g-strike" />
    <g className="g-arcs">
      <path d="M34 54 a8 8 0 0 1 0 16" />
      <path d="M27 46 a16 16 0 0 1 0 32" />
      <path d="M20 38 a24 24 0 0 1 0 48" />
    </g>
    <circle cx="84" cy="64" r="22" className="g-head" />
    <path d="M62 57 c-7 0 -7 14 0 14 M77 86 v12 M91 86 v12" className="g-head" />
    <circle cx="86" cy="62" r="4" className="g-dot g-d1" />
    <circle cx="96" cy="56" r="3" className="g-dot g-d2" />
    <circle cx="80" cy="52" r="3" className="g-dot g-d3" />
  </svg>,
  // 2. one stream cut into pieces
  <svg viewBox="0 0 120 120" key="atoms">
    {BARS.map((h, i) => (
      <rect
        key={i}
        x={10 + i * 8.6}
        y={60 - h / 2}
        width="5"
        height={h}
        rx="2.5"
        className={`g-bar g-part${i < 4 ? 0 : i < 8 ? 1 : 2}`}
      />
    ))}
    <line x1="44" y1="22" x2="44" y2="98" className="g-cut g-cut1" />
    <line x1="78.5" y1="22" x2="78.5" y2="98" className="g-cut g-cut2" />
  </svg>,
  // 3. the same wave, stretched out
  <svg viewBox="0 0 120 120" key="slow">
    <g className="g-stretch">
      <path d="M10 60 q7 -26 14 0 t14 0 t14 0 t14 0 t14 0 t14 0 t14 0" className="g-wave" />
    </g>
    <text x="60" y="104" className="g-speed" textAnchor="middle">0.65×</text>
  </svg>,
  // 4. three times round
  <svg viewBox="0 0 120 120" key="three">
    <g className="g-spin">
      <path d="M60 22 a36 36 0 1 1 -34 24" className="g-ring" />
      <path d="M18 40 l8 7 l6 -9" className="g-ring" />
    </g>
    <text x="60" y="70" className="g-three" textAnchor="middle">×3</text>
    <circle cx="44" cy="108" r="4" className="g-tick g-t1" />
    <circle cx="60" cy="108" r="4" className="g-tick g-t2" />
    <circle cx="76" cy="108" r="4" className="g-tick g-t3" />
  </svg>,
  // 5. say it back
  <svg viewBox="0 0 120 120" key="say">
    <rect x="50" y="26" width="20" height="40" rx="10" className="g-mic" />
    <path d="M40 56 a20 20 0 0 0 40 0 M60 76 v14 M48 92 h24" className="g-mic-stand" />
    <g className="g-out">
      <path d="M30 40 a24 24 0 0 0 0 30" />
      <path d="M90 40 a24 24 0 0 1 0 30" />
      <path d="M20 32 a36 36 0 0 0 0 46" />
      <path d="M100 32 a36 36 0 0 1 0 46" />
    </g>
  </svg>,
];

export default function Steps() {
  const { t } = useTranslation();
  const items = t('iceberg.steps.items', { returnObjects: true }) as Item[];
  const [ref, seen] = useInView<HTMLOListElement>(0.15);

  return (
    <section className="ib-sec ib-steps" aria-labelledby="ib-steps-title">
      <div className="ib-wrap">
        <p className="ib-micro ib-green">{t('iceberg.steps.micro')}</p>
        <h2 id="ib-steps-title" className="ib-h2">{t('iceberg.steps.title')}</h2>

        <ol ref={ref} className={`ib-pipe${seen ? ' in' : ''}`}>
          {items.map((it, i) => (
            <li key={i} className="ib-step" style={{ transitionDelay: `${i * 0.12}s` }}>
              <div className="ib-glyph" aria-hidden="true">
                {GLYPHS[i]}
                <span className="ib-step-n">{i + 1}</span>
              </div>
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
            </li>
          ))}
        </ol>

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
  );
}
