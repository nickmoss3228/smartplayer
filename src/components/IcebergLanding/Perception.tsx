import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { SpeakerWaveIcon } from '@heroicons/react/24/outline';
import { canSpeak, hush, say } from './speech';
import { useInView } from './useInView';
import { EarIcon } from './EarIcon';

/**
 * The second layer of the iceberg, perception: English has sounds Russian
 * doesn't, and the ear swaps each for the nearest Russian one. So two English
 * words become one Russian-sounding word, and the tongue says them the same
 * way too. About 2/3 of English sounds have no exact Russian match (all the
 * vowels: Russian has no length or diphthongs; and θ ð w ŋ h ɹ). Four minimal pairs, each word playable, with what a Russian ear
 * hears, grouped under the two reasons the ear merges them: sounds Russian
 * lacks, and length that changes the meaning. The words and transcriptions are
 * language data and stay in code; the reason texts and notes come from the
 * locales, in the same order.
 */

interface Word {
  w: string;
  ipa: string;
}
type Pair = { a: Word; b: Word; heard: string };
// Grouped by the two reasons, in the order of iceberg.perception.reasons.
// Each pair's note comes from that reason's "notes", in the same order.
const REASONS: Pair[][] = [
  // 1. Sounds Russian has nothing like.
  [
    { a: { w: 'sink', ipa: 'sɪŋk' }, b: { w: 'think', ipa: 'θɪŋk' }, heard: 'синк' },
    { a: { w: 'vest', ipa: 'vest' }, b: { w: 'west', ipa: 'west' }, heard: 'вэст' },
  ],
  // 2. Length changes the meaning.
  [
    { a: { w: 'ship', ipa: 'ʃɪp' }, b: { w: 'sheep', ipa: 'ʃiːp' }, heard: 'шип' },
    { a: { w: 'full', ipa: 'fʊl' }, b: { w: 'fool', ipa: 'fuːl' }, heard: 'фул' },
  ],
];

export default function Perception() {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState<string | null>(null);
  const [ref, seen] = useInView<HTMLDivElement>(0.15);
  const reasons = t('iceberg.perception.reasons', { returnObjects: true }) as { title: string; text: string; notes: string[] }[];

  useEffect(() => () => hush(), []);

  const word = (id: string, x: Word) => {
    const inner = (
      <>
        <span className="ib-pc-w" lang="en">{x.w}</span>
        <span className="ib-pc-ipa">[{x.ipa}]</span>
        {canSpeak && <SpeakerWaveIcon className="ib-say-ico" aria-hidden="true" />}
      </>
    );
    return canSpeak ? (
      <button type="button" className={`ib-pc-word${playing === id ? ' ib-playing' : ''}`} aria-label={x.w}
        onClick={() => { setPlaying(id); say(x.w, 'en-US', () => setPlaying((p) => (p === id ? null : p))); }}>
        {inner}
      </button>
    ) : (
      <span className="ib-pc-word">{inner}</span>
    );
  };

  return (
    <section className="ib-sec ib-layer ib-perception" aria-labelledby="ib-perception-title">
      <div className="ib-wrap">
        <p className="ib-kicker">{t('iceberg.berg.perception.title')}</p>
        <h2 id="ib-perception-title" className="ib-h2"><Trans t={t} i18nKey="iceberg.perception.title" components={{ hi: <span className="ib-pc-share" /> }} /></h2>
        <p className="ib-link-lead">{t('iceberg.perception.text')}</p>

        <div ref={ref} className={`ib-pc-reasons${seen ? ' in' : ''}`}>
          {REASONS.map((pairs, r) => (
            <div key={r} className="ib-pc-reason">
              <h3 className="ib-pc-rtitle"><span className="ib-pc-rnum" aria-hidden="true">{r + 1}</span>{reasons[r]?.title}</h3>
              <p className="ib-pc-rtext">{reasons[r]?.text}</p>
              <div className="ib-pc-grid">
                {pairs.map((p, i) => (
                  <article key={p.a.w} className="ib-card ib-pc-pair" style={{ transitionDelay: `${(r * 2 + i) * 0.08}s` }}>
                    <div className="ib-pc-words">
                      {word(`${r}${i}a`, p.a)}
                      <span className="ib-pc-ne" aria-hidden="true">≠</span>
                      {word(`${r}${i}b`, p.b)}
                    </div>
                    <p className="ib-pc-heard">
                      <EarIcon className="ib-pc-ear" />
                      <span>{t('iceberg.perception.heard')}</span>
                      <b lang="ru">«{p.heard}»</b>
                    </p>
                    <p className="ib-pc-note">{reasons[r]?.notes?.[i]}</p>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="ib-outro">{t('iceberg.perception.outro')}</p>
      </div>
    </section>
  );
}
