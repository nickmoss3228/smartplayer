// modules/school/Building.tsx
//
// Floors and walls. The camera looks down from +x/+z, so only the north and
// west walls of a room are ever drawn: the other two would stand between the
// camera and the furniture. That is the classic isometric cutaway, and it is
// also why a classroom's board lives on the north wall — it is one of the two
// you can actually see.
//
// Walls are built SPAN BY SPAN rather than as one box each, because two
// separate things interrupt them:
//
//   • where another room sits behind this one, the wall drops to knee height,
//     or the room behind would be hidden by the room in front;
//   • where a doorway crosses, there is no wall at all.
//
// The second is not cosmetic. The router in props.ts sends people through door
// points on shared edges, and until those points were also cut out of the
// geometry, everybody walked through solid walls.

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SchoolRoomRect, SchoolSurface } from "../../config/schoolCatalog";
import { SchoolPlan, WALL_T, WallOpening, WallSide, boundaryOpenings } from "./props";
import { nearest, usePresence } from "./presence";
import { WINDOW_DAY, WINDOW_LIT, useAtmosphere } from "./atmosphere";
import { Rise } from "./Arrival";
import { FacadeLook, OutsideLook, RoofLook, outsideLook } from "./exterior";
import { NEON } from "./lampLayout";
import { neonTube, neonWash } from "./glowMaterials";
import { ROOF_TOP_Y, RoofRect, fasciaTriangles, finishRects, hipRoofTriangles, roofField, roofLattice } from "./roof";
import { floorTexture, grassTexture, roofTilesTexture } from "./textures";

const WALL_H = 3.0;
const PARTITION_H = 0.95;
const TRIM_H = 0.16;
/** The yard and the forecourt are walled too — they are the school's grounds,
 *  not a hole in the world. Chest height where they face the street, and lower
 *  still on the two sides the camera looks over, so the garden reads as
 *  enclosed without hiding the people in it. */
const GARDEN_H = 1.5;
const GARDEN_LIP = 0.8;
/** Height of a door hole; anything above it stays as a lintel. */
const DOOR_H = 2.1;
/** Roof deck and its parapet. Deliberately unrelated to the wallpaper: the roof
 *  is most of the exterior view, and tinting it with the walls made the whole
 *  building one flat colour. */
const ROOF = "#6f7683";
const ROOF_EDGE = "#575d68";

/** Window positions along a facade run, inset from both ends. */
function facadeWindows(from: number, to: number): number[] {
  const out: number[] = [];
  for (let at = from + 1.6; at < to - 1.2; at += 2.6) out.push(Number(at.toFixed(2)));
  return out;
}

interface Segment {
  from: number;
  to: number;
  height: number;
}

type Side = WallSide;
type SideOpenings = Record<Side, WallOpening[]>;

/** Which axis a side's wall runs along, and where it sits on the other one. */
function sideGeometry(room: SchoolRoomRect, side: Side) {
  switch (side) {
    case "north":
      return { axis: "x" as const, fixed: room.z - WALL_T / 2, from: room.x - WALL_T / 2, to: room.x + room.w + WALL_T / 2 };
    case "south":
      return { axis: "x" as const, fixed: room.z + room.d + WALL_T / 2, from: room.x - WALL_T / 2, to: room.x + room.w + WALL_T / 2 };
    case "west":
      return { axis: "z" as const, fixed: room.x - WALL_T / 2, from: room.z - WALL_T / 2, to: room.z + room.d + WALL_T / 2 };
    default:
      return { axis: "z" as const, fixed: room.x + room.w + WALL_T / 2, from: room.z - WALL_T / 2, to: room.z + room.d + WALL_T / 2 };
  }
}

/**
 * Spans of a side that another room is pressed against. In the cutaway these
 * drop to knee height; in the exterior view they are skipped entirely, since
 * the neighbour draws the same wall and two coplanar boxes z-fight.
 *
 * `indoorOnly` is what the exterior view passes, and it is load-bearing. An
 * OUTDOOR neighbour — the courtyard, the forecourt — draws no walls at all, so
 * treating it as covering the boundary left both sides drawing nothing: an open
 * gap in the facade looking straight into the corridor, with everybody inside
 * it plainly visible. A building needs a wall facing its own courtyard.
 */
function neighbourSpans(
  room: SchoolRoomRect,
  rooms: SchoolRoomRect[],
  side: Side,
  indoorOnly = false,
): [number, number][] {
  const g = sideGeometry(room, side);
  const out: [number, number][] = [];
  for (const o of rooms) {
    if (o.id === room.id) continue;
    if (indoorOnly && o.outdoor) continue;
    const touches =
      side === "north" ? Math.abs(o.z + o.d - room.z) < 0.01
      : side === "south" ? Math.abs(o.z - (room.z + room.d)) < 0.01
      : side === "west" ? Math.abs(o.x + o.w - room.x) < 0.01
      : Math.abs(o.x - (room.x + room.w)) < 0.01;
    if (!touches) continue;
    const span = g.axis === "x"
      ? overlapSpan(o.x, o.x + o.w, g.from, g.to)
      : overlapSpan(o.z, o.z + o.d, g.from, g.to);
    if (span) out.push(span);
  }
  return out;
}

