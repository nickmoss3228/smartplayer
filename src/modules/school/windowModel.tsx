// modules/school/windowModel.tsx
//
// One school window, seen from inside a room or from outside the building —
// the same size, at the same height, in the same frame (windowLayout.ts), so
// the two views are recognisably the same windows.
//
// It used to be a pale square in a frame. What makes a window read as a
// window at this render scale is its structure, not its glass: a frame deep
// enough to cast an edge, a cross of glazing bars that splits it into panes
// with a top light, a sill that sticks out below and, by day, a streak of sky
// on the glass. From outside it gets a stone lintel; from inside, curtains on a
// rail. By night the glass glows from outside and goes dark from inside.
//
// Authored like every wall prop: width along local x, the wall's face at
// local z = 0, the room (or the street) toward +z, heights from the floor.

import * as THREE from "three";
import { WINDOW } from "./windowLayout";
import { WINDOW_DAY, WINDOW_LIT, useAtmosphere } from "./atmosphere";

const P = {
  /** The sky, seen from inside by day. */
  dayGlass: "#bcd9e8",
  /** The night, seen from inside a lit room. */
  nightGlass: "#27314a",
  glint: "#eef7fb",
  sill: "#d9d3c6",
  lintel: "#cbc3b2",
  rail: "#6f7883",
  curtain: "#8e4b5e",
};

/** A curtain's fold: its own colour, a shade darker. */
const fold = (c: string) => `#${new THREE.Color(c).multiplyScalar(0.72).getHexString()}`;

const W = WINDOW.width;
const Y0 = WINDOW.sill;
const Y1 = WINDOW.head;
const H = Y1 - Y0;
const MID = (Y0 + Y1) / 2;
/** Frame bar thickness, and how far the frame stands off the wall. */
const BAR = 0.09;
const DEPTH = 0.09;
/** Where the top light's bar crosses. */
const TRANSOM_Y = Y1 - 0.44;

const Part = ({
  at,
  size,
  color,
  rz = 0,
  basic = false,
}: {
  at: [number, number, number];
  size: [number, number, number];
  color: string;
  rz?: number;
  basic?: boolean;
}) => (
  <mesh position={at} rotation={[0, 0, rz]}>
    <boxGeometry args={size} />
    {basic ? <meshBasicMaterial color={color} /> : <meshLambertMaterial color={color} />}
  </mesh>
);

export const SchoolWindow = ({
  face,
  frame,
  curtain = P.curtain,
}: {
  /** Which side of the wall this is: a room's ("in") or the street's ("out"). */
  face: "in" | "out";
  /** Frame colour: the school's trim from outside, the room's from inside. */
  frame: string;
  /** Inside only. */
  curtain?: string;
}) => {
  const { lightsOn } = useAtmosphere();
  const inside = face === "in";
  // From outside a lit window is the loudest thing on the facade; from inside
  // it is a black pane, because the night is on the other side of it.
  const glass = lightsOn ? (inside ? P.nightGlass : WINDOW_LIT) : inside ? P.dayGlass : WINDOW_DAY;
  const glowing = lightsOn && !inside;
  const inner = W - 2 * BAR;

  return (
    <group>
      {/* The glass, set back inside the frame. */}
      <Part at={[0, MID, 0.015]} size={[inner, H - 2 * BAR, 0.02]} color={glass} basic={glowing} />

      {/* Frame: four bars standing off the wall. */}
      <Part at={[0, Y1 - BAR / 2, DEPTH / 2]} size={[W, BAR, DEPTH]} color={frame} />
      <Part at={[0, Y0 + BAR / 2, DEPTH / 2]} size={[W, BAR, DEPTH]} color={frame} />
      <Part at={[-(W - BAR) / 2, MID, DEPTH / 2]} size={[BAR, H, DEPTH]} color={frame} />
      <Part at={[(W - BAR) / 2, MID, DEPTH / 2]} size={[BAR, H, DEPTH]} color={frame} />

      {/* Glazing bars: a mullion down the middle, and a transom under a top
          light — the classic school sash. */}
      <Part at={[0, MID, 0.045]} size={[0.06, H - 2 * BAR, 0.05]} color={frame} />
      <Part at={[0, TRANSOM_Y, 0.045]} size={[inner, 0.06, 0.05]} color={frame} />

      {/* A streak of reflected sky across the lower panes, by day only. */}
      {!lightsOn && (
        <>
          <Part at={[-0.3, Y0 + 0.5, 0.03]} size={[0.07, 0.42, 0.01]} color={P.glint} rz={-0.55} />
          <Part at={[0.28, Y0 + 0.42, 0.03]} size={[0.05, 0.26, 0.01]} color={P.glint} rz={-0.55} />
        </>
      )}

      {/* The sill, proud of the wall on whichever side this is. */}
      <Part at={[0, Y0 - 0.035, 0.08]} size={[W + 0.2, 0.07, 0.16]} color={P.sill} />

      {inside ? (
        <>
          {/* A rail and two curtains drawn back to the sides. */}
          <Part at={[0, Y1 + 0.14, 0.13]} size={[W + 0.54, 0.05, 0.05]} color={P.rail} />
          {[-1, 1].map((s) => (
            <group key={s}>
              <Part at={[s * (W / 2 + 0.12), MID + 0.06, 0.13]} size={[0.26, H + 0.2, 0.05]} color={curtain} />
              {/* One fold, a shade darker, so it hangs rather than sits flat. */}
              <Part at={[s * (W / 2 + 0.07), MID + 0.06, 0.16]} size={[0.05, H + 0.2, 0.02]} color={fold(curtain)} />
            </group>
          ))}
        </>
      ) : (
        /* A stone lintel over the opening. */
        <Part at={[0, Y1 + 0.06, 0.03]} size={[W + 0.16, 0.12, 0.06]} color={P.lintel} />
      )}
    </group>
  );
};
