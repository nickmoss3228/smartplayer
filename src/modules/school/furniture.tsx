// modules/school/furniture.tsx
//
// Every prop in the school, as placeholder box geometry.
//
// THIS IS THE FILE THAT GETS REPLACED when the designer's models arrive. Each
// prop is a self-contained component that receives nothing but its own local
// space — the caller has already applied position and rotation — so converting
// one is a body swap:
//
//   const Desk = () => {
//     const { scene } = useGLTF("/models/desk.glb");
//     return <primitive object={scene.clone()} />;
//   };
//
// Props can be converted one at a time; a half-converted scene renders fine.
// See docs/room-game-concept.md §6 for the export settings that make a model
// land in the right place without an offset.
//
// Conventions every prop below obeys, and every model must too: pivot on the
// floor at the centre of the footprint, front facing local +z, 1 unit = 1 metre.

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { PropInstance, SEAT_GAP } from "./props";

// A flat, slightly dusty palette. Deliberately narrow — a limited palette is
// most of what makes unrelated box props read as one set.
export const PALETTE = {
  wood: "#a9743f",
  woodDark: "#7d5530",
  woodLight: "#c69a68",
  metal: "#9aa3ad",
  metalDark: "#6f7883",
  board: "#35594a",
  chalkTray: "#d8cdb8",
  paper: "#f0ece2",
  glass: "#bcd9e8",
  frame: "#e6e2d8",
  leaf: "#4f8a54",
  leafDark: "#3d6d43",
  pot: "#b4593f",
  fabric: "#6b7bb5",
  fabricWarm: "#c2705f",
  screen: "#2f3d4a",
  gold: "#d8ae4a",
  stone: "#b9b3a6",
  water: "#7fb5c9",
  curtain: "#8e4b5e",
};

const BOOK_COLORS = ["#b5493f", "#3f6bb5", "#4f8a54", "#c9a227", "#7b4fa3", "#c2705f"];

// ── Tiny helpers ────────────────────────────────────────────────────────────

interface BoxProps {
  p: [number, number, number];
  s: [number, number, number];
  c: string;
  ry?: number;
}

/** A box whose y coordinate is its BOTTOM, not its centre — every prop below is
 *  authored standing on the floor, and doing the half-height arithmetic once
 *  here is what keeps the numbers in each prop readable as real dimensions. */
const Box = ({ p, s, c, ry = 0 }: BoxProps) => (
  <mesh position={[p[0], p[1] + s[1] / 2, p[2]]} rotation={[0, ry, 0]}>
    <boxGeometry args={s} />
    <meshLambertMaterial color={c} />
  </mesh>
);

// ── Seating and desks ───────────────────────────────────────────────────────

const Desk = () => (
  <group>
    <Box p={[0, 0.68, 0]} s={[1.15, 0.07, 0.6]} c={PALETTE.woodLight} />
    <Box p={[0, 0.62, -0.26]} s={[1.15, 0.06, 0.08]} c={PALETTE.woodDark} />
    <Box p={[-0.5, 0, -0.22]} s={[0.06, 0.68, 0.06]} c={PALETTE.metal} />
    <Box p={[0.5, 0, -0.22]} s={[0.06, 0.68, 0.06]} c={PALETTE.metal} />
    <Box p={[-0.5, 0, 0.22]} s={[0.06, 0.68, 0.06]} c={PALETTE.metal} />
    <Box p={[0.5, 0, 0.22]} s={[0.06, 0.68, 0.06]} c={PALETTE.metal} />
    {/* An open notebook, so an empty desk still looks used. */}
    <Box p={[0.16, 0.75, 0.02]} s={[0.34, 0.02, 0.24]} c={PALETTE.paper} />
  </group>
);

const Chair = () => (
  <group>
    <Box p={[0, 0.42, 0]} s={[0.44, 0.06, 0.44]} c={PALETTE.wood} />
    <Box p={[0, 0.48, 0.2]} s={[0.44, 0.44, 0.06]} c={PALETTE.wood} />
    <Box p={[-0.17, 0, -0.17]} s={[0.05, 0.42, 0.05]} c={PALETTE.metalDark} />
    <Box p={[0.17, 0, -0.17]} s={[0.05, 0.42, 0.05]} c={PALETTE.metalDark} />
    <Box p={[-0.17, 0, 0.17]} s={[0.05, 0.42, 0.05]} c={PALETTE.metalDark} />
    <Box p={[0.17, 0, 0.17]} s={[0.05, 0.42, 0.05]} c={PALETTE.metalDark} />
  </group>
);

const TeacherDesk = () => (
  <group>
    <Box p={[0, 0.72, 0]} s={[1.7, 0.08, 0.8]} c={PALETTE.wood} />
    <Box p={[0, 0, -0.28]} s={[1.6, 0.72, 0.12]} c={PALETTE.woodDark} />
    <Box p={[-0.7, 0, 0.3]} s={[0.12, 0.72, 0.12]} c={PALETTE.woodDark} />
    <Box p={[0.7, 0, 0.3]} s={[0.12, 0.72, 0.12]} c={PALETTE.woodDark} />
    <Box p={[-0.45, 0.8, 0]} s={[0.4, 0.06, 0.3]} c={PALETTE.paper} />
    <Box p={[0.5, 0.8, 0.05]} s={[0.18, 0.22, 0.18]} c={PALETTE.fabricWarm} />
  </group>
);

