import { useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { SpeakerWaveIcon } from '@heroicons/react/24/outline';
import { PlayIcon, StopIcon } from '@heroicons/react/24/solid';
import { canSpeak, hush, say } from './speech';
import { useInView } from './useInView';
import { EarIcon } from './EarIcon';
import Outro from './Outro';

/**
 * The second layer of the iceberg, perception: English has sounds Russian
 * doesn't, and the ear swaps each for the nearest Russian one. So two English
 * words become one Russian-sounding word, and the tongue says them the same
 * way too. About 2/3 of English sounds have no exact Russian match (all the
 * vowels: Russian has no length or diphthongs; and θ ð w ŋ h ɹ). One minimal
 * pair under each of the two reasons the ear merges them (sounds Russian
 * lacks, and length that changes the meaning): a button that says both words,
 * and "a Russian ear hears" with the swapped sound bold.
 *
 * Then both pairs inside one sentence: "The ship sinks." / "The sheep thinks."
 * The sounds that differ are coloured (blue: vowel length, red: s against θ),
 * one play button on the right says both sentences at normal speed and then
 * both slowed down, with a pause between them, and the sentence being said
 * gets a dark-blue background (the sentences themselves are not buttons);
 * each sentence has its Russian translation under it and a picture beside it
 * (a ship going down, a sheep with a thought cloud), and the ear line says a
 * Russian ear hears the same thing twice. The English is language data and stays in
 * code; the texts come from the locales.
 */

/** `heard`: what a Russian ear hears, the swapped sound in [brackets] (shown bold). */
type Pair = { a: string; b: string; heard: string };
// Grouped by the two reasons, in the order of iceberg.perception.reasons.
const REASONS: Pair[][] = [
  // 1. Sounds Russian has nothing like.
  [{ a: 'sink', b: 'think', heard: '[с]инк' }],
  // 2. Length changes the meaning.
  [{ a: 'ship', b: 'sheep', heard: 'ш[и]п' }],
];

/**
 * The two sentences, word by word. `len` marks the vowel whose length differs,
 * `th` the s/θ sound; `text` is what the voice says. Their translations are
 * iceberg.perception.sentences.a / .b.
 */
type Piece = string | { len: string } | { th: string };
const SENTENCES: { id: 'a' | 'b'; text: string; words: Piece[][]; Pic: typeof ShipSinking }[] = [
  { id: 'a', text: 'The ship sinks.', words: [['The'], ['sh', { len: 'i' }, 'p'], [{ th: 's' }, 'inks.']], Pic: ShipSinking },
  { id: 'b', text: 'The sheep thinks.', words: [['The'], ['sh', { len: 'ee' }, 'p'], [{ th: 'th' }, 'inks.']], Pic: SheepThinking },
];

/** What the play button says, in order: both at normal speed, then both slowed down. */
const STEPS: { id: 'a' | 'b'; slow: boolean }[] = [
  { id: 'a', slow: false }, { id: 'b', slow: false }, { id: 'a', slow: true }, { id: 'b', slow: true },
];
const RATE = { normal: 0.9, slow: 0.45 };
/** Silence after each step, ms: a short pause between the sentences, a longer one before the slow pair. */
const PAUSE = [700, 1200, 900, 0];

const piece = (p: Piece, k: number) =>
  typeof p === 'string' ? p : 'len' in p ? <b key={k} className="ib-pc-len">{p.len}</b> : <b key={k} className="ib-pc-th">{p.th}</b>;

/** A ship going down bow first, bubbles rising from it. */
function ShipSinking() {
  return (
    <svg className="ib-pc-pic" viewBox="0 0 80 64" aria-hidden="true">
      <g transform="rotate(24 40 36)">
        <rect className="ib-pc-pic-dark" x="43" y="10" width="6" height="12" rx="1" />
        <rect className="ib-pc-pic-light" x="29" y="20" width="22" height="10" rx="2" />
        <path className="ib-pc-pic-hull" d="M14 30h52l-7 12H22z" />
      </g>
      <path className="ib-pc-pic-sea" d="M0 40q5-4 10 0t10 0 10 0 10 0 10 0 10 0 10 0 10 0V64H0z" />
      <path className="ib-pc-pic-wave" d="M0 40q5-4 10 0t10 0 10 0 10 0 10 0 10 0 10 0 10 0" />
      <circle className="ib-pc-pic-bubble" cx="56" cy="52" r="2.2" />
      <circle className="ib-pc-pic-bubble" cx="61" cy="46" r="1.5" />
      <circle className="ib-pc-pic-bubble" cx="51" cy="58" r="1.2" />
    </svg>
  );
}

/**
 * A sheep in profile, facing left: a scalloped fleece, a dark face with an
 * ear and a woolly cap, four black legs, a soft shadow; above it a
 * thought cloud with three dots in front of her, over her face, rising from
 * the head in two small puffs.
 */
function SheepThinking() {
  return (
    <svg className="ib-pc-pic" viewBox="0 0 100 80" aria-hidden="true">
      <ellipse className="ib-pc-sh-shadow" cx="56" cy="75" rx="26" ry="2.5" />
      <path className="ib-pc-sh-leg" d="M66 58v15M72 57v16" />
      <path className="ib-pc-sh-leg" d="M40 58v16M46 59v15" />
      <circle className="ib-pc-sh-wool" cx="81" cy="47" r="3.5" />
      <path className="ib-pc-sh-wool" d="M80.0 50.0A3.8 3.8 0 0 1 77.3 56.0A5.1 5.1 0 0 1 69.6 60.7A6.3 6.3 0 0 1 58.9 62.9A6.6 6.6 0 0 1 47.5 62.2A5.8 5.8 0 0 1 38.0 58.6A4.4 4.4 0 0 1 32.7 53.1A3.6 3.6 0 0 1 32.7 46.9A4.4 4.4 0 0 1 38.0 41.4A5.8 5.8 0 0 1 47.5 37.8A6.6 6.6 0 0 1 58.9 37.1A6.3 6.3 0 0 1 69.6 39.3A5.1 5.1 0 0 1 77.3 44.0A3.8 3.8 0 0 1 80.0 50.0Z" />
      <path className="ib-pc-sh-curl" d="M45 47a3 3 0 0 1 5 0M57 44a3 3 0 0 1 5 0M51 54a3 3 0 0 1 5 0M64 52a3 3 0 0 1 5 0M70 45a3 3 0 0 1 4 0M39 52a2.5 2.5 0 0 1 4 0" />
      {/* the head, tilted up from the neck */}
      <g transform="translate(0 -2) rotate(20 38 44)">
      <ellipse className="ib-pc-sh-ear" cx="36" cy="42" rx="5" ry="2" transform="rotate(28 36 42)" />
      <path className="ib-pc-sh-face" d="M38 42C34 37 26 38 21 43C17 47 13 52 14 56C15 59 19 60 23 58C29 55 35 50 38 46Z" />
      <path className="ib-pc-sh-wool" d="M38.0 37.0A2.3 2.3 0 0 1 35.5 40.0A2.9 2.9 0 0 1 30.5 40.0A2.3 2.3 0 0 1 28.0 37.0A2.3 2.3 0 0 1 30.5 34.0A2.9 2.9 0 0 1 35.5 34.0A2.3 2.3 0 0 1 38.0 37.0Z" />
      <circle className="ib-pc-sh-eye" cx="24" cy="46" r="1.5" />
      <circle className="ib-pc-sh-pupil" cx="23.6" cy="46.2" r=".8" />
      <circle className="ib-pc-sh-pupil" cx="16.5" cy="55" r=".7" />
      </g>
      <circle className="ib-pc-sh-cloud" cx="26.5" cy="28.5" r="1.5" />
      <circle className="ib-pc-sh-cloud" cx="22.5" cy="24.5" r="2.2" />
      {/* the cloud sits over her face, in front of her */}
      <g transform="translate(-43 -4)">
      <path className="ib-pc-sh-cloud" d="M82.2 18.0A5.7 5.7 0 0 1 74.3 23.4A7.7 7.7 0 0 1 61.6 24.9A7.2 7.2 0 0 1 50.1 21.8A4.8 4.8 0 0 1 45.0 15.5A4.5 4.5 0 0 1 48.9 9.0A6.9 6.9 0 0 1 59.8 5.2A7.8 7.8 0 0 1 72.7 6.1A6.1 6.1 0 0 1 81.5 11.1A4.1 4.1 0 0 1 82.2 18.0Z" />
      <circle className="ib-pc-sh-dot" cx="56.5" cy="15" r="1.9" />
      <circle className="ib-pc-sh-dot" cx="63.5" cy="15" r="1.9" />
      <circle className="ib-pc-sh-dot" cx="70.5" cy="15" r="1.9" />
      </g>
    </svg>
  );
}

export default function Perception() {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState<string | null>(null);
  const [ref, seen] = useInView<HTMLDivElement>(0.15);
  const reasons = t('iceberg.perception.reasons', { returnObjects: true }) as { title: string; text: string }[];

  /** The step the play button is on; null when it is not playing. */
  const [step, setStep] = useState<(typeof STEPS)[number] | null>(null);
  // Bumped to cancel a running sequence: every callback checks it is still its own run.
  const run = useRef(0);

  useEffect(() => () => { run.current++; hush(); }, []);

  const stopAll = () => { run.current++; setStep(null); };

  /** Play both sentences, then both slowed down; pressed again, stop. */
  const playAll = () => {
    if (step) { stopAll(); hush(); return; }
    setPlaying(null);
    const mine = ++run.current;
    const go = (k: number) => {
      if (run.current !== mine) return;
      if (k >= STEPS.length) { setStep(null); return; }
      const st = STEPS[k];
      setStep(st);
      const text = SENTENCES.find((x) => x.id === st.id)!.text;
      say(text, 'en-US', () => {
        if (run.current === mine) window.setTimeout(() => go(k + 1), PAUSE[k]);
      }, st.slow ? RATE.slow : RATE.normal);
    };
    go(0);
  };

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
        onClick={() => { stopAll(); setPlaying(id); say(`${p.a}. ${p.b}.`, 'en-US', () => setPlaying((x) => (x === id ? null : x))); }}>
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

        {/* both pairs in one sentence each: the same sounds to a Russian ear, two meanings */}
        <div className={`ib-card ib-pc-sent${seen ? ' in' : ''}`}>
          <p className="ib-pc-sent-title">{t('iceberg.perception.sentences.title')}</p>
          <div className="ib-pc-sent-body">
            <div className="ib-pc-lines">
              {SENTENCES.map((s) => (
                <div key={s.id} className={`ib-pc-line${step?.id === s.id ? ' on' : ''}`}>
                  <s.Pic />
                  <div className="ib-pc-line-txt">
                    <span className="ib-pc-line-en" lang="en">
                      {s.words.map((w, i) => (
                        <span key={i} className="ib-pc-sw">{w.map(piece)}</span>
                      ))}
                    </span>
                    <span className="ib-pc-line-ru" lang="ru">{t(`iceberg.perception.sentences.${s.id}`)}</span>
                  </div>
                </div>
              ))}
            </div>
            {canSpeak && (
              <button type="button" className={`ib-pc-play${step ? ' on' : ''}`} onClick={playAll}
                aria-label={t(step ? 'iceberg.perception.sentences.stop' : 'iceberg.perception.sentences.play')}>
                <span className="ib-pc-play-disc" aria-hidden="true">{step ? <StopIcon /> : <PlayIcon />}</span>
                <span className="ib-pc-play-label" aria-hidden="true">{t('iceberg.perception.sentences.play')}</span>
              </button>
            )}
          </div>

          <p className="ib-pc-heard">
            <EarIcon className="ib-pc-ear" />
            <span>{t('iceberg.perception.sentences.heard')}</span>
            <span className="ib-pc-ru" lang="ru">«Зэ ш<b>и</b>п <b>с</b>инкс»</span>
          </p>
        </div>

        <Outro>{t('iceberg.perception.outro')}</Outro>
      </div>
    </section>
  );
}
