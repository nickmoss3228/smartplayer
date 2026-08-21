// modules/school/sprites.tsx
//
// One sprite family per furniture slot. Each draws into a 100x100 local box
// anchored bottom-centre at (50, 100), so the scene can place any sprite with
// a single translate/scale without knowing what it is.
//
// `c` is the item's main colour, `a` its accent, `v` the 0|1|2 variant. Items
// in the same slot share a shape family and differ by palette plus whatever
// the variant adds — that is what lets 63 catalogue entries come from 21
// renderers. Swapping in real artwork later means replacing this file only;
// schoolCatalog.ts does not change.

import { JSX } from "react";
import { SchoolSlotId } from "../../config/schoolCatalog";

export interface SpriteProps {
  c: string;
  a: string;
  v: number;
}

const shade = (hex: string, amount: number): string => {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (x: number) => Math.max(0, Math.min(255, Math.round(x)));
  const r = clamp(((n >> 16) & 255) * (1 + amount));
  const g = clamp(((n >> 8) & 255) * (1 + amount));
  const b = clamp((n & 255) * (1 + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
};

// ── Classroom ───────────────────────────────────────────────────────────────
const Board = ({ c, a, v }: SpriteProps) => (
  <g>
    <rect x="8" y="26" width="84" height="56" rx="4" fill={shade(c, -0.35)} />
    <rect x="12" y="30" width="76" height="48" rx="3" fill={c} />
    {v === 2 ? (
      <>
        {[[26, 44], [46, 38], [66, 50], [36, 62], [72, 66]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i % 2 ? 2 : 3} fill={a} />
        ))}
        <path d="M26 44 L46 38 L66 50" stroke={a} strokeWidth="1.5" fill="none" opacity="0.7" />
      </>
    ) : (
      <>
        <rect x="20" y="40" width="40" height="3" rx="1.5" fill={a} opacity="0.85" />
        <rect x="20" y="50" width="52" height="3" rx="1.5" fill={a} opacity="0.6" />
        <rect x="20" y="60" width="30" height="3" rx="1.5" fill={a} opacity="0.45" />
      </>
    )}
    <rect x="12" y="78" width="76" height="5" rx="2" fill={shade(c, -0.2)} />
  </g>
);

const Desks = ({ c, a, v }: SpriteProps) => (
  <g>
    {[0, 1].map((i) => (
      <g key={i} transform={`translate(${i * 46}, 0)`}>
        <rect x="6" y="56" width="42" height="7" rx="3" fill={c} />
        <rect x="10" y="63" width="5" height="24" fill={shade(c, -0.3)} />
        <rect x="39" y="63" width="5" height="24" fill={shade(c, -0.3)} />
        {v >= 1 && <rect x="12" y="50" width="30" height="6" rx="3" fill={a} />}
        {v === 2 && <circle cx="27" cy="46" r="3" fill={a} opacity="0.8" />}
      </g>
    ))}
  </g>
);

const TeacherDesk = ({ c, a, v }: SpriteProps) => (
  <g>
    <rect x="14" y="52" width="72" height="9" rx="4" fill={c} />
    <rect x="20" y="61" width="60" height="24" rx="3" fill={shade(c, -0.18)} />
    <rect x="26" y="67" width="20" height="12" rx="2" fill={a} opacity="0.7" />
    {v >= 1 && <rect x="56" y="42" width="18" height="10" rx="2" fill={a} />}
    {v === 2 && <circle cx="40" cy="46" r="5" fill={a} opacity="0.85" />}
  </g>
);

// ── Library ─────────────────────────────────────────────────────────────────
const Shelves = ({ c, a, v }: SpriteProps) => (
  <g>
    <rect x="14" y={v === 1 ? 18 : 30} width="72" height={v === 1 ? 69 : 57} rx="3" fill={c} />
    {[0, 1, 2].slice(0, v === 1 ? 3 : 2).map((row) => (
      <g key={row} transform={`translate(0, ${row * 22})`}>
        <rect x="18" y={(v === 1 ? 24 : 36) + 0} width="64" height="16" fill={shade(c, -0.3)} />
        {[0, 1, 2, 3, 4].map((b) => (
          <rect
            key={b}
            x={21 + b * 12}
            y={(v === 1 ? 26 : 38) + (b % 2)}
            width="8"
            height={12 - (b % 3)}
            rx="1"
            fill={b % 2 ? a : shade(a, -0.25)}
          />
        ))}
      </g>
    ))}
    {v === 2 && <circle cx="50" cy="24" r="6" fill={a} opacity="0.5" />}
  </g>
);