// ── The board ───────────────────────────────────────────────────────────────
// Interactive: tapping it chalks up a word you have learned.

const Board = ({
  len = 5,
  word,
  onTap,
}: {
  len?: number;
  word?: string | null;
  onTap?: () => void;
}) => (
  <group
    onClick={
      onTap
        ? (e) => {
            e.stopPropagation();
            onTap();
          }
        : undefined
    }
  >
    <Box p={[0, 1.0, 0]} s={[len + 0.2, 1.35, 0.08]} c={PALETTE.frame} />
    <Box p={[0, 1.08, 0.05]} s={[len, 1.15, 0.04]} c={PALETTE.board} />
    <Box p={[0, 0.94, 0.12]} s={[len, 0.07, 0.14]} c={PALETTE.chalkTray} />
    {word && (
      // DOM, not a texture on the board. The scene renders at ~38% resolution
      // and the isometric shear puts a letter at maybe four pixels wide — a
      // chalked word painted into the 3D scene is a smudge, not a word. The
      // speech bubbles already solved this the same way.
      <Html position={[0, 1.62, 0.12]} center style={{ pointerEvents: "none" }} zIndexRange={[10, 0]}>
        <div
          style={{
            color: "#f4f7f0",
            fontFamily: "'Bradley Hand', 'Segoe Script', 'Comic Sans MS', cursive",
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: 1,
            whiteSpace: "nowrap",
            textShadow: "0 1px 2px rgba(0,0,0,0.45)",
            opacity: 0.94,
          }}
        >
          {word}
        </div>
      </Html>
    )}
  </group>
);

// ── Storage and wall dressing ───────────────────────────────────────────────

const Bookshelf = ({ len = 1.8 }: { len?: number }) => (
  <group>
    <Box p={[0, 0, 0]} s={[len, 1.6, 0.34]} c={PALETTE.woodDark} />
    {[0.35, 0.78, 1.21].map((y, shelf) => (
      <group key={y}>
        <Box p={[0, y, 0.02]} s={[len - 0.1, 0.04, 0.3]} c={PALETTE.woodLight} />
        {Array.from({ length: Math.max(2, Math.floor(len * 4)) }).map((_, i) => {
          const step = (len - 0.2) / Math.max(2, Math.floor(len * 4));
          return (
            <Box
              key={i}
              p={[-(len - 0.2) / 2 + step * (i + 0.5), y + 0.04, 0.04]}
              s={[step * 0.75, 0.3 + ((i + shelf) % 3) * 0.04, 0.2]}
              c={BOOK_COLORS[(i + shelf) % BOOK_COLORS.length]}
            />
          );
        })}
      </group>
    ))}
  </group>
);

const Lockers = ({ len = 2.4 }: { len?: number }) => (
  <group>
    <Box p={[0, 0, 0]} s={[len, 1.25, 0.4]} c={PALETTE.metal} />
    {Array.from({ length: Math.max(2, Math.round(len / 0.6)) }).map((_, i, arr) => {
      const step = len / arr.length;
      const x = -len / 2 + step * (i + 0.5);
      return (
        <group key={i}>
          <Box p={[x, 0.05, 0.21]} s={[step * 0.88, 1.15, 0.02]} c="#7f8993" />
          <Box p={[x + step * 0.3, 0.7, 0.23]} s={[0.05, 0.05, 0.03]} c={PALETTE.gold} />
        </group>
      );
    })}
  </group>
);

const Poster = ({ tint = "#d98b6a" }: { tint?: string }) => (
  <group>
    <Box p={[0, 1.35, 0]} s={[0.92, 0.68, 0.03]} c={PALETTE.paper} />
    <Box p={[0, 1.42, 0.02]} s={[0.78, 0.44, 0.02]} c={tint} />
  </group>
);

const Banner = ({ len = 5 }: { len?: number }) => (
  <group>
    <Box p={[0, 1.9, 0]} s={[len, 0.9, 0.05]} c={PALETTE.curtain} />
    <Box p={[0, 2.05, 0.03]} s={[len - 0.5, 0.16, 0.02]} c={PALETTE.gold} />
    <Box p={[0, 2.78, 0]} s={[len + 0.3, 0.1, 0.1]} c={PALETTE.woodDark} />
  </group>
);

const Window = () => (
  <group>
    <Box p={[0, 1.05, 0]} s={[1.5, 1.3, 0.06]} c={PALETTE.frame} />
    <Box p={[0, 1.13, 0.04]} s={[1.32, 1.08, 0.02]} c={PALETTE.glass} />
    <Box p={[0, 1.13, 0.06]} s={[0.06, 1.08, 0.02]} c={PALETTE.frame} />
    <Box p={[0, 1.66, 0.06]} s={[1.32, 0.06, 0.02]} c={PALETTE.frame} />
    <Box p={[0, 0.98, 0.1]} s={[1.6, 0.08, 0.2]} c={PALETTE.frame} />
  </group>
);

