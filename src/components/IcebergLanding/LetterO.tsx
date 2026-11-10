import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRightIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline';
import { canSpeak, hush, say, type Lang } from './speech';
import { useInView } from './useInView';

/**
 * The letter "o" in Russian and in English. Russian: two sounds and one rule
 * (unstressed "о" is said "а": «молоко» → «малако», hence the name). English:
 * eight sounds around one letter (General American, as the en-US voice says
 * them). Every word is a button that says it (speech.ts). The outro closes the
 * "how words sound" part; word linking follows in Linking.tsx.
 */

interface RuWord {
  written: string;
  /** Index of the stressed «о»: every other «о» is said «а». */
  stress: number;
}
const RU: RuWord[] = [
  { written: 'молоко', stress: 5 },
  { written: 'вода', stress: -1 },
  { written: 'дом', stress: 1 },
];

interface EnWord {
  word: string;
  /** Where the "o" is, and how many letters make the vowel. */
  at: number;
  len?: number;
  ipa: string;
}
/** Clockwise around the letter, starting top left. */
const EN: EnWord[] = [
  { word: 'hot', at: 1, ipa: 'ɑ' },
  { word: 'do', at: 1, ipa: 'uː' },
  { word: 'go', at: 1, ipa: 'oʊ' },
  { word: 'love', at: 1, ipa: 'ʌ' },
  { word: 'more', at: 1, ipa: 'ɔ' },
  { word: 'wolf', at: 1, ipa: 'ʊ' },
  { word: 'lemon', at: 3, ipa: 'ə' },
  { word: 'women', at: 1, ipa: 'ɪ' },
];
/** Grid cells for the eight words (row, column), clockwise from the top left; the letter sits in 2/2. */
const CELL: [number, number][] = [[1, 1], [1, 2], [1, 3], [2, 3], [3, 3], [3, 2], [3, 1], [2, 1]];

function ruWritten(w: RuWord): ReactNode[] {
  return [...w.written].map((ch, i) =>
    ch === 'о' ? (
      <span key={i} className={i === w.stress ? 'ib-o-stress' : 'ib-o-weak'}>{ch}</span>
    ) : (
      ch
    ),
  );
}

function ruHeard(w: RuWord): ReactNode[] {
  return [...w.written].map((ch, i) => {
    if (ch !== 'о') return ch;
    return i === w.stress ? (
      <span key={i} className="ib-o-stress">о</span>
    ) : (
      <span key={i} className="ib-a">а</span>
    );
  });
}

function enWord(w: EnWord): ReactNode {
  const len = w.len ?? 1;
  return (
    <>
      {w.word.slice(0, w.at)}
      <span className="ib-o-weak">{w.word.slice(w.at, w.at + len)}</span>
      {w.word.slice(w.at + len)}
    </>
  );
}

export default function LetterO() {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState<string | null>(null);
  const [ref, seen] = useInView<HTMLDivElement>(0.2);

  useEffect(() => () => hush(), []);

  const play = (key: string, text: string, lang: Lang) => {
    setPlaying(key);
    say(text, lang, () => setPlaying((p) => (p === key ? null : p)));
  };

  /** A word that says itself when pressed (a plain span where the browser cannot speak). */
  // A render helper, not a component: a component declared here would remount
  // on every render and drop the keyboard focus from the word just pressed.
  const word = (id: string, text: string, lang: Lang, className: string, children: ReactNode) =>
    canSpeak ? (
      <button
        type="button"
        className={`${className}${playing === id ? ' ib-playing' : ''}`}
        onClick={() => play(id, text, lang)}
        aria-label={text}
      >
        {children}
      </button>
    ) : (
      <span className={className}>{children}</span>
    );

  return (
    <section className="ib-sec ib-letter" aria-labelledby="ib-letter-title">
      <div className="ib-wrap">
        <p className="ib-micro ib-green">{t('iceberg.letter.micro')}</p>
        <h2 id="ib-letter-title" className="ib-h2">{t('iceberg.letter.title')}</h2>
        <p className={`ib-tap${canSpeak ? '' : ' ib-tap-off'}`}>
          <SpeakerWaveIcon className="ib-tap-ico" aria-hidden="true" />
          {canSpeak ? t('iceberg.letter.tap') : t('iceberg.letter.noVoice')}
        </p>

        <div ref={ref} className={`ib-letter-grid${seen ? ' in' : ''}`}>
          {/* Russian */}
          <article className="ib-card ib-ru">
            <header className="ib-card-head">
              <p className="ib-micro">{t('iceberg.letter.ru.label')}</p>
              <p className="ib-count">
                {t('iceberg.letter.sounds', { count: 2 })} <span>{t('iceberg.letter.ru.count')}</span>
              </p>
            </header>
            <div className="ib-ru-letter" aria-hidden="true">
              <span className="ib-big-o">О</span>
              <span className="ib-fork">
                <span><b>о</b></span>
                <span><b className="ib-a">а</b></span>
              </span>
            </div>
            <div className="ib-ru-head" aria-hidden="true">
              <span>{t('iceberg.letter.ru.written')}</span>
              <span />
              <span>{t('iceberg.letter.ru.heard')}</span>
            </div>
            <ul className="ib-ru-rows">
              {RU.map((w, i) => (
                <li key={w.written} style={{ transitionDelay: `${0.15 + i * 0.12}s` }}>
                  {word(`ru-${i}`, w.written, 'ru-RU', 'ib-ru-row', (
                    <>
                      <span className="ib-ru-w">{ruWritten(w)}</span>
                      <ArrowRightIcon className="ib-ru-arrow" aria-hidden="true" />
                      <span className="ib-ru-w ib-ru-heard">{ruHeard(w)}</span>
                      <SpeakerWaveIcon className="ib-say-ico" aria-hidden="true" />
                    </>
                  ))}
                </li>
              ))}
            </ul>
            <p className="ib-card-text">{t('iceberg.letter.ru.rule')}</p>
          </article>

          {/* English */}
          <article className="ib-card ib-en">
            <header className="ib-card-head">
              <p className="ib-micro">{t('iceberg.letter.en.label')}</p>
              <p className="ib-count">
                {t('iceberg.letter.sounds', { count: EN.length })} <span>{t('iceberg.letter.en.count')}</span>
              </p>
            </header>
            <div className="ib-en-grid">
              <svg className="ib-en-lines" viewBox="0 0 300 300" preserveAspectRatio="none" aria-hidden="true">
                {CELL.map(([r, c], i) => (
                  <line key={i} x1={150} y1={150} x2={(c - 0.5) * 100} y2={(r - 0.5) * 100} pathLength={1} style={{ transitionDelay: `${0.1 + i * 0.07}s` }} />
                ))}
              </svg>
              <span className="ib-big-o ib-en-o" style={{ gridRow: 2, gridColumn: 2 }} aria-hidden="true">O</span>
              {EN.map((w, i) => (
                <span key={w.word} className="ib-en-cell" style={{ gridRow: CELL[i][0], gridColumn: CELL[i][1], transitionDelay: `${0.35 + i * 0.07}s` }}>
                  {word(`en-${w.word}`, w.word, 'en-US', 'ib-en-word', (
                    <>
                      <span className="ib-en-w" lang="en">{enWord(w)}</span>
                      <span className="ib-ipa">[{w.ipa}]</span>
                    </>
                  ))}
                </span>
              ))}
            </div>
            <p className="ib-card-text">{t('iceberg.letter.en.rule')}</p>
          </article>
        </div>

        <p className="ib-outro">{t('iceberg.letter.outro')}</p>
      </div>
    </section>
  );
}