const overlapSpan = (a0: number, a1: number, b0: number, b1: number): [number, number] | null => {
  const lo = Math.max(a0, b0);
  const hi = Math.min(a1, b1);
  return hi - lo > 0.01 ? [lo, hi] : null;
};

/**
 * Chops a wall run into pieces at every height change and every doorway.
 *
 * Classifies by MIDPOINT rather than by endpoint: after collecting the cut
 * positions, each elementary span is judged by what is true at its centre,
 * which sidesteps every off-by-an-epsilon question about which side of a
 * boundary a span belongs to.
 */
function wallSegments(
  from: number,
  to: number,
  kneeSpans: [number, number][],
  openings: WallOpening[],
  full = WALL_H,
): Segment[] {
  const cuts = new Set<number>([from, to]);
  const add = (v: number) => {
    if (v > from + 0.001 && v < to - 0.001) cuts.add(v);
  };
  for (const [a, b] of kneeSpans) {
    add(a);
    add(b);
  }
  for (const o of openings) {
    add(o.at - o.width / 2);
    add(o.at + o.width / 2);
  }

  const marks = [...cuts].sort((a, b) => a - b);
  const out: Segment[] = [];
  for (let i = 0; i < marks.length - 1; i++) {
    const a = marks[i];
    const b = marks[i + 1];
    if (b - a < 0.01) continue;
    const mid = (a + b) / 2;
    if (openings.some((o) => Math.abs(mid - o.at) < o.width / 2 - 0.001)) continue;
    const knee = kneeSpans.some(([s, e]) => mid > s + 0.001 && mid < e - 0.001);
    out.push({ from: a, to: b, height: knee ? Math.min(PARTITION_H, full) : full });
  }
  return out;
}

const WallPiece = ({
  axis,
  from,
  to,
  fixed,
  height,
  color,
  trim,
  texture,
}: {
  /** "x" for a north wall (runs east-west), "z" for a west wall. */
  axis: "x" | "z";
  from: number;
  to: number;
  fixed: number;
  height: number;
  color: string;
  trim: string;
  /** A facade: brick, boards, stone. One tile per metre of wall. */
  texture?: (() => THREE.Texture) | null;
}) => {
  const len = to - from;
  const mid = (from + to) / 2;
  // Repeat lives on the texture, so each piece gets its own copy sized to it.
  // The copies share one image, so this costs an object, not an upload.
  const map = useMemo(() => {
    if (!texture) return null;
    const t = texture().clone();
    t.needsUpdate = true;
    t.repeat.set(len, height);
    return t;
  }, [texture, len, height]);
  const pos: [number, number, number] = axis === "x" ? [mid, 0, fixed] : [fixed, 0, mid];
  const size: [number, number, number] =
    axis === "x" ? [len, height, WALL_T] : [WALL_T, height, len];
  const skirt: [number, number, number] =
    axis === "x" ? [len, TRIM_H, WALL_T + 0.02] : [WALL_T + 0.02, TRIM_H, len];
  const cap: [number, number, number] =
    axis === "x" ? [len, 0.08, WALL_T + 0.06] : [WALL_T + 0.06, 0.08, len];

  return (
    <group position={pos}>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={size} />
        <meshLambertMaterial color={color} map={map} />
      </mesh>
      {/* Skirting board. Two-tone walls stop a flat colour reading as fog. */}
      <mesh position={[0, TRIM_H / 2, 0]}>
        <boxGeometry args={skirt} />
        <meshLambertMaterial color={trim} />
      </mesh>
      <mesh position={[0, height, 0]}>
        <boxGeometry args={cap} />
        <meshLambertMaterial color={trim} />
      </mesh>
    </group>
  );
};

/** The frame around a hole: two jambs, and a lintel when the wall it pierces is
 *  tall enough to have one. Without this a doorway reads as a wall somebody
 *  forgot to finish. */
const Doorway = ({
  axis,
  at,
  width,
  fixed,
  wallHeight,
  trim,
}: {
  axis: "x" | "z";
  at: number;
  width: number;
  fixed: number;
  wallHeight: number;
  trim: string;
}) => {
  const jamb = 0.12;
  const pos: [number, number, number] = axis === "x" ? [at, 0, fixed] : [fixed, 0, at];
  const half = width / 2;
  const lintel = wallHeight > DOOR_H + 0.2;
  const h = lintel ? DOOR_H : wallHeight;

  const jambSize: [number, number, number] =
    axis === "x" ? [jamb, h, WALL_T + 0.04] : [WALL_T + 0.04, h, jamb];
  const headSize: [number, number, number] =
    axis === "x"
      ? [width + jamb * 2, wallHeight - h, WALL_T + 0.04]
      : [WALL_T + 0.04, wallHeight - h, width + jamb * 2];

  return (
    <group position={pos}>
      <mesh position={axis === "x" ? [-half, h / 2, 0] : [0, h / 2, -half]}>
        <boxGeometry args={jambSize} />
        <meshLambertMaterial color={trim} />
      </mesh>
      <mesh position={axis === "x" ? [half, h / 2, 0] : [0, h / 2, half]}>
        <boxGeometry args={jambSize} />
        <meshLambertMaterial color={trim} />
      </mesh>
      {lintel && (
        <mesh position={[0, h + (wallHeight - h) / 2, 0]}>
          <boxGeometry args={headSize} />
          <meshLambertMaterial color={trim} />
        </mesh>
      )}
    </group>
  );
};