const Door = () => (
  <group>
    <Box p={[0, 0, 0]} s={[0.12, 2.1, 1.05]} c={PALETTE.frame} />
    <Box p={[0.05, 0.05, 0]} s={[0.05, 1.95, 0.9]} c={PALETTE.wood} />
    <Box p={[0.1, 1.0, 0.32]} s={[0.05, 0.06, 0.14]} c={PALETTE.gold} />
  </group>
);

/** The one prop that moves on its own without being asked — a clock with a
 *  stopped hand reads as broken, and the whole point is that the room is alive. */
const Clock = () => {
  const hand = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (hand.current) hand.current.rotation.z = -clock.elapsedTime * 0.35;
  });
  return (
    <group>
      {/* Dark rim behind a pale face: at this render scale a single pale disc
          on a pale wall disappears into it. */}
      <mesh position={[0, 2.3, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.34, 0.34, 0.08, 14]} />
        <meshLambertMaterial color={PALETTE.metalDark} />
      </mesh>
      <mesh position={[0, 2.3, 0.11]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.27, 0.27, 0.04, 14]} />
        <meshLambertMaterial color={PALETTE.paper} />
      </mesh>
      <mesh ref={hand} position={[0, 2.3, 0.14]}>
        <boxGeometry args={[0.045, 0.36, 0.02]} />
        <meshLambertMaterial color={PALETTE.metalDark} />
      </mesh>
    </group>
  );
};

// ── Soft furnishings ────────────────────────────────────────────────────────

const Rug = () => (
  <group>
    <Box p={[0, 0.005, 0]} s={[3.2, 0.02, 2.4]} c={PALETTE.fabricWarm} />
    <Box p={[0, 0.015, 0]} s={[2.7, 0.02, 1.9]} c="#d99b7f" />
  </group>
);

const Armchair = () => (
  <group>
    <Box p={[0, 0.18, 0]} s={[0.8, 0.28, 0.8]} c={PALETTE.fabric} />
    <Box p={[0, 0, 0.32]} s={[0.8, 0.85, 0.16]} c={PALETTE.fabric} />
    <Box p={[-0.36, 0.18, 0]} s={[0.14, 0.28, 0.7]} c="#5a6aa2" />
    <Box p={[0.36, 0.18, 0]} s={[0.14, 0.28, 0.7]} c="#5a6aa2" />
    <Box p={[0, 0, 0]} s={[0.7, 0.18, 0.7]} c={PALETTE.woodDark} />
  </group>
);

const ReadingTable = () => (
  <group>
    <mesh position={[0, 0.55, 0]}>
      <cylinderGeometry args={[0.42, 0.42, 0.07, 12]} />
      <meshLambertMaterial color={PALETTE.woodLight} />
    </mesh>
    <Box p={[0, 0, 0]} s={[0.12, 0.55, 0.12]} c={PALETTE.woodDark} />
    <Box p={[0, 0, 0]} s={[0.5, 0.05, 0.5]} c={PALETTE.woodDark} />
    <Box p={[0.1, 0.59, 0]} s={[0.26, 0.05, 0.2]} c={BOOK_COLORS[1]} />
  </group>
);

const Bench = () => (
  <group>
    <Box p={[0, 0.42, 0]} s={[1.6, 0.08, 0.42]} c={PALETTE.wood} />
    <Box p={[0, 0.5, 0.18]} s={[1.6, 0.4, 0.07]} c={PALETTE.wood} />
    <Box p={[-0.65, 0, 0]} s={[0.09, 0.42, 0.38]} c={PALETTE.metalDark} />
    <Box p={[0.65, 0, 0]} s={[0.09, 0.42, 0.38]} c={PALETTE.metalDark} />
  </group>
);

const ChairRow = ({ len = 7 }: { len?: number }) => {
  const n = Math.max(2, Math.round(len / 0.62));
  return (
    <group>
      {Array.from({ length: n }).map((_, i) => (
        <group key={i} position={[-len / 2 + (len / n) * (i + 0.5), 0, 0]}>
          <Chair />
        </group>
      ))}
    </group>
  );
};

// ── Lab, hall, outdoors ─────────────────────────────────────────────────────

const Booth = () => (
  <group>
    <Box p={[0, 0.72, 0]} s={[1.5, 0.07, 0.72]} c={PALETTE.woodLight} />
    <Box p={[-0.72, 0, 0]} s={[0.06, 0.72, 0.68]} c={PALETTE.metal} />
    <Box p={[0.72, 0, 0]} s={[0.06, 0.72, 0.68]} c={PALETTE.metal} />
    {/* Privacy panels on three sides — what makes it a booth, not a desk. */}
    <Box p={[0, 0.79, -0.34]} s={[1.5, 0.5, 0.05]} c="#8a97a5" />
    <Box p={[-0.72, 0.79, 0]} s={[0.05, 0.5, 0.72]} c="#8a97a5" />
    <Box p={[0.72, 0.79, 0]} s={[0.05, 0.5, 0.72]} c="#8a97a5" />
    <Box p={[0, 0.79, -0.2]} s={[0.62, 0.42, 0.05]} c={PALETTE.screen} />
    <Box p={[-0.45, 0.79, 0.08]} s={[0.3, 0.08, 0.24]} c={PALETTE.metalDark} />
  </group>
);

