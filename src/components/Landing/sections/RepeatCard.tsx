import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Right after the hero: listen and repeat. A drawn infographic, not 3D — two
 * tracks: the narrator's voice draws in, «Твоя очередь», the student's own
 * voice draws in, then both play one after the other («Диктор и я», as in the
 * player's «Послушай себя») while a face beside them listens, speaks, and
 * smiles at the replay. No score and no praise, as in the app.
 *
 * On desktop it sits over the hero's 3D (data-scene="0" keeps that scene);
 * on a phone the drawing is the card's own window, like the 3D cards'.
 * The animation is CSS (landing.css, .rp-*) and only runs while on screen.
 */

// The two voices, as bar heights: the narrator's line, and the student's a little flatter.
const NARRATOR = [2, 10, 16, 8, 22, 12, 18, 6, 14, 20, 10, 4, 16, 12, 22, 8, 14, 6, 12, 18, 8, 4, 10, 6, 12, 8, 4, 6, 2, 4, 2, 2];
const STUDENT = [2, 8, 16, 10, 20, 12, 16, 6, 14, 18, 10, 4, 14, 12, 20, 8, 14, 6, 10, 16, 8, 4, 8, 6, 10, 6, 2, 4, 2];
const bars = (hs: number[], mid: number) => hs.map((h, i) => `M${130 + i * 6} ${mid - h / 2}v${Math.max(h, 1)}`).join('');

export function RepeatCard() {
  const { t } = useTranslation();
  const steps = t('landing.repeat.steps', { returnObjects: true }) as string[];
  const panel = useRef<HTMLDivElement>(null);

  // Paused off screen: no animation work while the visitor reads elsewhere.
  useEffect(() => {
    const el = panel.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      el?.classList.add('rp-run');
      return;
    }
    const io = new IntersectionObserver(([e]) => el.classList.toggle('rp-run', e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="ch rp" data-ch="repeat" data-scene="0">
      <div className="card">
        <div className="rp-panel" ref={panel}>
          <svg viewBox="12 52 336 212" role="img" aria-label={t('landing.repeat.aria')}>
            {/* the face: headphones, listening, then speaking, then smiling at the replay */}
            <circle cx="62" cy="143" r="40" fill="#ffffff" stroke="#e0e7ed" strokeWidth="2" />
            <circle cx="62" cy="146" r="25" fill="#c98c5b" />
            <path d="M37 146 Q35 116 62 115 Q89 116 87 146 Q84 132 73 128 Q60 131 46 129 Q40 135 37 146 Z" fill="#17130f" />
            <path d="M36 146 Q36 114 62 113 Q88 114 88 146" fill="none" stroke="#1c1f24" strokeWidth="4" />
            <rect x="31" y="138" width="9" height="18" rx="4" fill="#1c1f24" />
            <rect x="84" y="138" width="9" height="18" rx="4" fill="#1c1f24" />
            <circle cx="54" cy="144" r="2.4" fill="#2a2622" />
            <circle cx="70" cy="144" r="2.4" fill="#2a2622" />
            <path d="M49 137.5 L57 136.5 M67 136.5 L75 137.5" stroke="#17130f" strokeWidth="2" strokeLinecap="round" />
            <path className="rp-cyc rp-plain" d="M57 158 L67 158" stroke="#8a5235" strokeWidth="2.2" strokeLinecap="round" />
            <g className="rp-cyc rp-open">
              <ellipse className="rp-mouth" cx="62" cy="158" rx="4.5" ry="3.2" fill="#6e3a24" />
            </g>
            <path className="rp-cyc rp-smile" d="M55 155.5 Q62 164 69 155.5" fill="none" stroke="#8a5235" strokeWidth="2.4" strokeLinecap="round" />
            <g className="rp-cyc rp-rec">
              <circle className="rp-ring" cx="62" cy="158" r="12" fill="none" stroke="#00c951" strokeWidth="2" />
            </g>

            {/* the narrator's track */}
            <text className="rp-lbl" x="128" y="70">{t('landing.repeat.narrator')}</text>
            <path className="rp-cyc rp-w1" d={bars(NARRATOR, 92)} stroke="#0f151c" strokeWidth="3" strokeLinecap="round" />

            {/* your turn */}
            <g className="rp-cyc rp-turn">
              <rect x="167" y="124" width="124" height="26" rx="13" fill="#0f151c" />
              <path d="M183 130.5a2.5 2.5 0 0 1 5 0v5a2.5 2.5 0 0 1 -5 0z M180 134a5.5 5.5 0 0 0 11 0 M185.5 139.5v2.5" fill="none" stroke="#00c951" strokeWidth="1.8" strokeLinecap="round" />
              <text x="198" y="141" className="rp-pill">{t('landing.repeat.turn')}</text>
            </g>

            {/* your track */}
            <text className="rp-lbl rp-you" x="128" y="176">{t('landing.repeat.you')}</text>
            <path className="rp-cyc rp-w2" d={bars(STUDENT, 198)} stroke="#00c951" strokeWidth="3" strokeLinecap="round" />

            {/* both, one after the other */}
            <text className="rp-cyc rp-replay rp-together" x="128" y="244">
              <tspan>{t('landing.repeat.together')}</tspan>
              <tspan className="rp-dim"> · {t('landing.repeat.inTurn')}</tspan>
            </text>
            <g className="rp-cyc rp-h1">
              <path d="M128 76 V110" stroke="#0f151c" strokeWidth="1.5" />
              <circle cx="128" cy="76" r="3" fill="#0f151c" />
            </g>
            <g className="rp-cyc rp-h2">
              <path d="M128 182 V216" stroke="#15803d" strokeWidth="1.5" />
              <circle cx="128" cy="182" r="3" fill="#15803d" />
            </g>
          </svg>
        </div>
        <p className="eyebrow">{t('landing.repeat.eyebrow')}</p>
        <h2>{t('landing.repeat.title')}</h2>
        <p>{t('landing.repeat.body')}</p>
        <ol className="rp-steps">
          {steps.map((s, i) => (
            <li key={i} className={`rp-cyc rp-s${i + 1}`}>
              {i + 1} · {s}
            </li>
          ))}
        </ol>
        <div className="app-note">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
          </svg>
          <span>{t('landing.repeat.note')}</span>
        </div>
      </div>
    </section>
  );
}
