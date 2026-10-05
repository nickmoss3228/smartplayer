/**
 * The method in five pictures. Each scene is one idea told in a few seconds,
 * looping:
 *
 *   passes    — one phrase at 1.0× / 0.8× / 0.65×       (3 repetitions, 3 speeds)
 *   subtitles — the caption drains away, the ear listens  (no subtitles, ears only)
 *   word      — a heard word becomes the thing itself     (words not in English)
 *   comic     — a heard word, found in the comic          (visual memory)
 *   loop      — the five steps of every story
 *
 * First drawn for the login panel (auth/AuthPanel.tsx), which still rotates
 * through all five. The why-clouds use the same pictures — the homepage
 * pop-ups, /how-to-use and the onboarding slides — so a student meets one set
 * of drawings for one method wherever they read about it.
 *
 * The drawings are made for a dark backdrop (near-white strokes); on a light
 * page use ScenePanel, which supplies it. Styles: methodScenes.css.
 */
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { SceneId } from './scenes';
import './methodScenes.css';

export const STAGE_W = 440;
export const STAGE_H = 300;

/* ── scenes ────────────────────────────────────────────────────────────── */

const Speaker = ({ size }: { size: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="#eef4f8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
    <path className="ap-arc" d="M15.5 9a4.5 4.5 0 0 1 0 6" />
    <path className="ap-arc b" d="M18 6.5a8 8 0 0 1 0 11" />
  </svg>
);

const UMBRELLA =
  'M12 52 Q50 6 88 52 Q78.5 43 69 52 Q59.5 43 50 52 Q40.5 43 31 52 Q21.5 43 12 52 M50 52 V82 Q50 90 42 90 Q36 90 35 84';

const PHRASE = ['What', 'do', 'you', 'want', 'to', 'do', 'tonight'];

const Passes = () => (
  <div className="ap-scene">
    <div className="ap-a-rows">
      <span className="ap-a-mark" />
      {(['1.0×', '0.8×', '0.65×'] as const).map((tag, i) => (
        <div key={tag} className={`ap-a-row r${i + 1}`}>
          <span className="ap-a-tag ap-mono">{tag}</span>
          <span className="ap-a-ph">
            {PHRASE.map((w, j) => <span key={j} style={{ '--j': j } as CSSProperties}>{w}</span>)}
          </span>
        </div>
      ))}
    </div>
  </div>
);

const Subtitles = ({ off }: { off: string }) => (
  <div className="ap-scene ap-b">
    <div className="ap-b-ear">
      <span className="ap-b-ring" />
      <span className="ap-b-ring b" />
      <span className="ap-b-ring c" />
      <svg viewBox="0 0 24 24" width="52" height="52" fill="none" stroke="#eef4f8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8.5a6 6 0 1 1 12 0c0 3.6-3.2 4.6-3.2 7.6A3.4 3.4 0 0 1 11.4 19.5c-1.4 0-2.3-.7-2.8-1.6" />
        <path d="M9.2 9a2.8 2.8 0 0 1 5.6 0c0 1.4-1.3 1.9-1.3 3.1" />
      </svg>
    </div>
    <div className="ap-b-cap">
      <span className="ap-b-txt">I like the way you move</span>
      <span className="ap-b-off ap-mono">{off}</span>
    </div>
  </div>
);

// Chair, key, umbrella — drawn in one stroke each so they can draw themselves.
const OBJECTS = [
  'M34 12 V88 M34 54 H74 V88 M34 12 H48 V54',
  'M16 50 a14 14 0 1 0 28 0 a14 14 0 1 0 -28 0 M44 50 H86 M74 50 V62 M84 50 V60',
  UMBRELLA,
];

const WordToThing = () => (
  <div className="ap-scene ap-c">
    <Speaker size={46} />
    <svg viewBox="0 0 40 12" width="52" height="16" fill="none" stroke="#e5484d" strokeWidth="1.6" strokeLinecap="round">
      <path d="M2 6h34M31 1.5 36 6l-5 4.5" />
    </svg>
    <div className="ap-c-pics">
      {OBJECTS.map((d, i) => (
        <svg key={i} className={`ap-c-obj o${i + 1}`} viewBox="0 0 100 100" fill="none" stroke="#eef4f8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path pathLength={1} d={d} />
        </svg>
      ))}
    </div>
  </div>
);

const RAIN = 'l-4 10';

/*
 * One comic page, four panels of one small story — rain comes, someone looks
 * out, someone walks under an umbrella, the sun is back. The word is heard and
 * the eye goes looking through the panels until it lands on the umbrella.
 *
 * Deliberately not a choice: no tiles to tap, no "correct!". The player has no
 * picture quiz; what the comic gives is a place to look for what you heard.
 */
const Comic = () => (
  <div className="ap-scene ap-d">
    <div className="ap-d-word">
      <Speaker size={30} />
      <span className="ap-d-say">umbrella</span>
    </div>
    <div className="ap-d-page">
      <svg viewBox="0 0 420 206" width="420" height="206" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <g className="ap-d-frame">
          <rect x="1" y="1" width="150" height="98" rx="2" />
          <rect x="159" y="1" width="260" height="98" rx="2" />
          <rect x="1" y="107" width="250" height="98" rx="2" />
          <rect x="259" y="107" width="160" height="98" rx="2" />
        </g>
        <g className="ap-d-ink">
          {/* 1 · the rain comes */}
          <path d="M46 56 Q38 42 54 40 Q58 26 76 30 Q90 20 102 34 Q118 34 112 50 Q110 56 102 56 Z" />
          <path d={`M60 66 ${RAIN} M78 66 ${RAIN} M96 66 ${RAIN}`} />
          {/* 2 · someone steps out and feels it */}
          <path d="M190 90 V48 L222 28 L254 48 V90 M214 90 V66 H230 V90 M168 90 H410" />
          <circle cx="300" cy="38" r="8" />
          <path d="M300 46 V70 M300 70 l-8 19 M300 70 l8 19 M300 54 l-10 10 M300 54 l11 -8" />
          <path d={`M338 22 ${RAIN} M362 36 ${RAIN} M386 20 ${RAIN} M350 60 ${RAIN} M380 58 ${RAIN}`} />
          {/* 3 · walking out in it (the umbrella is drawn on its own below) */}
          <circle cx="116" cy="148" r="7" />
          <path d="M116 155 V176 M116 176 l-7 18 M116 176 l7 18 M116 161 L125 156 M10 196 H242" />
          <path d={`M36 122 ${RAIN} M60 146 ${RAIN} M40 168 ${RAIN} M176 120 ${RAIN} M200 146 ${RAIN} M224 124 ${RAIN} M188 170 ${RAIN}`} />
          {/* 4 · and the sun is back */}
          <circle cx="339" cy="142" r="12" />
          <path d="M339 120 v-6 M339 164 v6 M317 142 h-6 M361 142 h6 M323 126 l-4 -4 M355 126 l4 -4 M323 158 l-4 4 M355 158 l4 4" />
          <ellipse cx="339" cy="190" rx="38" ry="5" />
        </g>
        <g className="ap-d-hit" transform="translate(107 112) scale(.5)" strokeWidth={4.4}>
          <path d={UMBRELLA} />
        </g>
      </svg>
      <span className="ap-d-gaze" />
    </div>
  </div>
);

const RING_R = 120;
const Loop = ({ steps }: { steps: string[] }) => (
  <div className="ap-scene">
    <div className="ap-e">
      <svg viewBox="0 0 300 300" width="300" height="300" style={{ position: 'absolute', inset: 0 }}>
        <circle cx="150" cy="150" r={RING_R} fill="none" stroke="#2b3644" strokeWidth="1" />
        <circle className="ap-e-prog" cx="150" cy="150" r={RING_R} fill="none" stroke="#e5484d" strokeWidth="2" pathLength={1} strokeDasharray="1" transform="rotate(-90 150 150)" />
      </svg>
      {steps.map((_, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / steps.length;
        return (
          <span
            key={i}
            className={`ap-e-node ap-mono s${i}`}
            style={{ left: 150 + RING_R * Math.cos(a) - 20, top: 150 + RING_R * Math.sin(a) - 20 }}
          >
            0{i + 1}
          </span>
        );
      })}
      <div className="ap-e-center">
        {steps.map((s, i) => <span key={i} className={`ap-e-lbl s${i}`}>{s}</span>)}
      </div>
    </div>
  </div>
);

/** One scene's drawing at stage size. Needs a dark backdrop and an .ap-stage around it. */
export const SceneDrawing = ({ scene }: { scene: SceneId }) => {
  const { t } = useTranslation();
  switch (scene) {
    case 'passes':
      return <Passes />;
    case 'subtitles':
      return <Subtitles off={t('auth.panel.subtitlesOff')} />;
    case 'word':
      return <WordToThing />;
    case 'comic':
      return <Comic />;
    case 'loop':
      return <Loop steps={[1, 2, 3, 4, 5].map((n) => t(`howToUse.loop.s${n}.title`))} />;
  }
};

/* ── stage ─────────────────────────────────────────────────────────────── */

/**
 * One scene on its fixed 440×300 stage, scaled as a whole — down, never up —
 * to the width it is given and to `maxHeight`. `playKey` remounts the stage,
 * which restarts every CSS clock in it from zero.
 */
export const SceneStage = ({
  scene,
  maxHeight = STAGE_H,
  playKey,
  style,
}: {
  scene: SceneId;
  maxHeight?: number;
  playKey?: string | number;
  style?: CSSProperties;
}) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, el.clientWidth / STAGE_W, maxHeight / STAGE_H));
    fit();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [maxHeight]);

  return (
    <div ref={hostRef} className="flex w-full justify-center" style={{ height: STAGE_H * scale }}>
      <div style={{ width: STAGE_W * scale, height: STAGE_H * scale }}>
        <div
          key={playKey ?? scene}
          className="ap-stage"
          style={{ ...style, transform: `scale(${scale})` }}
        >
          <SceneDrawing scene={scene} />
        </div>
      </div>
    </div>
  );
};

/**
 * A scene on the dark machine panel, for light pages — the same ink panel the
 * login screen shows them on (design manifest: one dark panel in a light room).
 *
 * Decorative: the text beside it says what the picture shows, so the panel is
 * hidden from screen readers, as on the login screen.
 *
 * `startWhenSeen` restarts the scene the first time the panel scrolls into
 * view, so a reader arrives at its first beat rather than mid-loop.
 */
export const ScenePanel = ({
  scene,
  caption = true,
  startWhenSeen = false,
  className = '',
}: {
  scene: SceneId;
  caption?: boolean;
  startWhenSeen?: boolean;
  className?: string;
}) => {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(!startWhenSeen);

  useEffect(() => {
    if (!startWhenSeen) return;
    const el = panelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [startWhenSeen]);

  return (
    <div
      ref={panelRef}
      aria-hidden="true"
      className={`rounded-card bg-ink px-4 py-6 sm:px-8 sm:py-8 ${className}`}
    >
      <SceneStage scene={scene} playKey={`${scene}-${seen ? 'on' : 'off'}`} />
      {caption && (
        <p className="m-0 mt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-panel-dim">
          {t(`auth.panel.${scene}`)}
        </p>
      )}
    </div>
  );
};