const Nook = ({ c, a, v }: SpriteProps) => (
  <g>
    {v === 2 && <path d="M22 30 Q50 12 78 30 L74 40 Q50 26 26 40 Z" fill={a} opacity="0.55" />}
    <rect x="20" y="58" width="60" height="28" rx="8" fill={c} />
    <rect x="26" y="48" width="48" height="16" rx="7" fill={shade(c, 0.16)} />
    <circle cx="36" cy="54" r="6" fill={a} />
    <circle cx="64" cy="54" r="6" fill={a} opacity="0.75" />
    {v === 1 && <rect x="18" y="34" width="64" height="18" rx="4" fill={a} opacity="0.35" />}
  </g>
);

const Rug = ({ c, a, v }: SpriteProps) => (
  <g>
    <ellipse cx="50" cy="80" rx="42" ry="15" fill={c} />
    <ellipse cx="50" cy="80" rx="30" ry="10" fill={a} opacity={v === 2 ? 0.5 : 0.35} />
    {v === 1 && <ellipse cx="50" cy="80" rx="16" ry="5" fill={c} />}
    {v === 2 &&
      [[34, 78], [50, 74], [66, 80], [58, 85]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2" fill={a} />
      ))}
  </g>
);

// ── Listening Lab ───────────────────────────────────────────────────────────
const Booth = ({ c, a, v }: SpriteProps) => (
  <g>
    <path d="M18 86 L18 44 Q18 28 50 28 Q82 28 82 44 L82 86 Z" fill={c} />
    <path d="M28 86 L28 48 Q28 38 50 38 Q72 38 72 48 L72 86 Z" fill={shade(c, -0.25)} />
    <rect x="36" y="56" width="28" height="18" rx="3" fill={a} opacity="0.8" />
    {v >= 1 && <rect x="42" y="30" width="16" height="6" rx="3" fill={a} />}
    {v === 2 &&
      [[24, 34], [76, 34], [50, 22]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill={a} opacity="0.8" />
      ))}
  </g>
);

const Speakers = ({ c, a, v }: SpriteProps) => (
  <g>
    {[0, 1].map((i) => (
      <g key={i} transform={`translate(${i * 44}, ${v === 1 ? 0 : 12})`}>
        <rect x="18" y="40" width="26" height={v === 1 ? 47 : 35} rx="3" fill={c} />
        <circle cx="31" cy="54" r="7" fill={a} />
        <circle cx="31" cy="54" r="3" fill={shade(a, -0.4)} />
        {v === 2 && <circle cx="31" cy="72" r="4" fill={a} opacity="0.7" />}
      </g>
    ))}
  </g>
);

const LabPoster = ({ c, a, v }: SpriteProps) => (
  <g>
    <rect x="16" y="28" width="68" height="52" rx="3" fill={shade(c, -0.3)} />
    <rect x="20" y="32" width="60" height="44" rx="2" fill={c} />
    {v === 1 ? (
      <>
        <circle cx="50" cy="52" r="13" fill={a} />
        <circle cx="45" cy="49" r="2.5" fill={shade(c, -0.4)} />
        <circle cx="55" cy="49" r="2.5" fill={shade(c, -0.4)} />
      </>
    ) : (
      [0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect
          key={i}
          x={26 + i * 7}
          y={52 - [6, 12, 8, 16, 9, 13, 5][i]}
          width="4"
          height={[12, 24, 16, 32, 18, 26, 10][i]}
          rx="2"
          fill={a}
          opacity={v === 2 ? 0.9 : 0.7}
        />
      ))
    )}
  </g>
);

// ── Art Room ────────────────────────────────────────────────────────────────
const Easel = ({ c, a, v }: SpriteProps) => (
  <g>
    <path d="M50 30 L28 87" stroke={shade(c, -0.3)} strokeWidth="5" strokeLinecap="round" />
    <path d="M50 30 L72 87" stroke={shade(c, -0.3)} strokeWidth="5" strokeLinecap="round" />
    <rect x="24" y="30" width="52" height="38" rx="2" fill={c} />
    <rect x="28" y="34" width="44" height="30" rx="1" fill={v === 2 ? a : shade(c, 0.25)} />
    {v >= 1 && <path d="M32 58 Q44 42 56 56 Q64 46 68 58" stroke={a} strokeWidth="3" fill="none" />}
    <rect x="26" y="66" width="48" height="4" rx="2" fill={shade(c, -0.35)} />
  </g>
);

const Supplies = ({ c, a, v }: SpriteProps) => (
  <g>
    <rect x="22" y="62" width="56" height="25" rx="3" fill={c} />
    {[0, 1, 2].map((i) => (
      <g key={i} transform={`translate(${i * 17}, 0)`}>
        <rect x="28" y={v === 1 ? 40 : 48} width="11" height={v === 1 ? 22 : 14} rx="2" fill={a} opacity={0.9 - i * 0.2} />
        {v === 1 && <rect x="31" y="32" width="5" height="10" rx="2" fill={shade(a, -0.3)} />}
      </g>
    ))}
    {v === 2 && <circle cx="50" cy="36" r="9" fill={a} opacity="0.55" />}
  </g>
);

