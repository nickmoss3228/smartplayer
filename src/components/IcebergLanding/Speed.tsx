import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { SpeakerWaveIcon } from '@heroicons/react/24/outline';
import { canSpeak, hush, say, type Lang } from './speech';
import { useInView } from './useInView';

/**
 * The first deep problem from the iceberg, speed: the same thought takes
 * fewer syllables in English than in Russian, so each English syllable
 * carries more and goes by faster. Three everyday sentences side by side,
 * syllables counted and drawn as a row of dots each, every sentence playable.
 * The sentences are language data, so they stay out of the locales; in-word
 * syllable breaks are marked with "·".
 */

interface Line {
  text: string;
  /** The sentence with its syllables marked, for display. */
  marked: string;
  count: number;
}
const PAIRS: { ru: Line; en: Line }[] = [
  {
    ru: { text: 'Спасибо, я тебе перезвоню.', marked: 'Спа·си·бо, я те·бе пе·ре·зво·ню.', count: 10 },
    en: { text: 'Thanks, I’ll call you back.', marked: 'Thanks, I’ll call you back.', count: 5 },
  },
  {
    ru: { text: 'Не могли бы вы мне с этим помочь?', marked: 'Не мог·ли бы вы мне с э·тим по·мочь?', count: 10 },
    en: { text: 'Could you help me with this?', marked: 'Could you help me with this?', count: 6 },
  },
  {
    ru: { text: 'Что ты хочешь делать сегодня вечером?', marked: 'Что ты хо·чешь де·лать се·год·ня ве·че·ром?', count: 12 },
    en: { text: 'What do you want to do tonight?', marked: 'What do you want to do to·night?', count: 8 },
  },
];
const MAX = Math.max(...PAIRS.map((p) => p.ru.count));
const TOTAL_RU = PAIRS.reduce((n, p) => n + p.ru.count, 0);
const TOTAL_EN = PAIRS.reduce((n, p) => n + p.en.count, 0);

export default function Speed() {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState<string | null>(null);
  const [ref, seen] = useInView<HTMLDivElement>(0.2);

  useEffect(() => () => hush(), []);

  const row = (id: string, line: Line, lang: Lang, cls: string) => {
    const inner = (
      <>
        <span className="ib-sp-lang">{lang === 'ru-RU' ? 'RU' : 'EN'}</span>
        <span className="ib-sp-text" lang={lang.slice(0, 2)}>{line.marked}</span>
        <span className="ib-sp-dots" aria-hidden="true" style={{ ['--w' as string]: `${(line.count / MAX) * 100}%` }}>
          {Array.from({ length: line.count }, (_, k) => <i key={k} style={{ transitionDelay: `${0.25 + k * 0.07}s` }} />)}
        </span>
        <span className="ib-sp-count">
          {t('iceberg.speed.syllables', { count: line.count })}
          {canSpeak && <SpeakerWaveIcon className="ib-say-ico" aria-hidden="true" />}
        </span>
      </>
    );
    return canSpeak ? (
      <button type="button" className={`ib-sp-row ${cls}${playing === id ? ' ib-playing' : ''}`} aria-label={line.text}
        onClick={() => { setPlaying(id); say(line.text, lang, () => setPlaying((p) => (p === id ? null : p)), 1); }}>
        {inner}
      </button>
    ) : (
      <span className={`ib-sp-row ${cls}`}>{inner}</span>
    );
  };

  return (
    <section className="ib-sec ib-layer ib-speed" aria-labelledby="ib-speed-title">
      <div className="ib-wrap">
        <p className="ib-kicker">{t('iceberg.berg.speed.title')}</p>
        <h2 id="ib-speed-title" className="ib-h2">{t('iceberg.speed.title')}</h2>
        <p className="ib-link-lead">{t('iceberg.speed.text')}</p>

        <div ref={ref} className={`ib-sp-pairs${seen ? ' in' : ''}`}>
          {PAIRS.map((p, i) => (
            <article key={i} className="ib-sp-pair">
              {row(`ru${i}`, p.ru, 'ru-RU', 'ib-sp-ru')}
              {row(`en${i}`, p.en, 'en-US', 'ib-sp-en')}
            </article>
          ))}
        </div>

        <p className="ib-outro">
          <Trans t={t} i18nKey="iceberg.speed.total" components={{ hi: <span className="ib-sp-ratio" /> }} values={{
            ru: t('iceberg.speed.syllables', { count: TOTAL_RU }),
            en: t('iceberg.speed.syllables', { count: TOTAL_EN }),
            ratio: (TOTAL_RU / TOTAL_EN).toFixed(2),
          }} />
        </p>
      </div>
    </section>
  );
}
