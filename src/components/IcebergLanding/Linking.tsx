import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRightIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline';
import { canSpeak, hush, say } from './speech';
import { useInView } from './useInView';

/**
 * The other deepest layer of the iceberg: word linking. One phrase shown as it
 * is written (six words) and as it is heard (three chunks), then the four
 * things that happen to words in speech, each with real examples. Every
 * example says itself at natural speed, where the linking actually happens.
 * The English examples are language data, so they stay out of the locales.
 */

/** A piece of a written example: plain text, a link between words, a dropped sound, or sounds that merge. */
type Seg = string | { j: true } | { x: string } | { m: string };
interface Example {
  seg: Seg[];
  heard: string;
  /** What the button says, in turn. Default: the written phrase at natural speed, where the voice links it
   * itself. Contractions are spelled out to it, since it reads "going to" in full. */
  speak?: string[];
}
const J = { j: true } as const;

/** In the same order as iceberg.link.types. */
const TYPES: Example[][] = [
  [{ seg: ['pick', J, 'it', J, 'up'], heard: 'pi-ki-tup' }, { seg: ['turn', J, 'it', J, 'off'], heard: 'tur-ni-toff' }],
  // Sounds drop out, and sounds merge: one example of each.
  [{ seg: ['nex', { x: 't' }, ' day'], heard: 'nex day' }, { seg: ['di', { m: 'd y' }, 'ou'], heard: 'di-ju' }],
];

/** The phrase in the grey panel: written words grouped by the chunk they become. */
const PHRASE = { text: 'What do you want to do?', groups: [{ w: ['What', 'do', 'you'], heard: 'whaddaya' }, { w: ['want', 'to'], heard: 'wanna' }, { w: ['do?'], heard: 'do?' }] };

const plain = (seg: Seg[]) => seg.map((s) => (typeof s === 'string' ? s : 'j' in s ? ' ' : 'x' in s ? s.x : s.m)).join('');

function renderSeg(seg: Seg[]): ReactNode[] {
  return seg.map((s, i) => {
    if (typeof s === 'string') return <span key={i}>{s}</span>;
    if ('j' in s) return <span key={i} className="ib-lk-join" aria-hidden="true">‿</span>;
    if ('x' in s) return <span key={i} className="ib-lk-drop">{s.x}</span>;
    return <span key={i} className="ib-lk-merge">{s.m}</span>;
  });
}

interface Type {
  title: string;
  text: string;
}

export default function Linking() {
  const { t } = useTranslation();
  const types = t('iceberg.link.types', { returnObjects: true }) as Type[];
  const [playing, setPlaying] = useState<string | null>(null);
  const [heroRef, heroSeen] = useInView<HTMLDivElement>(0.35);
  const [cardsRef, cardsSeen] = useInView<HTMLDivElement>(0.15);

  useEffect(() => () => hush(), []);

  /** Says each text in turn with a short pause between, then clears the playing state. */
  const play = (id: string, texts: string[]) => {
    setPlaying(id);
    const next = (i: number) => {
      if (i >= texts.length) { setPlaying((p) => (p === id ? null : p)); return; }
      say(texts[i], 'en-US', () => { if (i + 1 < texts.length) window.setTimeout(() => next(i + 1), 350); else next(i + 1); }, 1);
    };
    next(0);
  };

  // A render helper, not a component, so the pressed button keeps its focus.
  const speakable = (id: string, texts: string[], className: string, children: ReactNode) =>
    canSpeak ? (
      <button type="button" className={`${className}${playing === id ? ' ib-playing' : ''}`} onClick={() => play(id, texts)} aria-label={texts.join(' → ')}>
        {children}
      </button>
    ) : (
      <span className={className}>{children}</span>
    );

  return (
    <section className="ib-sec ib-layer ib-link" aria-labelledby="ib-link-title">
      <div className="ib-wrap">
        <p className="ib-kicker">{t('iceberg.berg.linking.title')}</p>
        <h2 id="ib-link-title" className="ib-h2">{t('iceberg.link.title')}</h2>
        <p className="ib-link-lead">{t('iceberg.link.text')}</p>

        <div ref={heroRef} className={`ib-lk-hero${heroSeen ? ' in' : ''}`}>
          {speakable('phrase', [PHRASE.text], 'ib-lk-phrase', (
            <>
              <span className="ib-lk-groups" lang="en">
                {/* one grid: row 1 written words, row 2 braces, row 3 what you hear; the labels are column 1 */}
                <span className="ib-lk-rowlabel" lang="ru">{t('iceberg.link.written')}</span>
                <span aria-hidden="true" />
                <span className="ib-lk-rowlabel ib-lk-rowlabel-heard" lang="ru">{t('iceberg.link.heard')}</span>
                {PHRASE.groups.map((g, gi) => (
                  <span key={gi} className="ib-lk-group" style={{ ['--g' as string]: gi }}>
                    <span className="ib-lk-words">
                      {g.w.map((w) => <span key={w} className="ib-lk-word">{w}</span>)}
                    </span>
                    <span className="ib-lk-brace" aria-hidden="true" />
                    <span className="ib-lk-chunk">{g.heard}</span>
                  </span>
                ))}
              </span>
              <span className="ib-lk-count">
                <SpeakerWaveIcon className="ib-say-ico" aria-hidden="true" />
                {t('iceberg.link.count')}
              </span>
            </>
          ))}
        </div>

        <div ref={cardsRef} className={`ib-lk-cards${cardsSeen ? ' in' : ''}`}>
          {types.map((ty, ti) => (
            <article key={ti} className="ib-card ib-lk-card" style={{ transitionDelay: `${ti * 0.1}s` }}>
              <h3 className="ib-h3">{ty.title}</h3>
              <p className="ib-card-text">{ty.text}</p>
              <div className="ib-lk-exs">
                {TYPES[ti].map((ex, ei) => {
                  const texts = ex.speak ?? [plain(ex.seg)];
                  return (
                    <span key={ei}>
                      {speakable(`t${ti}-${ei}`, texts, 'ib-lk-ex', (
                        <>
                          <span className="ib-lk-w" lang="en">{renderSeg(ex.seg)}</span>
                          <ArrowRightIcon className="ib-ru-arrow" aria-hidden="true" />
                          <span className="ib-lk-h" lang="en">{ex.heard}</span>
                          <SpeakerWaveIcon className="ib-say-ico" aria-hidden="true" />
                        </>
                      ))}
                    </span>
                  );
                })}
              </div>
            </article>
          ))}
        </div>

        <p className="ib-outro">{t('iceberg.link.outro')}</p>
      </div>
    </section>
  );
}
