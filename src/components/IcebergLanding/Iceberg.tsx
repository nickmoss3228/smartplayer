import { useTranslation } from 'react-i18next';
import { SpeakerWaveIcon } from '@heroicons/react/24/outline';
import { useInView } from './useInView';

/**
 * The iceberg: grammar and vocabulary above the water, listening just below it,
 * and the two things deeper than anything: word linking and how words sound.
 * Drawn in one 1000×1000 box: three SVG layers (sky and sea, the berg, the
 * water's surface over it) and the labels as HTML on top, placed in percent of
 * that box so they line up at any width. The labels get their own bobbing
 * layer above the water so the tint does not dull them. The berg bobs; the labels and the
 * branches reveal top to bottom when the iceberg comes into view.
 */

/** The underwater outline, clockwise from the waterline on the left. */
const BODY: [number, number][] = [
  [326, 300], [250, 398], [182, 556], [204, 716], [322, 874], [500, 958],
  [678, 888], [808, 742], [846, 560], [784, 402], [692, 300],
];
const CORE: [number, number] = [505, 575];
const ALPHA = [0.36, 0.24, 0.3, 0.17, 0.11, 0.15, 0.09, 0.19, 0.27, 0.32];

const RAYS = ['M300 300 L360 300 L240 1000 L150 1000Z', 'M560 300 L600 300 L640 1000 L540 1000Z', 'M780 300 L820 300 L960 1000 L880 1000Z'];

/** A wave across twice the width, so sliding it by one period loops seamlessly. */
const WAVE = (() => {
  let d = 'M-200 300';
  for (let x = -200; x < 1200; x += 100) d += ` q25 -9 50 0 t50 0`;
  return d;
})();

export default function Iceberg() {
  const { t } = useTranslation();
  const [ref, seen] = useInView<HTMLDivElement>(0.3);

  return (
    <div ref={ref} className={`ib-berg${seen ? ' in' : ''}`}>
      <svg className="ib-berg-layer" viewBox="0 0 1000 1000" aria-hidden="true" preserveAspectRatio="none">
        <defs>
          <linearGradient id="ib-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f8fbfd" />
            <stop offset="1" stopColor="#e2f0f8" />
          </linearGradient>
          <linearGradient id="ib-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#bfe2f3" />
            <stop offset="0.3" stopColor="#5fa8cf" />
            <stop offset="0.68" stopColor="#1d5b86" />
            <stop offset="1" stopColor="#0b2a42" />
          </linearGradient>
        </defs>
        <rect width="1000" height="300" fill="url(#ib-sky)" />
        <rect y="300" width="1000" height="700" fill="url(#ib-sea)" />
        <g className="ib-rays">
          {RAYS.map((d, i) => (
            <path key={i} d={d} fill="#ffffff" opacity={0.07} />
          ))}
        </g>
      </svg>

      <div className="ib-bob">
        <svg className="ib-berg-layer" viewBox="0 0 1000 1000" aria-hidden="true" preserveAspectRatio="none">
          {/* under the water: translucent facets around one core point */}
          {BODY.slice(0, -1).map((p, i) => {
            const q = BODY[i + 1];
            return (
              <polygon
                key={i}
                points={`${p[0]},${p[1]} ${q[0]},${q[1]} ${CORE[0]},${CORE[1]}`}
                fill="#ffffff"
                fillOpacity={ALPHA[i]}
                stroke="#ffffff"
                strokeOpacity={0.18}
                strokeWidth={1.5}
              />
            );
          })}
          {/* the tip */}
          <polygon points="326,300 420,174 469,102 517,36 499,300" fill="#ffffff" />
          <polygon points="420,174 469,102 450,203" fill="#f1f7fb" />
          <polygon points="499,300 517,36 568,118 551,300" fill="#e8f2f8" />
          <polygon points="551,300 568,118 616,164 692,300" fill="#cfe2ee" />
          {/* leader lines and branches */}
          <path className="ib-line" pathLength={1} d="M262 150 L428 186" />
          <path className="ib-line" pathLength={1} d="M738 186 L606 172" />
          <path className="ib-branch" pathLength={1} d="M500 488 C500 610 280 600 280 728" />
          <path className="ib-branch" pathLength={1} d="M500 488 C500 610 720 600 720 728" />
        </svg>

      </div>

      <svg className="ib-berg-layer ib-surface" viewBox="0 0 1000 1000" aria-hidden="true" preserveAspectRatio="none">
        <rect y="300" width="1000" height="700" fill="#2a7db0" opacity={0.14} />
        <path className="ib-wave" d={WAVE} />
      </svg>

      {/* the labels bob with the berg but sit above the water layer, so they stay crisp */}
      <div className="ib-bob ib-labels">
        <span className="ib-chip ib-top" style={{ left: '20%', top: '13%' }}>{t('iceberg.berg.grammar')}</span>
        <span className="ib-chip ib-top ib-d1" style={{ left: '80%', top: '17%' }}>{t('iceberg.berg.vocab')}</span>
        <span className="ib-chip ib-mid ib-d2" style={{ left: '50%', top: '44%' }}>
          <SpeakerWaveIcon className="ib-chip-ico" aria-hidden="true" />
          <span>
            <b>{t('iceberg.berg.listening')}</b>
            <small>{t('iceberg.berg.listeningSub')}</small>
          </span>
        </span>
        <span className="ib-chip ib-deep ib-d3" style={{ left: '28%', top: '80%' }}>
          <b>{t('iceberg.berg.linking')}</b>
          <small lang="en">{t('iceberg.berg.linkingEx')}</small>
        </span>
        <span className="ib-chip ib-deep ib-d4" style={{ left: '72%', top: '80%' }}>
          <b>{t('iceberg.berg.sound')}</b>
          <small>{t('iceberg.berg.soundEx')}</small>
        </span>
      </div>

      <span className="ib-depth ib-depth-up">{t('iceberg.berg.above')}</span>
      <span className="ib-depth ib-depth-down">{t('iceberg.berg.below')}</span>
      <span className="ib-bubble" style={{ left: '14%', animationDelay: '0s' }} />
      <span className="ib-bubble" style={{ left: '88%', animationDelay: '2.2s' }} />
      <span className="ib-bubble ib-bubble-s" style={{ left: '60%', animationDelay: '4.1s' }} />
      <span className="ib-bubble ib-bubble-s" style={{ left: '35%', animationDelay: '5.6s' }} />
    </div>
  );
}