/** How close somebody has to be before a front door opens for them, and how
 *  far the leaves swing. */
const DOOR_REACH = 1.9;
const DOOR_SWING = 1.35;

/**
 * A door in an outside wall: the frame, two leaves, and a dark lobby behind.
 *
 * The leaves OPEN. They used to be one solid slab filling the hole, which was
 * right for hiding the interior and wrong for everything else: the exterior
 * view keeps every walker's route, so people crossing from the corridor to the
 * yard walked straight through a closed door. Now each door watches the
 * presence registry and swings outward whenever somebody is within reach.
 *
 * The dark box just inside is what keeps an open door from being a peephole.
 * Indoors, the exterior view draws no floor and no furniture — only the people
 * — so what you would see through the gap is the void under the roof. A
 * shadowed vestibule is what a real doorway looks like from outside anyway.
 */
const FrontDoor = ({
  axis,
  at,
  width,
  fixed,
  trim,
  outward,
  leafColor = "#8a5a34",
}: {
  axis: "x" | "z";
  at: number;
  width: number;
  fixed: number;
  trim: string;
  /** Which way is outside, along the wall's normal: +1 for south/east, -1 for
   *  north/west. The leaves swing that way, the lobby goes the other. */
  outward: 1 | -1;
  leafColor?: string;
}) => {
  const h = DOOR_H;
  const half = width / 2;
  const leafW = half - 0.02;
  const pos: [number, number, number] = axis === "x" ? [at, 0, fixed] : [fixed, 0, at];
  const step: [number, number, number] =
    axis === "x" ? [width + 0.5, 0.12, 0.7] : [0.7, 0.12, width + 0.5];
  const stepAt = WALL_T / 2 + 0.35;
  const presence = usePresence();

  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const swing = useRef(0);

  useFrame((_, dt) => {
    const [wx, wz] = axis === "x" ? [at, fixed] : [fixed, at];
    const want = nearest(presence, wx, wz) < DOOR_REACH ? 1 : 0;
    swing.current += (want - swing.current) * Math.min(1, dt * 5);
    const a = swing.current * DOOR_SWING;
    // Rotation about y maps local +x to (cos a, -sin a) and +z to (sin a, cos a).
    // Each leaf hangs from its own jamb and reaches in toward the middle, so the
    // sign that sends it OUTWARD differs per leaf and per wall axis.
    if (left.current) left.current.rotation.y = axis === "x" ? -outward * a : outward * a;
    if (right.current) right.current.rotation.y = axis === "x" ? outward * a : -outward * a;
  });

  const leafSize: [number, number, number] =
    axis === "x" ? [leafW, h - 0.04, 0.08] : [0.08, h - 0.04, leafW];
  const lobbySize: [number, number, number] =
    axis === "x" ? [width, h, 0.7] : [0.7, h, width];
  const lobbyAt = -outward * (WALL_T / 2 + 0.36);

  return (
    <group position={pos}>
      <Doorway axis={axis} at={0} width={width} fixed={0} wallHeight={WALL_H} trim={trim} />
      <mesh position={axis === "x" ? [0, h / 2, lobbyAt] : [lobbyAt, h / 2, 0]}>
        <boxGeometry args={lobbySize} />
        <meshBasicMaterial color="#1c2130" />
      </mesh>
      {/* Two leaves, each on its own jamb. */}
      <group ref={left} position={axis === "x" ? [-half, 0, 0] : [0, 0, -half]}>
        <mesh position={axis === "x" ? [leafW / 2, h / 2, 0] : [0, h / 2, leafW / 2]}>
          <boxGeometry args={leafSize} />
          <meshLambertMaterial color={leafColor} />
        </mesh>
      </group>
      <group ref={right} position={axis === "x" ? [half, 0, 0] : [0, 0, half]}>
        <mesh position={axis === "x" ? [-leafW / 2, h / 2, 0] : [0, h / 2, -leafW / 2]}>
          <boxGeometry args={leafSize} />
          <meshLambertMaterial color={leafColor} />
        </mesh>
      </group>
      {/* A step outside: cheap, and it is what reads as a main entrance rather
          than a cupboard. */}
      <mesh
        position={
          axis === "x" ? [0, 0.06, outward * stepAt] : [outward * stepAt, 0.06, 0]
        }
      >
        <boxGeometry args={step} />
        <meshLambertMaterial color="#9a958a" />
      </mesh>
    </group>
  );
};

