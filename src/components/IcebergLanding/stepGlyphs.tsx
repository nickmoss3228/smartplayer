import type { ReactNode } from 'react';

const BARS = [18, 34, 26, 46, 30, 14, 38, 52, 28, 20, 42, 24];

/** The five drawings, one per step, 120×120 each; styled by the .ib-glyph rules in icebergLanding.css. */
export const GLYPHS: ReactNode[] = [
  // 1. a word card that plays its sound; the spelling waits, faded, underneath
  <svg viewBox="0 0 120 120" key="vocab">
    <rect x="26" y="14" width="80" height="92" rx="12" className="g-card-back" />
    <rect x="14" y="22" width="80" height="92" rx="12" className="g-card" />
    <path d="M30 52 h8 l10 -9 v30 l-10 -9 h-8 z" className="g-spk" />
    <g className="g-arcs">
      <path d="M56 50 a10 10 0 0 1 0 16" />
      <path d="M62 44 a18 18 0 0 1 0 28" />
      <path d="M68 38 a26 26 0 0 1 0 40" />
    </g>
    <text x="54" y="100" className="g-word" textAnchor="middle">beach</text>
  </svg>,
  // 2. one stream cut into pieces
  <svg viewBox="0 0 120 120" key="atoms">
    {BARS.map((h, i) => (
      <rect
        key={i}
        x={10 + i * 8.6}
        y={60 - h / 2}
        width="5"
        height={h}
        rx="2.5"
        className={`g-bar g-part${i < 4 ? 0 : i < 8 ? 1 : 2}`}
      />
    ))}
    <line x1="42.6" y1="22" x2="42.6" y2="98" className="g-cut g-cut1" />
    <line x1="77" y1="22" x2="77" y2="98" className="g-cut g-cut2" />
  </svg>,
  // 3. the same wave, stretched out: 1× short, 0.65× long
  <svg viewBox="0 0 120 120" key="slow">
    <g className="g-stretch">
      <path d="M10 60 q7 -26 14 0 t14 0 t14 0 t14 0 t14 0 t14 0 t14 0" className="g-wave" />
    </g>
    <text x="60" y="104" className="g-speed g-fast" textAnchor="middle">1×</text>
    <text x="60" y="104" className="g-speed g-slow" textAnchor="middle">0.65×</text>
  </svg>,
  // 4. a looping arrow: one turn per listen, a dot lights for each of the three
  <svg viewBox="0 0 120 120" key="three">
    <g className="g-spin">
      <path d="M77 30.6 A34 34 0 1 1 43 30.6" className="g-ring" />
      <path d="M43.5 39.5 L49.1 27.1 L35.5 25.6 Z" className="g-head" />
    </g>
    <text x="60" y="69" className="g-three" textAnchor="middle">×3</text>
    <circle cx="46" cy="110" r="4.5" className="g-tick g-t1" />
    <circle cx="60" cy="110" r="4.5" className="g-tick g-t2" />
    <circle cx="74" cy="110" r="4.5" className="g-tick g-t3" />
  </svg>,
  // 5. say it back
  <svg viewBox="0 0 120 120" key="say">
    <rect x="50" y="26" width="20" height="40" rx="10" className="g-mic" />
    <path d="M40 56 a20 20 0 0 0 40 0 M60 76 v14 M48 92 h24" className="g-mic-stand" />
    <g className="g-out">
      <path d="M30 40 a24 24 0 0 0 0 30" />
      <path d="M90 40 a24 24 0 0 1 0 30" />
      <path d="M20 32 a36 36 0 0 0 0 46" />
      <path d="M100 32 a36 36 0 0 1 0 46" />
    </g>
  </svg>,
];