const Speaker = () => (
  <group>
    <Box p={[0, 0, 0]} s={[0.36, 1.05, 0.32]} c={PALETTE.metalDark} />
    <mesh position={[0, 0.72, 0.17]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.11, 0.11, 0.03, 10]} />
      <meshLambertMaterial color="#3c444d" />
    </mesh>
    <mesh position={[0, 0.35, 0.17]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.07, 0.07, 0.03, 10]} />
      <meshLambertMaterial color="#3c444d" />
    </mesh>
  </group>
);

const StagePlatform = () => (
  <group>
    <Box p={[0, 0, 0]} s={[7.2, 0.42, 3.0]} c={PALETTE.woodDark} />
    <Box p={[0, 0.42, 0]} s={[7.0, 0.05, 2.85]} c={PALETTE.wood} />
    <Box p={[-3.6, 0.47, 0]} s={[0.5, 2.6, 2.9]} c={PALETTE.curtain} />
    <Box p={[3.6, 0.47, 0]} s={[0.5, 2.6, 2.9]} c={PALETTE.curtain} />
  </group>
);

const TrophyShelf = () => (
  <group>
    <Box p={[0, 0, 0]} s={[1.6, 1.2, 0.36]} c={PALETTE.woodDark} />
    <Box p={[0, 0.62, 0.02]} s={[1.5, 0.04, 0.32]} c={PALETTE.woodLight} />
    {[-0.45, 0, 0.45].map((x, i) => (
      <group key={x} position={[x, 0, 0]}>
        <Box p={[0, 0.66, 0.03]} s={[0.16, 0.06, 0.16]} c={PALETTE.woodLight} />
        <mesh position={[0, 0.86, 0.03]}>
          <cylinderGeometry args={[0.09, 0.05, 0.22, 8]} />
          <meshLambertMaterial color={i === 1 ? PALETTE.gold : PALETTE.metal} />
        </mesh>
      </group>
    ))}
  </group>
);

const Plant = () => (
  <group>
    <mesh position={[0, 0.16, 0]}>
      <cylinderGeometry args={[0.19, 0.15, 0.32, 8]} />
      <meshLambertMaterial color={PALETTE.pot} />
    </mesh>
    <Box p={[0, 0.32, 0]} s={[0.06, 0.34, 0.06]} c={PALETTE.leafDark} />
    <Box p={[-0.14, 0.55, 0.04]} s={[0.34, 0.1, 0.22]} c={PALETTE.leaf} ry={0.4} />
    <Box p={[0.16, 0.66, -0.03]} s={[0.32, 0.1, 0.2]} c={PALETTE.leafDark} ry={-0.6} />
    <Box p={[0.0, 0.78, 0.06]} s={[0.24, 0.1, 0.24]} c={PALETTE.leaf} ry={0.9} />
  </group>
);

const Bush = () => (
  <group>
    <Box p={[0, 0, 0]} s={[0.7, 0.42, 0.7]} c={PALETTE.leafDark} />
    <Box p={[0.05, 0.36, -0.04]} s={[0.5, 0.3, 0.5]} c={PALETTE.leaf} ry={0.5} />
  </group>
);

/** The only prop with idle motion of its own — the canopy sways, which does
 *  more for "this place is alive" outdoors than any number of extra people. */
const Tree = () => {
  const canopy = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (canopy.current) {
      canopy.current.rotation.z = Math.sin(clock.elapsedTime * 0.6) * 0.025;
    }
  });
  return (
    <group>
      <Box p={[0, 0, 0]} s={[0.4, 1.7, 0.4]} c={PALETTE.woodDark} />
      <group ref={canopy} position={[0, 1.7, 0]}>
        <Box p={[0, 0, 0]} s={[2.1, 0.8, 2.1]} c={PALETTE.leafDark} />
        <Box p={[0, 0.7, 0]} s={[1.5, 0.7, 1.5]} c={PALETTE.leaf} ry={0.6} />
        <Box p={[0, 1.3, 0]} s={[0.9, 0.5, 0.9]} c={PALETTE.leaf} ry={1.1} />
      </group>
    </group>
  );
};

const Fountain = () => {
  const jet = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (jet.current) {
      const s = 1 + Math.sin(clock.elapsedTime * 2.4) * 0.12;
      jet.current.scale.set(1, s, 1);
    }
  });
  return (
    <group>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[1.05, 1.15, 0.4, 12]} />
        <meshLambertMaterial color={PALETTE.stone} />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.92, 0.92, 0.06, 12]} />
        <meshLambertMaterial color={PALETTE.water} />
      </mesh>
      <mesh ref={jet} position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.1, 0.16, 0.7, 8]} />
        <meshLambertMaterial color="#a8d4e2" />
      </mesh>
    </group>
  );
};


// ── Stage 6+ : storage, English dressing, reception, outdoors ───────────────

