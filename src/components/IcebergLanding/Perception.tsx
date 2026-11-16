import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { SpeakerWaveIcon } from '@heroicons/react/24/outline';
import { canSpeak, hush, say } from './speech';
import { useInView } from './useInView';
import { EarIcon } from './EarIcon';
import Outro from './Outro';

/**
 * The second layer of the iceberg, perception: English has sounds Russian
 * doesn't, and the ear swaps each for the nearest Russian one. So two English
 * words become one Russian-sounding word, and the tongue says them the same
 * way too. About 2/3 of English sounds have no exact Russian match (all the
 * vowels: Russian has no length or diphthongs; and θ ð w ŋ h ɹ). Four minimal
 * pairs under the two reasons the ear merges them (sounds Russian lacks, and
 * length that changes the meaning); each reason's pairs share one card, a row
 * button per pair, side by side, that says both words; under them one line,
 * "a Russian ear hears" and what it hears for each pair, in green with the
 * swapped sound bold. The words are language data and stay in code; the reason texts come
 * from the locales, in the same order.
 */

/** `heard`: what a Russian ear hears, the swapped sound in [brackets] (shown bold). */
type Pair = { a: string; b: string; heard: string };
// Grouped by the two reasons, in the order of iceberg.perception.reasons.
const REASONS: Pair[][] = [
  // 1. Sounds Russian has nothing like.
  [
    { a: 'sink', b: 'think', heard: '[с]инк' },
    { a: 'vest', b: 'west', heard: '[в]эст' },
  ],
  // 2. Length changes the meaning.
  [
    { a: 'ship', b: 'sheep', heard: 'ш[и]п' },
    { a: 'full', b: 'fool', heard: 'ф[у]л' },
  ],
];

export default function Perception() {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState<string | null>(null);
  const [ref, seen] = useInView<HTMLDivElement>(0.15);
  const reasons = t('iceberg.perception.reasons', { returnObjects: true }) as { title: string; text: string }[];

  useEffect(() => () => hush(), []);

  /** One button per pair: both words, said one after the other. */
  const pair = (id: string, p: Pair) => {
    const inner = (
      <>
        <span className="ib-pc-w" lang="en">{p.a}</span>
        <span className="ib-pc-dash" aria-hidden="true">–</span>
        <span className="ib-pc-w" lang="en">{p.b}</span>
        {canSpeak && <SpeakerWaveIcon className="ib-say-ico" aria-hidden="true" />}
      </>
    );
    return canSpeak ? (
      <button key={id} type="button" className={`ib-pc-word${playing === id ? ' ib-playing' : ''}`} aria-label={`${p.a}, ${p.b}`}
        onClick={() => { setPlaying(id); say(`${p.a}. ${p.b}.`, 'en-US', () => setPlaying((x) => (x === id ? null : x))); }}>
        {inner}
      </button>
    ) : (
      <span key={id} className="ib-pc-word">{inner}</span>
    );
  };

  return (
    <section className="ib-sec ib-layer ib-perception" aria-labelledby="ib-perception-title">
      <div className="ib-wrap">
        <h2 id="ib-perception-title" className="ib-h2"><Trans t={t} i18nKey="iceberg.perception.title" components={{ hi: <span className="ib-pc-share" /> }} /></h2>

        <div ref={ref} className={`ib-pc-reasons${seen ? ' in' : ''}`}>
          {REASONS.map((pairs, r) => (
            <div key={r} className="ib-pc-reason">
              {/* no headings: the section title states the first reason, and the second opens with "Besides" */}
              <p className="ib-pc-rtext">{reasons[r]?.text}</p>
              <div className="ib-card ib-pc-pair" style={{ transitionDelay: `${r * 0.12}s` }}>
                <div className="ib-pc-row">
                  {pairs.map((p, i) => pair(`${r}${i}`, p))}
                </div>
                {/* then, once for the card: what a Russian ear hears for each pair */}
                <p className="ib-pc-heard">
                  <EarIcon className="ib-pc-ear" />
                  <span>{t('iceberg.perception.heard')}</span>
                  {pairs.map((p, i) => (
                    <span key={p.a} className="ib-pc-ru" lang="ru">
                      «{p.heard.split(/\[|\]/).map((part, k) => (k % 2 ? <b key={k}>{part}</b> : part))}»{i < pairs.length - 1 ? ',' : ''}
                    </span>
                  ))}
                </p>
              </div>
            </div>
          ))}
        </div>

        <Outro>{t('iceberg.perception.outro')}</Outro>
      </div>
    </section>
  );
}