const WallArt = ({ c, a, v }: SpriteProps) => (
  <g>
    <rect x="18" y="30" width="64" height="48" rx="3" fill={shade(c, -0.35)} />
    <rect x="23" y="35" width="54" height="38" rx="2" fill={c} />
    {v === 0 && <path d="M32 62 L44 48 L54 58 L64 44" stroke={a} strokeWidth="3" fill="none" strokeLinecap="round" />}
    {v === 1 && (
      <>
        <path d="M23 60 L40 46 L52 58 L66 44 L77 56 L77 73 L23 73 Z" fill={a} opacity="0.8" />
        <circle cx="64" cy="44" r="5" fill={shade(a, 0.4)} />
      </>
    )}
    {v === 2 && (
      <>
        <ellipse cx="50" cy="54" rx="22" ry="14" fill={a} opacity="0.65" />
        {[[38, 48], [58, 60], [50, 44], [64, 50]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.8" fill="#fff" opacity="0.9" />
        ))}
      </>
    )}
  </g>
);

// ── Cafeteria ───────────────────────────────────────────────────────────────
const Counter = ({ c, a, v }: SpriteProps) => (
  <g>
    <rect x="14" y="52" width="72" height="35" rx="4" fill={c} />
    <rect x="14" y="48" width="72" height="8" rx="4" fill={shade(c, 0.2)} />
    {[0, 1, 2].map((i) => (
      <rect key={i} x={24 + i * 21} y="62" width="14" height="18" rx="2" fill={a} opacity={0.75} />
    ))}
    {v === 2 && <rect x="30" y="34" width="40" height="12" rx="4" fill={a} opacity="0.6" />}
    {v === 1 && <rect x="14" y="44" width="72" height="4" rx="2" fill={a} />}
  </g>
);

const CafeTables = ({ c, a, v }: SpriteProps) => (
  <g>
    {[0, 1].map((i) => (
      <g key={i} transform={`translate(${i * 40}, ${i * 6})`}>
        {v === 2 ? (
          <rect x="12" y="60" width="38" height="7" rx="3" fill={c} />
        ) : (
          <ellipse cx="31" cy="62" rx="19" ry="7" fill={c} />
        )}
        <rect x="29" y="66" width="5" height="20" fill={shade(c, -0.3)} />
        <ellipse cx="31" cy="86" rx="12" ry="4" fill={shade(c, -0.25)} />
        {v === 1 && <circle cx="31" cy="58" r="4" fill={a} />}
      </g>
    ))}
  </g>
);

const CafePlants = ({ c, a, v }: SpriteProps) => (
  <g>
    <path d="M50 70 Q34 54 38 34 Q50 46 50 70" fill={c} />
    <path d="M50 70 Q66 54 62 34 Q50 46 50 70" fill={shade(c, -0.15)} />
    {v >= 1 && <path d="M50 66 Q50 44 50 30" stroke={shade(c, -0.3)} strokeWidth="3" fill="none" />}
    {v === 2 &&
      [[40, 40], [60, 38], [50, 30]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4" fill={a} />
      ))}
    <path d="M38 70 L62 70 L58 88 L42 88 Z" fill={a} />
  </g>
);

// ── Theatre ─────────────────────────────────────────────────────────────────
const Stage = ({ c, a, v }: SpriteProps) => (
  <g>
    <rect x="10" y="60" width="80" height="10" rx="2" fill={shade(c, 0.18)} />
    <rect x="14" y="70" width="72" height="17" fill={c} />
    {v === 2 &&
      [[24, 76], [40, 80], [58, 75], [74, 81]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2" fill={a} />
      ))}
    {v === 1 && <rect x="14" y="70" width="72" height="4" fill={a} opacity="0.6" />}
  </g>
);

