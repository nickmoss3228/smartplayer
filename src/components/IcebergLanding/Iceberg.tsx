import { useTranslation } from 'react-i18next';
import { useInView } from './useInView';
import { EarIcon } from './EarIcon';

/**
 * The iceberg: grammar and vocabulary on the small tip above the water, and
 * deep under it understanding by ear, which rests on four things, one under
 * the other, each deeper and darker: the speed of English speech, how its
 * sounds are perceived, spelling that doesn't show the sound, and words
 * linking into one stream.
 *
 * Two stacked zones so nothing can overlap at any width: the sky with the tip
 * (a fixed-ratio SVG, its labels placed in percent), and the water below,
 * whose height follows its content (a column of labels joined by a line), with
 * the berg's body drawn behind it stretched to fit. The berg bobs; the labels
 * and the line reveal top to bottom when it comes into view.
 */

/**
 * The underwater part: a mountain, not a blob. From the waterline (y 0) its
 * flanks run out in uneven ledges and keep widening to the seabed at the
 * bottom edge (y 700), clockwise from the waterline on the left. Facets fan
 * out from CORE.
 */
const BODY: [number, number][] = [
  [326, 0], [286, 64], [262, 118], [214, 176], [200, 248], [150, 318], [138, 394],
  [84, 462], [70, 540], [22, 612], [0, 700],
  [210, 700], [420, 700], [610, 700], [800, 700], [1000, 700],
  [968, 618], [930, 548], [916, 470], [862, 400], [846, 326], [796, 262],
  [784, 190], [738, 128], [718, 60], [692, 0],
];
const CORE: [number, number] = [505, 330];
const ALPHA = BODY.slice(0, -1).map((_, i) => [0.36, 0.22, 0.3, 0.16, 0.26, 0.12, 0.2][i % 7]);

const RAYS = ['M300 0 L360 0 L240 700 L150 700Z', 'M560 0 L600 0 L640 700 L540 700Z', 'M780 0 L820 0 L960 700 L880 700Z'];

/** A wave across twice the width, so sliding it by one period loops seamlessly. */
const WAVE = (() => {
  let d = 'M-200 300';
  for (let x = -200; x < 1200; x += 100) d += ' q25 -9 50 0 t50 0';
  return d;
})();

interface Deep {
  title: string;
  lines: string[];
}
const DEEP_KEYS = ['speed', 'perception', 'spelling', 'linking'] as const;

export default function Iceberg() {
  const { t } = useTranslation();
  const [ref, seen] = useInView<HTMLDivElement>(0.2);
  const deep = DEEP_KEYS.map((k) => t(`iceberg.berg.${k}`, { returnObjects: true }) as Deep);

  return (
    <div ref={ref} className={`ib-berg${seen ? ' in' : ''}`}>
      {/* above the water: the small tip */}
      <div className="ib-berg-sky">
        <svg className="ib-berg-layer" viewBox="0 0 1000 310" aria-hidden="true" preserveAspectRatio="none">
          <defs>
            <linearGradient id="ib-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f8fbfd" />
              <stop offset="1" stopColor="#e2f0f8" />
            </linearGradient>
          </defs>
          <rect width="1000" height="300" fill="url(#ib-sky)" />
          <rect y="300" width="1000" height="10" fill="#bfe2f3" />
          <g className="ib-bob">
            <polygon points="326,300 420,174 469,102 517,36 499,300" fill="#ffffff" />
            <polygon points="420,174 469,102 450,203" fill="#f1f7fb" />
            <polygon points="499,300 517,36 568,118 551,300" fill="#e8f2f8" />
            <polygon points="551,300 568,118 616,164 692,300" fill="#cfe2ee" />
            <path className="ib-line" pathLength={1} d="M262 130 L428 186" />
            <path className="ib-line" pathLength={1} d="M738 172 L606 172" />
          </g>
          <path className="ib-wave" d={WAVE} />
        </svg>
        <div className="ib-bob ib-labels">
          <span className="ib-chip ib-top" style={{ left: '20%', top: '42%' }}>{t('iceberg.berg.grammar')}</span>
          <span className="ib-chip ib-top ib-d1" style={{ left: '80%', top: '55%' }}>{t('iceberg.berg.vocab')}</span>
        </div>
      </div>

      {/* under the water: as tall as its column of labels */}
      <div className="ib-berg-sea">
        <svg className="ib-berg-layer" viewBox="0 0 1000 700" aria-hidden="true" preserveAspectRatio="none">
          <g className="ib-rays">
            {RAYS.map((d, i) => <path key={i} d={d} fill="#ffffff" opacity={0.07} />)}
          </g>
          <defs>
            {/* the ice darkens with depth, the seabed fades into the dark */}
            <linearGradient id="ib-ice" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="700">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.45" stopColor="#a9d0e6" />
              <stop offset="1" stopColor="#123a58" />
            </linearGradient>
            <linearGradient id="ib-deep" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0.45" stopColor="#020a12" stopOpacity="0" />
              <stop offset="1" stopColor="#020a12" stopOpacity="0.75" />
            </linearGradient>
          </defs>
          <g className="ib-bob">
            {BODY.slice(0, -1).map((p, i) => {
              const q = BODY[i + 1];
              return (
                <polygon key={i} points={`${p[0]},${p[1]} ${q[0]},${q[1]} ${CORE[0]},${CORE[1]}`}
                  fill="url(#ib-ice)" fillOpacity={ALPHA[i]} stroke="url(#ib-ice)" strokeOpacity={0.22} strokeWidth={1.5} />
              );
            })}
            {/* the mountain's silhouette, so its flanks read against the dark water */}
            <polyline points={BODY.map((p) => p.join(',')).join(' ')} fill="none" stroke="#d6ecf8" strokeOpacity={0.4} strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </g>
          <rect width="1000" height="700" fill="#2a7db0" opacity={0.14} />
          <rect width="1000" height="700" fill="url(#ib-deep)" />
        </svg>

        <div className="ib-bob ib-column">
          <span className="ib-chip ib-flow ib-mid ib-d2">
            <EarIcon className="ib-chip-ico" />
            <b>{t('iceberg.berg.listening')}</b>
          </span>
          {deep.map((d, i) => (
            <div key={DEEP_KEYS[i]} className="ib-step-down">
              <span className="ib-joint" style={{ transitionDelay: `${0.9 + i * 0.45}s` }} aria-hidden="true" />
              <span className="ib-chip ib-flow ib-deep" style={{ transitionDelay: `${1.15 + i * 0.45}s` }}>
                <b className="ib-deep-t">{d.title}</b>
                {d.lines.map((line) => <span key={line} className="ib-deep-l">{line}</span>)}
              </span>
            </div>
          ))}
        </div>

        <span className="ib-bubble" style={{ left: '9%', animationDelay: '0s' }} />
        <span className="ib-bubble" style={{ left: '90%', animationDelay: '2.2s' }} />
        <span className="ib-bubble ib-bubble-s" style={{ left: '84%', animationDelay: '4.1s' }} />
        <span className="ib-bubble ib-bubble-s" style={{ left: '15%', animationDelay: '5.6s' }} />
      </div>
    </div>
  );
}