const Cupboard = () => (
  <group>
    <Box p={[0, 0, 0]} s={[1.5, 1.85, 0.5]} c={PALETTE.woodDark} />
    <Box p={[-0.37, 0.06, 0.26]} s={[0.68, 1.72, 0.02]} c={PALETTE.wood} />
    <Box p={[0.37, 0.06, 0.26]} s={[0.68, 1.72, 0.02]} c={PALETTE.wood} />
    <Box p={[-0.06, 0.9, 0.29]} s={[0.05, 0.16, 0.04]} c={PALETTE.gold} />
    <Box p={[0.06, 0.9, 0.29]} s={[0.05, 0.16, 0.04]} c={PALETTE.gold} />
    <Box p={[0, 1.85, 0]} s={[1.3, 0.06, 0.4]} c={PALETTE.woodLight} />
    <Box p={[-0.3, 1.91, 0]} s={[0.34, 0.24, 0.24]} c={BOOK_COLORS[2]} />
    <Box p={[0.1, 1.91, 0]} s={[0.3, 0.2, 0.24]} c={BOOK_COLORS[0]} />
  </group>
);

/** Spins slowly. A globe that does not turn is just a ball on a stick. */
const Globe = () => {
  const ball = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ball.current) ball.current.rotation.y = clock.elapsedTime * 0.5;
  });
  return (
    <group>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.24, 0.3, 0.1, 10]} />
        <meshLambertMaterial color={PALETTE.woodDark} />
      </mesh>
      <Box p={[0, 0.1, 0]} s={[0.06, 0.42, 0.06]} c={PALETTE.metalDark} />
      <mesh ref={ball} position={[0, 0.78, 0]}>
        <sphereGeometry args={[0.28, 10, 8]} />
        <meshLambertMaterial color="#4a86b8" />
      </mesh>
      <mesh position={[0, 0.78, 0]} rotation={[0, 0, 0.35]}>
        <torusGeometry args={[0.3, 0.02, 6, 16]} />
        <meshLambertMaterial color={PALETTE.gold} />
      </mesh>
    </group>
  );
};

const Computer = () => {
  const screen = useRef<THREE.MeshLambertMaterial>(null);
  useFrame(({ clock }) => {
    if (!screen.current) return;
    // A slow brightness drift reads as "something is happening on it" without
    // costing a texture or a render target.
    const v = 0.55 + Math.sin(clock.elapsedTime * 1.7) * 0.12;
    screen.current.color.setRGB(v * 0.4, v * 0.7, v);
  });
  return (
    <group>
      <Box p={[0, 0.72, -0.1]} s={[0.1, 0.28, 0.1]} c={PALETTE.metalDark} />
      <Box p={[0, 0.66, -0.1]} s={[0.34, 0.05, 0.22]} c={PALETTE.metalDark} />
      <mesh position={[0, 1.14, -0.06]}>
        <boxGeometry args={[0.78, 0.5, 0.05]} />
        <meshLambertMaterial color={PALETTE.metalDark} />
      </mesh>
      <mesh position={[0, 1.14, -0.02]}>
        <boxGeometry args={[0.7, 0.42, 0.02]} />
        <meshLambertMaterial ref={screen} color="#3f7fa8" />
      </mesh>
      <Box p={[0, 0.72, 0.24]} s={[0.5, 0.03, 0.18]} c={PALETTE.frame} />
    </group>
  );
};

/** Hangs on the wall and stirs. The whole point of a flag is that it moves. */
const Flag = ({ tint = "#2b4c8c" }: { tint?: string }) => {
  const cloth = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (cloth.current) {
      cloth.current.rotation.z = -0.35 + Math.sin(clock.elapsedTime * 1.4) * 0.09;
    }
  });
  return (
    <group>
      <Box p={[0, 1.5, 0.06]} s={[0.05, 0.85, 0.05]} c={PALETTE.woodDark} />
      <group ref={cloth} position={[0.02, 2.3, 0.08]}>
        <mesh position={[0.26, -0.16, 0]}>
          <boxGeometry args={[0.52, 0.34, 0.02]} />
          <meshLambertMaterial color={tint} />
        </mesh>
        <mesh position={[0.13, -0.08, 0.015]}>
          <boxGeometry args={[0.24, 0.16, 0.01]} />
          <meshLambertMaterial color="#eceff2" />
        </mesh>
      </group>
    </group>
  );
};

/** A–Z frieze along the top of the wall. Reads as a stripe of letter-cards at
 *  this scale, which is exactly what it is in a real classroom. */
const Alphabet = ({ len = 6 }: { len?: number }) => {
  const n = Math.max(4, Math.round(len / 0.42));
  return (
    <group>
      {Array.from({ length: n }).map((_, i) => (
        <group key={i} position={[-len / 2 + (len / n) * (i + 0.5), 0, 0]}>
          <Box
            p={[0, 2.52, 0.02]}
            s={[(len / n) * 0.78, 0.3, 0.02]}
            c={i % 2 ? PALETTE.paper : "#f6e9c8"}
          />
          <Box p={[0, 2.6, 0.035]} s={[(len / n) * 0.3, 0.13, 0.01]} c={PALETTE.metalDark} />
        </group>
      ))}
    </group>
  );
};