const Seats = ({ c, a, v }: SpriteProps) => (
  <g>
    {[0, 1].map((row) => (
      <g key={row} transform={`translate(${row * 6}, ${row * 12})`}>
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(${i * 24}, 0)`}>
            <rect x="14" y="62" width="18" height="12" rx="3" fill={c} />
            <rect x="14" y="52" width="18" height="12" rx="4" fill={shade(c, 0.15)} />
            {v === 2 && <rect x="17" y="55" width="12" height="5" rx="2" fill={a} opacity="0.8" />}
          </g>
        ))}
      </g>
    ))}
    {v === 1 && <rect x="10" y="86" width="80" height="3" rx="1.5" fill={a} opacity="0.5" />}
  </g>
);

const Curtain = ({ c, a, v }: SpriteProps) => (
  <g>
    <rect x="6" y="22" width="88" height="8" rx="4" fill={shade(c, -0.3)} />
    <path d="M6 30 Q18 56 14 78 L6 78 Z" fill={c} />
    <path d="M94 30 Q82 56 86 78 L94 78 Z" fill={c} />
    <path d="M6 30 Q50 44 94 30 L94 40 Q50 54 6 40 Z" fill={shade(c, 0.12)} />
    {v >= 1 && (
      <>
        <circle cx="14" cy="76" r="4" fill={a} />
        <circle cx="86" cy="76" r="4" fill={a} />
      </>
    )}
    {v === 2 &&
      [[28, 36], [50, 40], [72, 36]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.5" fill={a} opacity="0.9" />
      ))}
  </g>
);

// ── Garden ──────────────────────────────────────────────────────────────────
const Tree = ({ c, a, v }: SpriteProps) => (
  <g>
    <rect x="45" y="58" width="10" height="30" rx="3" fill={a} />
    {v === 2 ? (
      <>
        <circle cx="50" cy="40" r="26" fill={c} />
        <circle cx="32" cy="50" r="15" fill={shade(c, -0.12)} />
        <circle cx="68" cy="50" r="15" fill={shade(c, -0.12)} />
      </>
    ) : (
      <>
        <circle cx="50" cy="42" r={v === 1 ? 23 : 19} fill={c} />
        <circle cx="38" cy="50" r={v === 1 ? 13 : 10} fill={shade(c, -0.1)} />
        <circle cx="62" cy="50" r={v === 1 ? 13 : 10} fill={shade(c, -0.1)} />
      </>
    )}
    {v === 1 &&
      [[40, 32], [58, 36], [50, 26], [64, 48]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill="#fff" opacity="0.55" />
      ))}
  </g>
);

const Bench = ({ c, a, v }: SpriteProps) => (
  <g>
    {v === 2 && (
      <>
        <path d="M22 20 L22 46" stroke={a} strokeWidth="3" />
        <path d="M78 20 L78 46" stroke={a} strokeWidth="3" />
        <rect x="16" y="16" width="68" height="5" rx="2" fill={a} />
      </>
    )}
    <rect x="20" y="62" width="60" height="8" rx="3" fill={c} />
    <rect x="20" y="50" width="60" height="7" rx="3" fill={shade(c, 0.15)} />
    <rect x="24" y="70" width="6" height="17" fill={a} />
    <rect x="70" y="70" width="6" height="17" fill={a} />
    {v === 1 && <rect x="20" y="42" width="60" height="5" rx="2" fill={shade(c, 0.25)} />}
  </g>
);

const Flowers = ({ c, a, v }: SpriteProps) => (
  <g>
    {[0, 1, 2].map((i) => {
      const x = 28 + i * 22;
      const h = [22, 30, 26][i];
      return (
        <g key={i}>
          <path d={`M${x} 86 L${x} ${86 - h}`} stroke={a} strokeWidth="3" strokeLinecap="round" />
          {v === 2 ? (
            <>
              <circle cx={x} cy={86 - h - 4} r="6" fill={c} />
              <circle cx={x} cy={86 - h - 4} r="2.5" fill="#fff" opacity="0.8" />
            </>
          ) : (
            [0, 1, 2, 3].map((p) => (
              <circle
                key={p}
                cx={x + Math.cos((p * Math.PI) / 2) * 5}
                cy={86 - h - 3 + Math.sin((p * Math.PI) / 2) * 5}
                r="3.6"
                fill={c}
              />
            ))
          )}
          {v !== 2 && <circle cx={x} cy={86 - h - 3} r="2.4" fill={a} />}
        </g>
      );
    })}
  </g>
);

export const SLOT_SPRITES: Record<SchoolSlotId, (p: SpriteProps) => JSX.Element> = {
  board: Board,
  desks: Desks,
  teacherDesk: TeacherDesk,
  shelves: Shelves,
  nook: Nook,
  rug: Rug,
  booth: Booth,
  speakers: Speakers,
  labPoster: LabPoster,
  easel: Easel,
  supplies: Supplies,
  wallArt: WallArt,
  counter: Counter,
  cafeTables: CafeTables,
  cafePlants: CafePlants,
  stage: Stage,
  seats: Seats,
  curtain: Curtain,
  tree: Tree,
  bench: Bench,
  flowers: Flowers,
};

// Small standalone preview used by the shop list, so a player sees the actual
// object rather than a colour chip before spending on it.
export const SpritePreview = ({
  slot,
  palette,
  variant,
  size = 44,
}: {
  slot: SchoolSlotId;
  palette: { color: string; accent: string };
  variant: number;
  size?: number;
}) => {
  const Sprite = SLOT_SPRITES[slot];
  if (!Sprite) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <Sprite c={palette.color} a={palette.accent} v={variant} />
    </svg>
  );
};
