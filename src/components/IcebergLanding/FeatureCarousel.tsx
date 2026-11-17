import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon } from '@heroicons/react/24/outline';
import quizImg from '../../assets/landing/m4-quiz.webp';
import wordQuizImg from '../../assets/landing/m4-wordgame.webp';
import voiceImg from '../../assets/landing/m5-replay.webp';
import pdfImg from '../../assets/landing/m6-pdf.webp';
import comicImg from '../../assets/landing/m6-comic.webp';
import schoolImg from '../../assets/landing/f-school.webp';

/**
 * What helps the new sound stick, as slides: the story quiz, the vocabulary
 * quiz, recording yourself, the PDF of a passed part and the school game. They
 * are shown as a row of photographs to swipe through (PhotoDeck). The comics
 * get a card of their own right after problem 2 (ComicShowcase), drawn the same way.
 *
 * Each slide is a real screenshot with a small looping scene played over it,
 * like a short clip: the right answer lights up, the tile of the word you heard
 * is picked, the recording plays, the PDF scrolls, points rise from the
 * school's desks, the comic pans across its panels. Overlays sit in the
 * screenshot's own box, placed in % of its size, so they stay on their buttons
 * at any width. Only the slide in view animates, and only while it is on
 * screen; reduced motion shows the screenshots still.
 */

export interface Text {
  title: string;
  text: string;
}

type Kind = 'quiz' | 'wordquiz' | 'voice' | 'pdf' | 'comic' | 'school';
export interface Slide {
  kind: Kind;
  img: string;
  /** The screenshot's size in pixels; the frame shows its top part at the frame's aspect. */
  size: [number, number];
  /** Where its title and text are: a position in `iceberg.features.items`, or a key under `iceberg.steps.more`. */
  text: number | string;
  wide?: boolean;
}

export const SLIDES: Slide[] = [
  { kind: 'quiz', img: quizImg, size: [723, 1100], text: 0 },
  { kind: 'wordquiz', img: wordQuizImg, size: [723, 924], text: 'wordQuiz' },
  { kind: 'voice', img: voiceImg, size: [780, 1688], text: 3 },
  { kind: 'pdf', img: pdfImg, size: [780, 1688], text: 'pdf' },
  { kind: 'school', img: schoolImg, size: [1100, 848], text: 'school', wide: true },
];
const COMIC: Slide = { kind: 'comic', img: comicImg, size: [780, 1190], text: 'comic' };

/** A box in the screenshot's pixels, as CSS left/top/width/height in %. */
const at = ([W, H]: [number, number], x: number, y: number, w?: number, h?: number) => ({
  left: `${(x / W) * 100}%`,
  top: `${(y / H) * 100}%`,
  ...(w !== undefined ? { width: `${(w / W) * 100}%` } : {}),
  ...(h !== undefined ? { height: `${(h / H) * 100}%` } : {}),
});

/** The little scene played over each screenshot. */
function Scene({ s }: { s: Slide }): ReactNode {
  const z = s.size;
  switch (s.kind) {
    case 'quiz':
      return (
        <>
          <span className="fc-tap" style={at(z, 362, 256)} />
          <span className="fc-quiz-bar" style={at(z, 164, 92, 126, 8)} />
          <span className="fc-quiz-pick" style={at(z, 28, 686, 667, 109)}>
            <CheckIcon aria-hidden="true" />
          </span>
        </>
      );
    case 'wordquiz':
      return (
        <>
          <span className="fc-tap" style={at(z, 100, 210)} />
          <span className="fc-tap fc-tap-late" style={at(z, 362, 450)} />
          <span className="fc-quiz-pick fc-wq-pick" style={at(z, 257, 398, 210, 103)}>
            <CheckIcon aria-hidden="true" />
          </span>
          <span className="fc-wq-plus" style={at(z, 600, 104)}>+1</span>
        </>
      );
    case 'voice':
      return (
        <>
          <span className="fc-tap" style={at(z, 390, 858)} />
          <span className="fc-voice-waves" style={at(z, 56, 520, 668, 230)}>
            {[0, 1].map((row) => (
              <span key={row} className={`fc-voice-row${row ? ' fc-voice-me' : ''}`}>
                {Array.from({ length: 28 }, (_, k) => (
                  <i key={k} style={{ ['--k' as string]: k, ['--h' as string]: (0.3 + 0.7 * Math.abs(Math.sin(k * 0.9 + row * 1.7))).toFixed(2) }} />
                ))}
              </span>
            ))}
          </span>
          <span className="fc-voice-bar" style={at(z, 56, 1016, 668, 12)} />
        </>
      );
    case 'school':
      return (
        <>
          {[[405, 380], [735, 560], [550, 655], [230, 485]].map(([x, y], k) => (
            <span key={k} className="fc-coin" style={{ ...at(z, x, y), ['--k' as string]: k }}>
              <Gem />+5
            </span>
          ))}
          <span className="fc-wallet">
            <Gem />
            <span className="fc-wallet-n"><span>0<br />5<br />10<br />15<br />20</span></span>
          </span>
        </>
      );
    default:
      return null;
  }
}

/** The school's main currency, as its HUD draws it. */
const Gem = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true" className="fc-gem">
    <path d="M5 3h10l3 5-8 9-8-9z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M2 8h16M7.5 3 10 17M12.5 3 10 17" fill="none" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

/** Title and text of a slide. */
export function useSlideText() {
  const { t } = useTranslation();
  const items = t('iceberg.features.items', { returnObjects: true }) as Text[];
  return (s: Slide): Text =>
    typeof s.text === 'number' ? items[s.text] : (t(`iceberg.steps.more.${s.text}`, { returnObjects: true }) as Text);
}

/** Whether an element is (at least a fifth) on screen. */
export function useOnScreen(ref: RefObject<HTMLElement | null>) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return on;
}

/**
 * Whether an element is within about two screens of the viewport; once true it
 * stays true. The photo deck loads all its screenshots from then on: left to
 * lazy loading, Safari only fetched a print once it was swiped into view (the
 * prints are moved by transforms, not by scrolling), so it showed empty frames.
 */
export function useNear(ref: RefObject<HTMLElement | null>) {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setNear(true); }, { rootMargin: '200% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, near]);
  return near;
}

/** A slide's framed screenshot with its scene looping over it. */
export function SlideFrame({ s, alt, eager }: { s: Slide; alt: string; eager?: boolean }) {
  return (
    <div className={`fc-frame fc-${s.kind}${s.wide ? ' fc-wide' : ''}`}>
      <div className="fc-shot">
        <img src={s.img} alt={alt} loading={eager ? 'eager' : 'lazy'} draggable={false} width={s.size[0]} height={s.size[1]} />
        <Scene s={s} />
      </div>
    </div>
  );
}

/** One slide's text and its framed, animated screenshot. */
function SlideBody({ s, text, count }: { s: Slide; text: Text; count?: string }) {
  return (
    <>
      <div className="fc-copy">
        {count && <p className="fc-count">{count}</p>}
        <h4 className="fc-title">{text.title}</h4>
        <p className="fc-text">{text.text}</p>
      </div>
      <SlideFrame s={s} alt={text.title} />
    </>
  );
}

/** The comics, on their own: the same picture as a carousel slide, without the carousel. */
export function ComicShowcase() {
  const textOf = useSlideText();
  const ref = useRef<HTMLDivElement>(null);
  const on = useOnScreen(ref);
  return (
    <div ref={ref} className={`fc fc-solo${on ? ' fc-run' : ''}`}>
      <div className="fc-slide is-on">
        <SlideBody s={COMIC} text={textOf(COMIC)} />
      </div>
    </div>
  );
}