const ReceptionDesk = ({ len = 3.4 }: { len?: number }) => (
  <group>
    <Box p={[0, 0, 0]} s={[len - 0.25, 1.05, 0.75]} c={PALETTE.woodDark} />
    <Box p={[0, 1.05, 0]} s={[len, 0.09, 0.95]} c={PALETTE.woodLight} />
    <Box p={[0, 0.1, 0.38]} s={[len - 0.45, 0.85, 0.03]} c={PALETTE.wood} />
    <Box p={[-len * 0.32, 1.14, 0.1]} s={[0.4, 0.03, 0.28]} c={PALETTE.paper} />
    <Box p={[len * 0.29, 1.14, 0.05]} s={[0.22, 0.26, 0.22]} c={PALETTE.leaf} />
    <Box p={[0.2, 1.14, 0.1]} s={[0.16, 0.12, 0.12]} c={PALETTE.gold} />
  </group>
);

const Sofa = () => (
  <group>
    <Box p={[0, 0.16, 0]} s={[1.9, 0.3, 0.85]} c={PALETTE.fabric} />
    <Box p={[0, 0, -0.36]} s={[1.9, 0.92, 0.16]} c={PALETTE.fabric} />
    <Box p={[-0.94, 0.16, 0]} s={[0.16, 0.4, 0.85]} c="#5a6aa2" />
    <Box p={[0.94, 0.16, 0]} s={[0.16, 0.4, 0.85]} c="#5a6aa2" />
    <Box p={[0, 0, 0]} s={[1.8, 0.16, 0.78]} c={PALETTE.woodDark} />
  </group>
);

const Noticeboard = ({ len = 2.2 }: { len?: number }) => (
  <group>
    <Box p={[0, 1.15, 0]} s={[len, 1.05, 0.06]} c={PALETTE.woodDark} />
    <Box p={[0, 1.22, 0.04]} s={[len - 0.16, 0.88, 0.02]} c="#c9b892" />
    {Array.from({ length: 5 }).map((_, i) => (
      <Box
        key={i}
        p={[-len / 2 + 0.28 + (i % 3) * (len / 3.4), 1.32 + Math.floor(i / 3) * 0.34, 0.06]}
        s={[0.3, 0.22, 0.01]}
        c={[PALETTE.paper, "#dfe7f2", "#f2e2df"][i % 3]}
      />
    ))}
  </group>
);

const Gate = () => (
  <group>
    <Box p={[-1.7, 0, 0]} s={[0.45, 2.9, 0.45]} c={PALETTE.stone} />
    <Box p={[1.7, 0, 0]} s={[0.45, 2.9, 0.45]} c={PALETTE.stone} />
    <Box p={[0, 2.9, 0]} s={[3.9, 0.4, 0.35]} c={PALETTE.stone} />
    <Box p={[0, 3.05, 0.12]} s={[2.4, 0.22, 0.04]} c={PALETTE.gold} />
    <Box p={[-1.35, 0.1, 0.5]} s={[0.06, 1.7, 1.0]} c={PALETTE.metalDark} />
    <Box p={[1.35, 0.1, 0.5]} s={[0.06, 1.7, 1.0]} c={PALETTE.metalDark} />
  </group>
);

const Signpost = () => (
  <group>
    <Box p={[0, 0, 0]} s={[0.14, 1.5, 0.14]} c={PALETTE.woodDark} />
    <Box p={[0, 1.15, 0.02]} s={[1.25, 0.62, 0.08]} c={PALETTE.paper} />
    <Box p={[0, 1.34, 0.07]} s={[0.95, 0.13, 0.02]} c={PALETTE.board} />
    <Box p={[0, 1.14, 0.07]} s={[0.7, 0.09, 0.02]} c={PALETTE.metalDark} />
  </group>
);

const Lamppost = () => (
  <group>
    <mesh position={[0, 0.1, 0]}>
      <cylinderGeometry args={[0.16, 0.22, 0.2, 8]} />
      <meshLambertMaterial color={PALETTE.metalDark} />
    </mesh>
    <Box p={[0, 0.2, 0]} s={[0.1, 2.5, 0.1]} c={PALETTE.metalDark} />
    <mesh position={[0, 2.85, 0]}>
      <boxGeometry args={[0.36, 0.34, 0.36]} />
      {/* Basic material: a lamp should not take its brightness from the sun. */}
      <meshBasicMaterial color="#ffe9b8" />
    </mesh>
    <Box p={[0, 3.02, 0]} s={[0.42, 0.08, 0.42]} c={PALETTE.metalDark} />
  </group>
);

const WaterCooler = () => {
  const bubble = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!bubble.current) return;
    const t = (clock.elapsedTime * 0.5) % 1;
    bubble.current.position.y = 1.02 + t * 0.28;
    bubble.current.scale.setScalar(Math.max(0.001, (1 - t) * 0.7));
  });
  return (
    <group>
      <Box p={[0, 0, 0]} s={[0.42, 0.95, 0.4]} c={PALETTE.frame} />
      <Box p={[0, 0.62, 0.21]} s={[0.16, 0.12, 0.06]} c={PALETTE.metalDark} />
      <mesh position={[0, 1.22, 0]}>
        <cylinderGeometry args={[0.19, 0.16, 0.55, 10]} />
        <meshLambertMaterial color="#a9d6e5" transparent opacity={0.85} />
      </mesh>
      <mesh ref={bubble} position={[0, 1.05, 0]}>
        <sphereGeometry args={[0.07, 6, 5]} />
        <meshLambertMaterial color="#ffffff" />
      </mesh>
    </group>
  );
};

