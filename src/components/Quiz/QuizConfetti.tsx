import React, { useEffect, useState } from "react";

interface Props {
  /** Set to true (from a false/undefined state) to fire one confetti burst. */
  active: boolean;
}

const COLORS = [
  "bg-red-400", "bg-orange-400", "bg-amber-400", "bg-yellow-400", "bg-lime-400",
  "bg-green-400", "bg-emerald-400", "bg-teal-400", "bg-cyan-400", "bg-sky-400",
  "bg-blue-400", "bg-indigo-400", "bg-violet-400", "bg-purple-400", "bg-fuchsia-400",
  "bg-pink-400", "bg-rose-400",
];

const SIZES = ["w-2 h-2", "w-2.5 h-2.5", "w-3 h-3", "w-3.5 h-3.5"];
const SHAPES = ["rounded-sm", "rounded-full"];

interface Piece {
  key: string;
  side: "left" | "right";
  color: string;
  size: string;
  shape: string;
  delay: number;
  dx: number;
  dy: number;
  rot: number;
  bottom: string;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makePieces(side: "left" | "right", count: number): Piece[] {
  return Array.from({ length: count }, (_, i) => {
    const spread = 100 + Math.random() * 300;
    return {
      key: `${side}-${i}`,
      side,
      color: pick(COLORS),
      size: pick(SIZES),
      shape: pick(SHAPES),
      delay: Math.random() * 0.3,
      dx: side === "left" ? spread : -spread,
      dy: -(160 + Math.random() * 320),
      rot: (side === "left" ? 1 : -1) * (360 + Math.random() * 540),
      bottom: `${Math.random() * 30}px`,
    };
  });
}

// Lightweight, pure-CSS confetti — no JS animation loop, no canvas. A fixed
// number of pieces animate once via a single keyframe (see App.css) and the
// whole layer unmounts shortly after, so there's nothing left running in
// the background.
const QuizConfetti: React.FC<Props> = ({ active }) => {
  const [pieces, setPieces] = useState<Piece[] | null>(null);

  useEffect(() => {
    if (!active) return;
    setPieces([...makePieces("left", 18), ...makePieces("right", 18)]);
    const timer = setTimeout(() => setPieces(null), 1700);
    return () => clearTimeout(timer);
  }, [active]);

  if (!pieces) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden pointer-events-none">
      {pieces.map((p) => (
        <div
          key={p.key}
          className={`absolute ${p.size} ${p.shape} ${p.color} animate-confetti-pop`}
          style={{
            [p.side === "left" ? "left" : "right"]: "-10px",
            bottom: p.bottom,
            animationDelay: `${p.delay}s`,
            "--confetti-dx": `${p.dx}px`,
            "--confetti-dy": `${p.dy}px`,
            "--confetti-rot": `${p.rot}deg`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};

export default QuizConfetti;