const Floor = ({ room, floor }: { room: SchoolRoomRect; floor: SchoolSurface }) => {
  const { season } = useAtmosphere();
  // Each room needs its own repeat count, and repeat lives on the texture — so
  // the cached texture is cloned per room rather than shared and fought over.
  const map = useMemo(() => {
    const tex = (room.outdoor ? grassTexture(season) : floorTexture(floor)).clone();
    tex.needsUpdate = true;
    tex.repeat.set(room.w, room.d);
    return tex;
  }, [room.outdoor, room.w, room.d, floor, season]);

  return (
    <mesh
      position={[room.x + room.w / 2, 0.01, room.z + room.d / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={-1}
    >
      <planeGeometry args={[room.w, room.d]} />
      <meshLambertMaterial map={map} />
    </mesh>
  );
};

/** The building seen from outside: every wall on the outer boundary at full
 *  height. Interior walls are skipped — the neighbour has already drawn that
 *  boundary, and the roof hides them anyway. The roof itself is not a room's:
 *  `Roofing` lays one over the whole building. */
const Shell = ({
  room,
  rooms,
  wallpaper,
  openings,
  outside,
}: {
  room: SchoolRoomRect;
  rooms: SchoolRoomRect[];
  wallpaper: SchoolSurface;
  /** Only the grounds cut their boundary open — the building itself stays
   *  sealed from outside, or a doorway becomes a peephole into the interior it
   *  is the roof's whole job to hide. */
  openings: SideOpenings;
  /** The facade, roof and trim the school has bought and is wearing. */
  outside: OutsideLook;
}) => {
  const trim = wallpaper.trim ?? "#c9c4b8";
  // The grounds' garden walls keep the wallpaper colour: a brick facade is the
  // building's, and the yard wall is not the building.
  const facade: FacadeLook = room.outdoor ? { color: null, map: null, solid: null, swatch: "" } : outside.facade;
  const wallColor = facade.color ?? wallpaper.color;
  const sides: Side[] = ["north", "south", "west", "east"];
  const height = room.outdoor ? GARDEN_H : WALL_H;
  // After dark the school has its lights on, and from outside that is what
  // says so: every window glows.
  const { lightsOn } = useAtmosphere();

  return (
    <group>
      {sides.map((side) => {
        const g = sideGeometry(room, side);
        const covered = neighbourSpans(room, rooms, side, true);
        // Doorways are cut into the outside walls too. Without them the school
        // is a sealed box whose occupants walk out through the brickwork; the
        // grounds get an open gap, the building gets a door in it.
        const onOutsideWall = (at: number) =>
          !covered.some(([a, b]) => at > a - 0.01 && at < b + 0.01);
        const holes = openings[side].filter((h) => onOutsideWall(h.at));
        const segments = wallSegments(g.from, g.to, [], holes, height).flatMap((seg) => {
          const pieces: Segment[] = [];
          let cursor = seg.from;
          for (const [a, b] of [...covered].sort((m, n) => m[0] - n[0])) {
            if (b <= cursor || a >= seg.to) continue;
            if (a > cursor) pieces.push({ from: cursor, to: Math.min(a, seg.to), height });
            cursor = Math.max(cursor, b);
          }
          if (cursor < seg.to) pieces.push({ from: cursor, to: seg.to, height });
          return pieces;
        });

        return [
          ...holes.map((h) =>
            room.outdoor ? (
              // The grounds get a gateway, not a door — you walk straight
              // through it. The forecourt's own arch stands in this one.
              <Doorway
                key={`${side}gate${h.at.toFixed(2)}`}
                axis={g.axis}
                at={h.at}
                width={h.width}
                fixed={g.fixed}
                wallHeight={height}
                trim={trim}
              />
            ) : (
              <FrontDoor
                key={`${side}door${h.at.toFixed(2)}`}
                axis={g.axis}
                at={h.at}
                width={h.width}
                fixed={g.fixed}
                trim={trim}
                outward={side === "south" || side === "east" ? 1 : -1}
                leafColor={outside.trim.door}
              />
            ),
          ),
          ...segments.map((seg) => (
          <group key={`${side}${seg.from.toFixed(2)}`}>
            <WallPiece
              axis={g.axis}
              from={seg.from}
              to={seg.to}
              fixed={g.fixed}
              height={height}
              color={wallColor}
              trim={trim}
              texture={facade.map}
            />
            {/* Windows, but only on the two facades the camera can see. A blank
                elevation reads as a slab rather than a school, and putting them
                on all four sides would be geometry nobody ever looks at. */}
            {!room.outdoor && (side === "south" || side === "east") &&
              facadeWindows(seg.from, seg.to).map((at) => (
                <group key={at}>
                  {/* The frame, in the trim colour, standing just proud of the
                      wall behind the glass. */}
                  <mesh
                    position={
                      g.axis === "x"
                        ? [at, 1.55, g.fixed + WALL_T / 2 + 0.02]
                        : [g.fixed + WALL_T / 2 + 0.02, 1.55, at]
                    }
                  >
                    <boxGeometry
                      args={g.axis === "x" ? [1.36, 1.36, 0.04] : [0.04, 1.36, 1.36]}
                    />
                    <meshLambertMaterial color={outside.trim.frame} />
                  </mesh>
                  <mesh
                    position={
                      g.axis === "x"
                        ? [at, 1.55, g.fixed + WALL_T / 2 + 0.04]
                        : [g.fixed + WALL_T / 2 + 0.04, 1.55, at]
                    }
                  >
                    <boxGeometry
                      args={g.axis === "x" ? [1.15, 1.15, 0.06] : [0.06, 1.15, 1.15]}
                    />
                    {lightsOn ? (
                      <meshBasicMaterial color={WINDOW_LIT} />
                    ) : (
                      <meshLambertMaterial color={WINDOW_DAY} />
                    )}
                  </mesh>
                </group>
              ))}
          </group>
          )),
        ];
      })}

    </group>
  );
};

const SNOW = "#eef2f5";

/** Triangle positions to a geometry, one flat normal per face: pixel art
 *  wants facets, not smooth shading. */
function trianglesGeometry(positions: Float32Array): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  g.computeVertexNormals();
  return g;
}

/**
 * A pitched roof's surface in two parts: the slopes, with UVs that make the
 * tile courses run level — v is the HEIGHT, so every course lies parallel to
 * every eave whichever way the slope faces — and the flat top of a big block,
 * which is lead rather than tile.
 */
function pitchedGeometries(tris: Float32Array) {
  const slope: number[] = [];
  const uv: number[] = [];
  const top: number[] = [];
  for (let t = 0; t < tris.length; t += 9) {
    const flat = [1, 4, 7].every((k) => Math.abs(tris[t + k] - ROOF_TOP_Y) < 1e-4);
    for (let k = 0; k < 9; k += 3) {
      const x = tris[t + k];
      const y = tris[t + k + 1];
      const z = tris[t + k + 2];
      (flat ? top : slope).push(x, y, z);
      if (!flat) uv.push((x + z) * 0.35, y * 2.2);
    }
  }
  const slopes = new THREE.BufferGeometry();
  slopes.setAttribute("position", new THREE.Float32BufferAttribute(slope, 3));
  slopes.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  slopes.computeVertexNormals();
  return { slopes, top: top.length ? trianglesGeometry(new Float32Array(top)) : null };
}

/** Flat rectangles at one height, as one geometry whose UVs are world metres —
 *  so a texture runs on unbroken from one rectangle into the next. */
function flatRectsGeometry(rects: RoofRect[], y: number): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  for (const r of rects) {
    const x0 = r.x;
    const x1 = r.x + r.w;
    const z0 = r.z;
    const z1 = r.z + r.d;
    // (b - a) × (c - a) up: a, then +z, then +x.
    pos.push(x0, y, z0, x0, y, z1, x1, y, z1, x0, y, z0, x1, y, z1, x1, y, z0);
    uv.push(x0, -z0, x0, -z1, x1, -z1, x0, -z0, x1, -z1, x1, -z0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

/** Disposes a geometry when it is replaced or unmounted. */
function useDisposable<T extends { dispose: () => void } | null>(value: T): T {
  useEffect(() => () => value?.dispose(), [value]);
  return value;
}

/**
 * The building's roof — ONE roof, over every indoor room at once.
 *
 * It used to be one per room, which is what made a finished campus look like
 * a pile of roofs: a ridge per room, each along that room's own long side at a
 * height of its own, crossing its neighbours and showing gable ends through
 * the gaps; and flat finishes inset inside every room, drawing the floor plan
 * on the roof as a grid of seams. roof.ts works from the footprint instead, so
 * the same pitch runs round every eave, wings meet in valleys, and a finish or
 * a row of panels carries straight on over a wall line.
 *
 * Flat styles keep a deck and lip per room — those are one colour, so they
 * already merge — and lay their finish, snow and fittings from the footprint.
 */
const Roofing = ({ rooms, look }: { rooms: SchoolRoomRect[]; look: RoofLook }) => {
  const { season } = useAtmosphere();
  const snow = season === "winter";
  const indoor = useMemo(() => rooms.filter((r) => !r.outdoor), [rooms]);
  const field = useMemo(() => roofField(indoor), [indoor]);

  const pitched = look.kind === "pitched";
  const surface = useMemo(() => (field && pitched ? pitchedGeometries(hipRoofTriangles(field)) : null), [field, pitched]);
  useDisposable(surface?.slopes ?? null);
  useDisposable(surface?.top ?? null);
  const tiles = useMemo(() => roofTilesTexture(), []);
  const fascia = useDisposable(
    useMemo(() => (field && pitched ? trianglesGeometry(fasciaTriangles(field, 0.2)) : null), [field, pitched]),
  );

  const top = WALL_H + 0.56;
  const finishRectsList = useMemo(() => (field && !pitched ? finishRects(field, 0.75) : []), [field, pitched]);
  const finish = useDisposable(
    useMemo(() => (finishRectsList.length ? flatRectsGeometry(finishRectsList, top + 0.04) : null), [finishRectsList, top]),
  );
  const snowCover = useDisposable(
    useMemo(() => (finishRectsList.length ? flatRectsGeometry(finishRectsList, top + 0.07) : null), [finishRectsList, top]),
  );
  const finishMap = useMemo(() => {
    if (look.kind !== "flat") return null;
    const make = look.finish === "green" ? () => grassTexture(season) : look.map;
    if (!make) return null;
    const t = make().clone();
    t.needsUpdate = true;
    t.repeat.set(1, 1);
    return t;
  }, [look, season]);

  const fittings = useMemo(() => {
    if (!field || look.kind !== "flat") return [];
    if (look.finish === "gravel") return roofLattice(field, 4.5, 4.5, 0.5, 0.4, 1.2, true);
    if (look.finish === "green") return roofLattice(field, 3.2, 3.2, 0.3, 0.3, 1.0, true);
    if (look.finish === "solar") return roofLattice(field, 1.8, 1.6, 0.8, 0.55, 0.9);
    return [];
  }, [field, look]);

  if (!field) return null;

  if (look.kind === "pitched") {
    return (
      <group>
        {surface && (
          <mesh geometry={surface.slopes}>
            <meshLambertMaterial color={snow ? SNOW : look.slope} map={tiles} />
          </mesh>
        )}
        {surface?.top && (
          <mesh geometry={surface.top}>
            <meshLambertMaterial color={snow ? SNOW : look.ridge} />
          </mesh>
        )}
        {fascia && (
          <mesh geometry={fascia}>
            <meshLambertMaterial color={look.ridge} side={THREE.DoubleSide} />
          </mesh>
        )}
      </group>
    );
  }

  return (
    <group>
      {indoor.map((room) => {
        const cx = room.x + room.w / 2;
        const cz = room.z + room.d / 2;
        return (
          <group key={room.id}>
            <mesh position={[cx, WALL_H + 0.18, cz]}>
              <boxGeometry args={[room.w + WALL_T * 2, 0.36, room.d + WALL_T * 2]} />
              <meshLambertMaterial color={ROOF} />
            </mesh>
            {/* A lip standing proud of the roof deck, so the edge of the
                building reads as an edge instead of dissolving into the wall. */}
            <mesh position={[cx, WALL_H + 0.46, cz]}>
              <boxGeometry args={[room.w + 0.5, 0.2, room.d + 0.5]} />
              <meshLambertMaterial color={look.edge === "#575d68" ? ROOF_EDGE : look.edge} />
            </mesh>
          </group>
        );
      })}
      {finish && look.finish !== "plain" && look.finish !== "solar" && (
        <mesh geometry={finish}>
          <meshLambertMaterial color={look.deck} map={finishMap} />
        </mesh>
      )}
      {snowCover && snow && look.finish !== "green" && (
        <mesh geometry={snowCover}>
          <meshLambertMaterial color={SNOW} />
        </mesh>
      )}
      {look.finish === "gravel" &&
        fittings.map(([x, z]) => (
          <group key={`${x},${z}`} position={[x, top + 0.04, z]}>
            <mesh position={[0, 0.3, 0]}>
              <boxGeometry args={[1.0, 0.6, 0.8]} />
              <meshLambertMaterial color="#aab2bb" />
            </mesh>
            <mesh position={[0.2, 0.64, 0]}>
              <cylinderGeometry args={[0.24, 0.24, 0.08, 10]} />
              <meshLambertMaterial color="#5f6873" />
            </mesh>
          </group>
        ))}
      {look.finish === "green" &&
        fittings.map(([x, z]) => (
          <mesh key={`${x},${z}`} position={[x, top + 0.24, z]}>
            <boxGeometry args={[0.6, 0.4, 0.6]} />
            <meshLambertMaterial color={snow ? SNOW : "#4f8a54"} />
          </mesh>
        ))}
      {look.finish === "solar" &&
        fittings.map(([x, z]) => (
          // Tilted to face south, which is also toward the camera.
          <group key={`${x},${z}`} position={[x, top + 0.3, z]} rotation={[0.45, 0, 0]}>
            <mesh>
              <boxGeometry args={[1.5, 0.06, 1.0]} />
              <meshLambertMaterial color="#c9ced6" />
            </mesh>
            <mesh position={[0, 0.035, 0]}>
              <boxGeometry args={[1.38, 0.02, 0.88]} />
              <meshLambertMaterial color={snow ? SNOW : "#2b3a5c"} />
            </mesh>
          </group>
        ))}
    </group>
  );
};

/**
 * Neon along the top of a full-height wall, and the glow it throws down the
 * wall under it — the room's own colour (NEON in lampLayout.ts), dim by day
 * and lit after dark by the one clock-driven material every run shares.
 * Only on full walls: a knee-high partition has no top edge up there.
 */
const NeonRun = ({
  axis,
  from,
  to,
  face,
  color,
}: {
  axis: "x" | "z";
  from: number;
  to: number;
  /** The wall's inside face: z for a north wall, x for a west one. */
  face: number;
  color: string;
}) => {
  const len = to - from;
  if (len < 0.6) return null;
  const mid = (from + to) / 2;
  return (
    <group>
      <mesh
        position={axis === "x" ? [mid, 2.9, face + 0.06] : [face + 0.06, 2.9, mid]}
        material={neonTube(color)}
      >
        <boxGeometry args={axis === "x" ? [len, 0.07, 0.07] : [0.07, 0.07, len]} />
      </mesh>
      <mesh
        position={axis === "x" ? [mid, 2.4, face + 0.015] : [face + 0.015, 2.4, mid]}
        rotation={axis === "x" ? [0, 0, 0] : [0, Math.PI / 2, 0]}
        material={neonWash(color)}
      >
        <planeGeometry args={[len, 1.0]} />
      </mesh>
    </group>
  );
};

const RoomShell = ({
  room,
  rooms,
  openings,
  wallpaper,
  floor,
  wallsOff = false,
}: {
  room: SchoolRoomRect;
  rooms: SchoolRoomRect[];
  openings: SideOpenings;
  wallpaper: SchoolSurface;
  floor: SchoolSurface;
  /** Indoor rooms in the exterior view are drawn by `Shell` instead, so here
   *  they keep their floor and nothing else. */
  wallsOff?: boolean;
}) => {
  const trim = wallpaper.trim ?? "#c9c4b8";
  // The yard is walled like a yard: waist height rather than three metres, so
  // it still reads as open air.
  const fullH = room.outdoor ? GARDEN_H : WALL_H;
  const neon = room.outdoor ? null : (NEON[room.kind] ?? null);

  const north = useMemo(() => {
    const from = room.x - WALL_T / 2;
    const to = room.x + room.w + WALL_T / 2;
    const knees = neighbourSpans(room, rooms, "north");
    return { segments: wallSegments(from, to, knees, openings.north, fullH), knees };
  }, [room, rooms, openings.north, fullH]);

  const west = useMemo(() => {
    const from = room.z - WALL_T / 2;
    const to = room.z + room.d + WALL_T / 2;
    const knees = neighbourSpans(room, rooms, "west");
    return { segments: wallSegments(from, to, knees, openings.west, fullH), knees };
  }, [room, rooms, openings.west, fullH]);

  /**
   * The two sides the camera looks over. Indoor rooms never draw them — that
   * is the cutaway, and a wall there would hide the room's own contents. An
   * outdoor room gets a low lip along whatever part of them is not another
   * room, because a garden with two open sides is not a garden, it is a hole
   * in the floor. Kept below knee height so the people in it stay visible.
   */
  const lips = useMemo(() => {
    if (!room.outdoor) return [];
    return (["south", "east"] as const).map((side) => {
      const g = sideGeometry(room, side);
      const covered = neighbourSpans(room, rooms, side);
      let segments = wallSegments(g.from, g.to, [], openings[side], GARDEN_LIP);
      // Anything with a room behind it is that room's business to draw.
      for (const [a, b] of covered) {
        segments = segments.flatMap((seg) => {
          if (b <= seg.from || a >= seg.to) return [seg];
          const kept: Segment[] = [];
          if (a > seg.from) kept.push({ ...seg, to: Math.min(a, seg.to) });
          if (b < seg.to) kept.push({ ...seg, from: Math.max(b, seg.from) });
          return kept;
        });
      }
      return { side, g, segments };
    });
  }, [room, rooms, openings]);

  /** A doorway's frame has to match the wall it pierces, not the tallest wall
   *  in the room — a full-height lintel over a gap in a knee-high partition
   *  would hang in mid-air. */
  const heightAt = (knees: [number, number][], at: number) =>
    knees.some(([s, e]) => at > s - 0.001 && at < e + 0.001)
      ? Math.min(PARTITION_H, fullH)
      : fullH;

  return (
    <group>
      <Floor room={room} floor={floor} />

      {!wallsOff &&
        lips.map(({ side, g, segments }) =>
          segments.map((seg) => (
            <WallPiece
              key={`${side}${seg.from.toFixed(2)}`}
              axis={g.axis}
              from={seg.from}
              to={seg.to}
              fixed={g.fixed}
              height={seg.height}
              color={wallpaper.color}
              trim={trim}
            />
          )),
        )}

      {!wallsOff && (
        <>
          {north.segments.map((seg) => (
            <WallPiece
              key={`n${seg.from.toFixed(2)}`}
              axis="x"
              from={seg.from}
              to={seg.to}
              fixed={room.z - WALL_T / 2}
              height={seg.height}
              color={wallpaper.color}
              trim={trim}
            />
          ))}
          {openings.north.map((o) => (
            <Doorway
              key={`nd${o.at.toFixed(2)}`}
              axis="x"
              at={o.at}
              width={o.width}
              fixed={room.z - WALL_T / 2}
              wallHeight={heightAt(north.knees, o.at)}
              trim={trim}
            />
          ))}

          {west.segments.map((seg) => (
            <WallPiece
              key={`w${seg.from.toFixed(2)}`}
              axis="z"
              from={seg.from}
              to={seg.to}
              fixed={room.x - WALL_T / 2}
              height={seg.height}
              color={wallpaper.color}
              trim={trim}
            />
          ))}
          {openings.west.map((o) => (
            <Doorway
              key={`wd${o.at.toFixed(2)}`}
              axis="z"
              at={o.at}
              width={o.width}
              fixed={room.x - WALL_T / 2}
              wallHeight={heightAt(west.knees, o.at)}
              trim={trim}
            />
          ))}

          {neon &&
            north.segments
              .filter((seg) => seg.height === WALL_H)
              .map((seg) => (
                <NeonRun
                  key={`nn${seg.from.toFixed(2)}`}
                  axis="x"
                  from={Math.max(seg.from, room.x + 0.08)}
                  to={Math.min(seg.to, room.x + room.w - 0.08)}
                  face={room.z}
                  color={neon}
                />
              ))}
          {neon &&
            west.segments
              .filter((seg) => seg.height === WALL_H)
              .map((seg) => (
                <NeonRun
                  key={`wn${seg.from.toFixed(2)}`}
                  axis="z"
                  from={Math.max(seg.from, room.z + 0.08)}
                  to={Math.min(seg.to, room.z + room.d - 0.08)}
                  face={room.x}
                  color={neon}
                />
              ))}
        </>
      )}
    </group>
  );
};

const NO_OPENINGS: SideOpenings = { north: [], south: [], west: [], east: [] };

const NOTHING_RISING: ReadonlySet<string> = new Set();
const PLAIN_OUTSIDE: OutsideLook = outsideLook(null);

export const Building = ({
  plan,
  lookFor,
  exterior = false,
  rising = NOTHING_RISING,
  outside = PLAIN_OUTSIDE,
}: {
  plan: SchoolPlan;
  /** Surfaces for ONE room. Every room resolves its own, because a room may
   *  override the school's wallpaper or floor — see customize mode. Passing a
   *  single pair for the whole campus is what this replaced. */
  lookFor: (roomId: string) => { wallpaper: SchoolSurface; floor: SchoolSurface };
  /** Cutaway (the default) or the whole building seen from outside. */
  exterior?: boolean;
  /** Rooms bought a moment ago, which go up rather than simply appear. */
  rising?: ReadonlySet<string>;
  /** Facade, roof and trim — what the exterior view dresses the shell in. */
  outside?: OutsideLook;
}) => {
  const rooms = plan.rooms;
  const openings = useMemo(
    () => Object.fromEntries(rooms.map((r) => [r.id, boundaryOpenings(plan, r)])) as Record<
      string,
      SideOpenings
    >,
    [plan, rooms],
  );

  return (
    <group>
      {/* A slab under each ROOM, never one under the whole bounding box: the
          campus is L-shaped from stage 3 on, and a bounding-box slab paints a
          large empty grey rectangle over ground nothing has been built on yet.

          The slabs overlap by their margin where rooms meet, and two coplanar
          top faces z-fight. Nudging each one down by a hair — invisible at
          0.4mm, decisive to the depth buffer — is cheaper than clipping the
          margin against every neighbour. */}
      {rooms.map((room, i) => (
        <mesh
          key={`base-${room.id}`}
          position={[room.x + room.w / 2, -0.24 - i * 0.0004, room.z + room.d / 2]}
        >
          <boxGeometry args={[room.w + 0.8, 0.48, room.d + 0.8]} />
          <meshLambertMaterial color="#8f8a80" />
        </mesh>
      ))}

      {rooms.map((room) => {
        const { wallpaper, floor } = lookFor(room.id);
        return (
        <Rise key={room.id} active={rising.has(room.id)} rect={room}>
          {/* Indoor rooms disappear under the roof in the exterior view; the
              grounds keep their grass, their planting and their boundary wall,
              which is most of what makes the outside read as a school with a
              yard rather than a block on a slab. */}
          {(!exterior || room.outdoor) && (
            <RoomShell
              room={room}
              rooms={rooms}
              openings={openings[room.id] ?? NO_OPENINGS}
              wallpaper={wallpaper}
              floor={floor}
              wallsOff={exterior}
            />
          )}
          {exterior && (
            <Shell
              room={room}
              rooms={rooms}
              wallpaper={wallpaper}
              openings={openings[room.id] ?? NO_OPENINGS}
              outside={outside}
            />
          )}
        </Rise>
        );
      })}
      {exterior && <Roofing rooms={rooms} look={outside.roof} />}
    </group>
  );
};

/** Squashed dark disc under a person or prop. Cheaper than a shadow map by an
 *  order of magnitude, and at this resolution nobody can tell the difference. */
export const BlobShadow = ({ radius = 0.32 }: { radius?: number }) => (
  <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
    <circleGeometry args={[radius, 10]} />
    <meshBasicMaterial color="#000000" transparent opacity={0.16} depthWrite={false} />
  </mesh>
);