const Bin = () => (
  <group>
    <mesh position={[0, 0.28, 0]}>
      <cylinderGeometry args={[0.21, 0.17, 0.56, 9]} />
      <meshLambertMaterial color="#5f6b73" />
    </mesh>
    <mesh position={[0, 0.58, 0]}>
      <cylinderGeometry args={[0.23, 0.23, 0.05, 9]} />
      <meshLambertMaterial color={PALETTE.metalDark} />
    </mesh>
  </group>
);

// ── Cafeteria and gym ───────────────────────────────────────────────────────

const CafeCounter = ({ len = 7 }: { len?: number }) => (
  <group>
    <Box p={[0, 0, 0]} s={[len, 1.0, 0.85]} c="#8f9aa6" />
    <Box p={[0, 1.0, 0]} s={[len + 0.15, 0.08, 1.0]} c={PALETTE.metal} />
    {/* Sneeze guard: the pane is what makes it read as a servery. */}
    <Box p={[0, 1.35, -0.3]} s={[len - 0.6, 0.5, 0.04]} c="#bcd9e8" />
    {Array.from({ length: 4 }).map((_, i) => (
      <Box
        key={i}
        p={[-len / 2 + 1 + i * ((len - 2) / 3), 1.08, 0.1]}
        s={[0.6, 0.14, 0.42]}
        c={[PALETTE.fabricWarm, PALETTE.leaf, PALETTE.gold, "#c9754a"][i]}
      />
    ))}
    <Box p={[len / 2 - 0.6, 1.08, 0.28]} s={[0.34, 0.2, 0.3]} c={PALETTE.paper} />
  </group>
);

const LongTable = ({ len = 8 }: { len?: number }) => {
  const seats = Math.max(3, Math.round(len / 1.6));
  return (
    <group>
      <Box p={[0, 0.72, 0]} s={[len, 0.08, 1.1]} c={PALETTE.woodLight} />
      <Box p={[-len / 2 + 0.4, 0, 0]} s={[0.12, 0.72, 0.9]} c={PALETTE.metalDark} />
      <Box p={[len / 2 - 0.4, 0, 0]} s={[0.12, 0.72, 0.9]} c={PALETTE.metalDark} />
      {/* Benches rather than chairs — faster to read, and true to a canteen. */}
      <Box p={[0, 0.42, -0.85]} s={[len - 0.6, 0.07, 0.36]} c={PALETTE.wood} />
      <Box p={[0, 0.42, 0.85]} s={[len - 0.6, 0.07, 0.36]} c={PALETTE.wood} />
      {Array.from({ length: seats }).map((_, i) => (
        <Box
          key={i}
          p={[-len / 2 + 0.8 + i * ((len - 1.6) / (seats - 1)), 0.8, i % 2 ? 0.22 : -0.22]}
          s={[0.34, 0.04, 0.26]}
          c={i % 3 === 0 ? PALETTE.fabricWarm : PALETTE.frame}
        />
      ))}
    </group>
  );
};

const WallBars = ({ len = 5 }: { len?: number }) => (
  <group>
    <Box p={[-len / 2, 0, 0]} s={[0.14, 2.6, 0.16]} c={PALETTE.wood} />
    <Box p={[len / 2, 0, 0]} s={[0.14, 2.6, 0.16]} c={PALETTE.wood} />
    {Array.from({ length: 9 }).map((_, i) => (
      <Box key={i} p={[0, 0.25 + i * 0.26, 0.02]} s={[len, 0.08, 0.1]} c={PALETTE.woodLight} />
    ))}
  </group>
);

const Hoop = () => (
  <group>
    <Box p={[0, 0, 0]} s={[0.16, 2.9, 0.16]} c={PALETTE.metalDark} />
    <Box p={[0, 2.35, 0.32]} s={[0.08, 0.75, 0.9]} c={PALETTE.paper} />
    <mesh position={[0, 2.5, 0.72]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.28, 0.035, 6, 14]} />
      <meshLambertMaterial color="#d1533f" />
    </mesh>
    <mesh position={[0, 2.3, 0.72]}>
      <coneGeometry args={[0.26, 0.4, 8, 1, true]} />
      <meshLambertMaterial color="#e8e4da" transparent opacity={0.75} side={THREE.DoubleSide} />
    </mesh>
  </group>
);

const Mat = () => (
  <group>
    <Box p={[0, 0, 0]} s={[1.3, 0.14, 2.0]} c="#3f7fa8" />
    <Box p={[0, 0.14, 0]} s={[1.15, 0.02, 1.85]} c="#4f92bb" />
  </group>
);

const Vault = () => (
  <group>
    <Box p={[0, 0.75, 0]} s={[0.75, 0.45, 1.5]} c="#b58b52" />
    <Box p={[0, 1.2, 0]} s={[0.62, 0.12, 1.35]} c="#8a5c30" />
    <Box p={[-0.24, 0, -0.5]} s={[0.09, 0.78, 0.09]} c={PALETTE.metalDark} />
    <Box p={[0.24, 0, -0.5]} s={[0.09, 0.78, 0.09]} c={PALETTE.metalDark} />
    <Box p={[-0.24, 0, 0.5]} s={[0.09, 0.78, 0.09]} c={PALETTE.metalDark} />
    <Box p={[0.24, 0, 0.5]} s={[0.09, 0.78, 0.09]} c={PALETTE.metalDark} />
  </group>
);

