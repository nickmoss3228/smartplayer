import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useInView } from './useInView';

/**
 * Why not podcasts, why not an AI tutor. Podcasts: words fly in one ear and out
 * the other, because nothing splits, slows or repeats them. The AI tutor: asked
 * to repeat a phrase thirty times, it goes back to teaching, because a teacher
 * is not a parrot.
 */

const FLOW = ['what', 'do', 'you', 'wanna', 'do?', 'gonna', 'kinda'];

export default function Rivals() {
  const { t } = useTranslation();
  const lacks = t('iceberg.rivals.podcast.lacks', { returnObjects: true }) as string[];
  const [ref, seen] = useInView<HTMLDivElement>(0.2);
  // The tutor "types" for a moment once the cards are in view, then answers.
  const [answered, setAnswered] = useState(false);
  useEffect(() => {
    if (!seen) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const id = window.setTimeout(() => setAnswered(true), still ? 0 : 1600);
    return () => window.clearTimeout(id);
  }, [seen]);

  return (
    <section className="ib-sec ib-rivals" aria-labelledby="ib-rivals-title">
      <div className="ib-wrap">
        <p className="ib-kicker ib-kicker-dim">{t('iceberg.rivals.micro')}</p>
        <div ref={ref} className={`ib-rivals-grid${seen ? ' in' : ''}`}>
          <article className="ib-card ib-rival">
            <div className="ib-ear" aria-hidden="true">
              <svg viewBox="0 0 320 170" className="ib-ear-svg">
                {FLOW.map((w, i) => (
                  <text key={w} x="0" y={66 + (i % 3) * 16} className="ib-fly" style={{ animationDelay: `${i * 0.9}s` }}>
                    {w}
                  </text>
                ))}
                <ellipse cx="114" cy="78" rx="9" ry="14" className="ib-ear-head" />
                <ellipse cx="206" cy="78" rx="9" ry="14" className="ib-ear-head" />
                <circle cx="160" cy="78" r="46" className="ib-ear-head" />
                <circle cx="144" cy="72" r="3.5" className="ib-ear-eye" />
                <circle cx="176" cy="72" r="3.5" className="ib-ear-eye" />
                <path d="M148 98 h24" className="ib-ear-mouth" />
                <rect x="40" y="140" width="240" height="22" rx="11" className="ib-pod-bar" />
                <path d="M54 145 l9 6 l-9 6z" className="ib-pod-play" />
                <rect x="74" y="149.5" width="190" height="3" rx="1.5" className="ib-pod-track" />
                <rect x="74" y="149.5" width="190" height="3" rx="1.5" className="ib-pod-fill" />
              </svg>
            </div>
            <h2 id="ib-rivals-title" className="ib-h2">{t('iceberg.rivals.podcast.q')}</h2>
            <p className="ib-card-text">{t('iceberg.rivals.podcast.text')}</p>
            <ul className="ib-lacks">
              {lacks.map((l) => (
                <li key={l}>
                  <XMarkIcon className="ib-x" aria-hidden="true" />
                  {l}
                </li>
              ))}
            </ul>
            <p className="ib-verdict">{t('iceberg.rivals.podcast.verdict')}</p>
          </article>

          <article className="ib-card ib-rival">
            <div className="ib-chat" aria-hidden="true">
              <p className="ib-bubble-you">{t('iceberg.rivals.tutor.you')}</p>
              <div className="ib-bubble-row">
                <span className="ib-bot-face">
                  <SparklesIcon />
                </span>
                <p className="ib-bubble-bot">
                  {answered ? (
                    <span className="ib-bot-text">{t('iceberg.rivals.tutor.bot')}</span>
                  ) : (
                    <span className="ib-typing">
                      <i />
                      <i />
                      <i />
                    </span>
                  )}
                </p>
              </div>
            </div>
            <h2 className="ib-h2">{t('iceberg.rivals.tutor.q')}</h2>
            <p className="ib-card-text">{t('iceberg.rivals.tutor.text')}</p>
            <p className="ib-verdict">{t('iceberg.rivals.tutor.verdict')}</p>
          </article>
        </div>
      </div>
    </section>
  );
}
