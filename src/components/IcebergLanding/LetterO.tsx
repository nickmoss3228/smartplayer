import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SpeakerWaveIcon } from '@heroicons/react/24/outline';
import { canSpeak, hush, say, type Lang } from './speech';
import { useInView } from './useInView';

/**
 * The letter "o" in Russian and in English. Russian: two sounds and one rule
 * (unstressed "о" is said "а": «молоко» → «малако», hence the name), one word each. English:
 * eight sounds around one letter (General American, as the en-US voice says
 * them). Every word is a button that says it (speech.ts). The outro closes the
 * "how words sound" part; word linking follows in Linking.tsx.
 */

interface EnWord {
  word: string;
  /** Where the "o" is (or each "o" that makes the sound), and how many letters make the vowel. */
  at: number | number[];
  len?: number;
  ipa: string;
  /** One transcription per marked "o", written under each letter instead of one [ipa] below the word. */
  ipas?: string[];
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
/**
 * The two Russian sounds of «о», one word each, drawn like the English words:
 * stressed «о» is [o]; unstressed it is said [a] («молоко» → «малако»).
 * «молоко» marks all three «о», each with its own sound under it.
 */
const RU_SOUNDS: EnWord[] = [
  { word: 'кот', at: 1, ipa: 'o' },
  { word: 'молоко', at: [1, 3, 5], ipa: 'a', ipas: ['a', 'a', 'o'] },
];
/** Grid cells for the eight words (row, column), clockwise from the top left; the letter sits in 2/2. */
const CELL: [number, number][] = [[1, 1], [1, 2], [1, 3], [2, 3], [3, 3], [3, 2], [3, 1], [2, 1]];

/** A word with its «o» marked in red (Russian or English). */
function enWord(w: EnWord): ReactNode {
  const len = w.len ?? 1;
  const marks = Array.isArray(w.at) ? w.at : [w.at];
  const out: ReactNode[] = [];
  let i = 0;
  marks.forEach((at, m) => {
    if (at > i) out.push(w.word.slice(i, at));
    const letter = w.word.slice(at, at + len);
    out.push(
      w.ipas ? (
        <span key={at} className="ib-o-col">
          <span className="ib-o-weak">{letter}</span>
          <span className="ib-ipa">[{w.ipas[m]}]</span>
        </span>
      ) : (
        <span key={at} className="ib-o-weak">{letter}</span>
      ),
    );
    i = at + len;
  });
  if (i < w.word.length) out.push(w.word.slice(i));
  return out;
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

  const ruSound = (i: number) => {
    const w = RU_SOUNDS[i];
    return word(`ru-s-${i}`, w.word, 'ru-RU', 'ib-en-word', (
      <>
        <span className={`ib-en-w${w.ipas ? ' ib-en-w-cols' : ''}`} lang="ru">{enWord(w)}</span>
        {!w.ipas && <span className="ib-ipa">[{w.ipa}]</span>}
      </>
    ));
  };

  return (
    <section className="ib-sec ib-layer ib-letter" aria-labelledby="ib-letter-title">
      <div className="ib-wrap">
        <p className="ib-kicker">{t('iceberg.berg.spelling.title')}</p>
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
            {/* The same tile as the English "O", with a word for each of its two sounds. */}
            <div className="ib-ru-web">
              <span className="ib-ru-sound">{ruSound(0)}</span>
              <span className="ib-ru-link" aria-hidden="true" />
              <span className="ib-big-o ib-o-disc" aria-hidden="true">О</span>
              <span className="ib-ru-link ib-ru-link-r" aria-hidden="true" />
              <span className="ib-ru-sound">{ruSound(1)}</span>
            </div>
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
              <span className="ib-big-o ib-o-disc ib-en-o" style={{ gridRow: 2, gridColumn: 2 }} aria-hidden="true">O</span>
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
            {t('iceberg.letter.en.rule').trim() && <p className="ib-card-text">{t('iceberg.letter.en.rule')}</p>}
          </article>
        </div>

        <p className="ib-outro">{t('iceberg.letter.outro')}</p>
      </div>
    </section>
  );
}