/** The score ticks over on its own — the one prop in the gym that says a game
 *  is being played rather than the room merely existing. */
const Scoreboard = () => {
  const home = useRef<THREE.Mesh>(null);
  const away = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (home.current) home.current.scale.y = 0.6 + ((Math.floor(t / 3.1) % 4) + 1) * 0.12;
    if (away.current) away.current.scale.y = 0.6 + ((Math.floor(t / 4.3) % 4) + 1) * 0.12;
  });
  return (
    <group>
      <Box p={[0, 2.0, 0]} s={[1.7, 0.95, 0.12]} c={PALETTE.metalDark} />
      <Box p={[0, 2.08, 0.07]} s={[1.5, 0.75, 0.02]} c="#1d2733" />
      <mesh ref={home} position={[-0.36, 2.45, 0.1]}>
        <boxGeometry args={[0.28, 0.4, 0.02]} />
        <meshBasicMaterial color="#e8734a" />
      </mesh>
      <mesh ref={away} position={[0.36, 2.45, 0.1]}>
        <boxGeometry args={[0.28, 0.4, 0.02]} />
        <meshBasicMaterial color="#4ac4e8" />
      </mesh>
    </group>
  );
};

// ── Dispatch ────────────────────────────────────────────────────────────────

export interface FurnishingsProps {
  props: PropInstance[];
  /** Word currently chalked on the classroom board, if any. */
  boardWord?: string | null;
  onBoardTap?: () => void;
}

const PropNode = ({
  p,
  boardWord,
  onBoardTap,
}: {
  p: PropInstance;
  boardWord?: string | null;
  onBoardTap?: () => void;
}) => {
  switch (p.type) {
    case "desk":
      return <Desk />;
    case "chair":
      return <Chair />;
    case "teacherDesk":
      return <TeacherDesk />;
    case "board":
      return <Board len={p.len} word={boardWord} onTap={onBoardTap} />;
    case "bookshelf":
      return <Bookshelf len={p.len} />;
    case "lockers":
      return <Lockers len={p.len} />;
    case "poster":
      return <Poster tint={p.tint} />;
    case "banner":
      return <Banner len={p.len} />;
    case "window":
      return <Window />;
    case "door":
      return <Door />;
    case "clock":
      return <Clock />;
    case "rug":
      return <Rug />;
    case "armchair":
      return <Armchair />;
    case "readingTable":
      return <ReadingTable />;
    case "bench":
      return <Bench />;
    case "chairRow":
      return <ChairRow len={p.len} />;
    case "booth":
      return <Booth />;
    case "speaker":
      return <Speaker />;
    case "stagePlatform":
      return <StagePlatform />;
    case "trophyShelf":
      return <TrophyShelf />;
    case "plant":
      return <Plant />;
    case "bush":
      return <Bush />;
    case "tree":
      return <Tree />;
    case "fountain":
      return <Fountain />;
    case "cupboard":
      return <Cupboard />;
    case "globe":
      return <Globe />;
    case "computer":
      return <Computer />;
    case "flag":
      return <Flag tint={p.tint} />;
    case "alphabet":
      return <Alphabet len={p.len} />;
    case "receptionDesk":
      return <ReceptionDesk len={p.len} />;
    case "sofa":
      return <Sofa />;
    case "noticeboard":
      return <Noticeboard len={p.len} />;
    case "gate":
      return <Gate />;
    case "signpost":
      return <Signpost />;
    case "lamppost":
      return <Lamppost />;
    case "waterCooler":
      return <WaterCooler />;
    case "bin":
      return <Bin />;
    case "cafeCounter":
      return <CafeCounter len={p.len} />;
    case "longTable":
      return <LongTable len={p.len} />;
    case "wallBars":
      return <WallBars len={p.len} />;
    case "hoop":
      return <Hoop />;
    case "mat":
      return <Mat />;
    case "scoreboard":
      return <Scoreboard />;
    case "vault":
      return <Vault />;
    default:
      return null;
  }
};

export const Furnishings = ({ props, boardWord, onBoardTap }: FurnishingsProps) => (
  <>
    {props.map((p) => (
      <group key={p.key} position={[p.x, 0, p.z]} rotation={[0, p.ry, 0]}>
        <PropNode p={p} boardWord={boardWord} onBoardTap={onBoardTap} />
      </group>
    ))}
  </>
);

/** Desks and their chairs, kept separate from Furnishings because they are the
 *  one group of props the player can rearrange. */
export const Deskware = ({ desks }: { desks: { x: number; z: number; ry: number }[] }) => (
  <>
    {desks.map((d, i) => (
      <group key={i} position={[d.x, 0, d.z]} rotation={[0, d.ry, 0]}>
        <Desk />
        <group position={[0, 0, SEAT_GAP]}>
          <Chair />
        </group>
      </group>
    ))}
  </>
);
