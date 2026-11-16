import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { SpeakerWaveIcon } from '@heroicons/react/24/outline';
import { canSpeak, hush, say, type Lang } from './speech';
import { useInView } from './useInView';
import Outro from './Outro';

/**
 * The first deep problem from the iceberg, speed: the same thought takes
 * fewer syllables in English than in Russian, so each English syllable
 * carries more and goes by faster. Three everyday sentences, each a unit of
 * a Russian line and its English twin. Every syllable sits on its own tinted
 * patch (green for Russian, blue for English, two alternating shades so the
 * syllables inside one word stay apart), and the line ends in "= N". Each
 * line plays when tapped. The sentences are language data, so they stay out
 * of the locales; in-word syllable breaks are marked with "·", and a word
 * with no vowel (the Russian "с") carries no syllable of its own.
 */

interface Line {
  text: string;
  /** The sentence with its in-word syllable breaks marked by "·". */
  marked: string;
}
const PAIRS: { ru: Line; en: Line }[] = [
  {
    ru: { text: 'Спасибо, я тебе перезвоню.', marked: 'Спа·си·бо, я те·бе пе·ре·зво·ню.' },
    en: { text: 'Thanks, I’ll call you back.', marked: 'Thanks, I’ll call you back.' },
  },
  {
    ru: { text: 'Не могли бы вы мне с этим помочь?', marked: 'Не мог·ли бы вы мне с э·тим по·мочь?' },
    en: { text: 'Could you help me with this?', marked: 'Could you help me with this?' },
  },
  {
    ru: { text: 'Что ты хочешь делать сегодня вечером?', marked: 'Что ты хо·чешь де·лать се·год·ня ве·че·ром?' },
    en: { text: 'What do you want to do tonight?', marked: 'What do you want to do to·night?' },
  },
];

const VOWEL = /[aeiouyаеёиоуыэюя]/i;
/** Each word as its syllables, with the punctuation that trails it kept apart. */
function syllables(marked: string) {
  return marked.split(' ').map((word) => {
    const m = word.match(/^(.*?)([.,?!]*)$/) as RegExpMatchArray;
    return { parts: m[1].split('·'), tail: m[2] };
  });
}
const countOf = (marked: string) => syllables(marked).reduce((n, w) => n + w.parts.filter((p) => VOWEL.test(p)).length, 0);
const TOTAL_RU = PAIRS.reduce((n, p) => n + countOf(p.ru.marked), 0);
const TOTAL_EN = PAIRS.reduce((n, p) => n + countOf(p.en.marked), 0);

export default function Speed() {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState<string | null>(null);
  const [ref, seen] = useInView<HTMLDivElement>(0.2);

  useEffect(() => () => hush(), []);

  const row = (id: string, line: Line, lang: Lang, cls: string) => {
    let k = 0; // the syllable's place in the line, for the reveal stagger
    const count = countOf(line.marked);
    const inner = (
      <>
        <span className="ib-sp-text" lang={lang.slice(0, 2)} aria-hidden="true">
          {syllables(line.marked).map((w, wi) => (
            <span key={wi} className="ib-sp-word">
              {w.parts.map((p, pi) => VOWEL.test(p)
                ? <span key={pi} className={`ib-sp-syl${pi % 2 ? ' ib-sp-alt' : ''}`} style={{ transitionDelay: `${0.2 + k++ * 0.06}s` }}>{p}</span>
                : <span key={pi}>{p}</span>)}
              {w.tail}
            </span>
          ))}
        </span>
        <span className="ib-sp-eq" aria-hidden="true">= <b>{count}</b></span>
        {canSpeak && <SpeakerWaveIcon className="ib-say-ico" aria-hidden="true" />}
      </>
    );
    const label = `${line.text} = ${t('iceberg.speed.syllables', { count })}`;
    return canSpeak ? (
      <button type="button" className={`ib-sp-row ${cls}${playing === id ? ' ib-playing' : ''}`} aria-label={label}
        onClick={() => { setPlaying(id); say(line.text, lang, () => setPlaying((p) => (p === id ? null : p)), 1); }}>
        {inner}
      </button>
    ) : (
      <span className={`ib-sp-row ${cls}`} role="img" aria-label={label}>{inner}</span>
    );
  };

  return (
    <section className="ib-sec ib-layer ib-speed" aria-labelledby="ib-speed-title">
      <div className="ib-wrap">
        <h2 id="ib-speed-title" className="ib-h2">{t('iceberg.speed.title')}</h2>

        <div ref={ref} className={`ib-sp-pairs${seen ? ' in' : ''}`}>
          {PAIRS.map((p, i) => (
            <article key={i} className="ib-card ib-sp-pair">
              <div className="ib-sp-lines">
                {row(`ru${i}`, p.ru, 'ru-RU', 'ib-sp-ru')}
                {row(`en${i}`, p.en, 'en-US', 'ib-sp-en')}
              </div>
            </article>
          ))}
        </div>

        <Outro>
          <Trans t={t} i18nKey="iceberg.speed.total" components={{ hi: <span className="ib-sp-ratio" /> }} values={{
            ru: t('iceberg.speed.syllables', { count: TOTAL_RU }),
            en: t('iceberg.speed.syllables', { count: TOTAL_EN }),
            ratio: (TOTAL_RU / TOTAL_EN).toFixed(2),
          }} />
        </Outro>
      </div>
    </section>
  );
}
