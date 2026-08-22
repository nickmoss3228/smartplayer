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

import { useMemo } from "react";
import { SchoolRoomRect, SchoolSurface } from "../../config/schoolCatalog";
import { RoomOpenings, SchoolPlan, WallOpening, wallOpenings } from "./props";
import { floorTexture, grassTexture } from "./textures";

const WALL_H = 3.0;
const PARTITION_H = 0.95;
const WALL_T = 0.22;
const TRIM_H = 0.16;
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

type Side = "north" | "south" | "west" | "east";

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
    out.push({ from: a, to: b, height: knee ? PARTITION_H : WALL_H });
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
}: {
  /** "x" for a north wall (runs east-west), "z" for a west wall. */
  axis: "x" | "z";
  from: number;
  to: number;
  fixed: number;
  height: number;
  color: string;
  trim: string;
}) => {
  const len = to - from;
  const mid = (from + to) / 2;
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
        <meshLambertMaterial color={color} />
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

const Floor = ({ room, floor }: { room: SchoolRoomRect; floor: SchoolSurface }) => {
  // Each room needs its own repeat count, and repeat lives on the texture — so
  // the cached texture is cloned per room rather than shared and fought over.
  const map = useMemo(() => {
    const tex = (room.outdoor ? grassTexture() : floorTexture(floor)).clone();
    tex.needsUpdate = true;
    tex.repeat.set(room.w, room.d);
    return tex;
  }, [room.outdoor, room.w, room.d, floor]);

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
 *  height, and a roof on top. Interior walls are skipped — the neighbour has
 *  already drawn that boundary, and the roof hides them anyway. */
const Shell = ({
  room,
  rooms,
  wallpaper,
}: {
  room: SchoolRoomRect;
  rooms: SchoolRoomRect[];
  wallpaper: SchoolSurface;
}) => {
  const trim = wallpaper.trim ?? "#c9c4b8";
  const sides: Side[] = ["north", "south", "west", "east"];

  return (
    <group>
      {sides.map((side) => {
        const g = sideGeometry(room, side);
        const covered = neighbourSpans(room, rooms, side, true);
        // Everything the neighbours do NOT cover, at full height.
        const segments = wallSegments(g.from, g.to, [], []).flatMap((seg) => {
          const pieces: Segment[] = [];
          let cursor = seg.from;
          for (const [a, b] of [...covered].sort((m, n) => m[0] - n[0])) {
            if (b <= cursor || a >= seg.to) continue;
            if (a > cursor) pieces.push({ from: cursor, to: Math.min(a, seg.to), height: WALL_H });
            cursor = Math.max(cursor, b);
          }
          if (cursor < seg.to) pieces.push({ from: cursor, to: seg.to, height: WALL_H });
          return pieces;
        });

        return segments.map((seg) => (
          <group key={`${side}${seg.from.toFixed(2)}`}>
            <WallPiece
              axis={g.axis}
              from={seg.from}
              to={seg.to}
              fixed={g.fixed}
              height={WALL_H}
              color={wallpaper.color}
              trim={trim}
            />
            {/* Windows, but only on the two facades the camera can see. A blank
                elevation reads as a slab rather than a school, and putting them
                on all four sides would be geometry nobody ever looks at. */}
            {(side === "south" || side === "east") &&
              facadeWindows(seg.from, seg.to).map((at) => (
                <mesh
                  key={at}
                  position={
                    g.axis === "x"
                      ? [at, 1.55, g.fixed + WALL_T / 2 + 0.04]
                      : [g.fixed + WALL_T / 2 + 0.04, 1.55, at]
                  }
                >
                  <boxGeometry
                    args={g.axis === "x" ? [1.15, 1.15, 0.06] : [0.06, 1.15, 1.15]}
                  />
                  <meshLambertMaterial color="#9fc4d8" />
                </mesh>
              ))}
          </group>
        ));
      })}

      {/* Flat roof with a lip. A pitched roof would read better in elevation
          but fights the isometric camera, which sees mostly the top face. */}
      <mesh position={[room.x + room.w / 2, WALL_H + 0.18, room.z + room.d / 2]}>
        <boxGeometry args={[room.w + WALL_T * 2, 0.36, room.d + WALL_T * 2]} />
        <meshLambertMaterial color={ROOF} />
      </mesh>
      {/* A thin parapet standing proud of the roof deck, so the edge of the
          building reads as an edge instead of dissolving into the wall. */}
      <mesh position={[room.x + room.w / 2, WALL_H + 0.46, room.z + room.d / 2]}>
        <boxGeometry args={[room.w + 0.5, 0.2, room.d + 0.5]} />
        <meshLambertMaterial color={ROOF_EDGE} />
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
  openings: RoomOpenings;
  wallpaper: SchoolSurface;
  floor: SchoolSurface;
  /** Outdoor rooms in the exterior view keep their ground but nothing else. */
  wallsOff?: boolean;
}) => {
  const trim = wallpaper.trim ?? "#c9c4b8";

  const north = useMemo(() => {
    const from = room.x - WALL_T / 2;
    const to = room.x + room.w + WALL_T / 2;
    const knees: [number, number][] = [];
    for (const o of rooms) {
      if (o.id === room.id) continue;
      if (Math.abs(o.z + o.d - room.z) > 0.01) continue;
      const span = overlapSpan(o.x, o.x + o.w, from, to);
      if (span) knees.push(span);
    }
    return { segments: wallSegments(from, to, knees, openings.north), knees };
  }, [room, rooms, openings.north]);

  const west = useMemo(() => {
    const from = room.z - WALL_T / 2;
    const to = room.z + room.d + WALL_T / 2;
    const knees: [number, number][] = [];
    for (const o of rooms) {
      if (o.id === room.id) continue;
      if (Math.abs(o.x + o.w - room.x) > 0.01) continue;
      const span = overlapSpan(o.z, o.z + o.d, from, to);
      if (span) knees.push(span);
    }
    return { segments: wallSegments(from, to, knees, openings.west), knees };
  }, [room, rooms, openings.west]);

  /** A doorway's frame has to match the wall it pierces, not the tallest wall
   *  in the room — a full-height lintel over a gap in a knee-high partition
   *  would hang in mid-air. */
  const heightAt = (knees: [number, number][], at: number) =>
    knees.some(([s, e]) => at > s - 0.001 && at < e + 0.001) ? PARTITION_H : WALL_H;

  return (
    <group>
      <Floor room={room} floor={floor} />

      {/* Outdoor rooms are open ground: no walls at all, or the courtyard stops
          being a courtyard. */}
      {!room.outdoor && !wallsOff && (
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
        </>
      )}
    </group>
  );
};

const EMPTY_OPENINGS: RoomOpenings = { north: [], west: [] };

export const Building = ({
  plan,
  wallpaper,
  floor,
  exterior = false,
}: {
  plan: SchoolPlan;
  wallpaper: SchoolSurface;
  floor: SchoolSurface;
  /** Cutaway (the default) or the whole building seen from outside. */
  exterior?: boolean;
}) => {
  const openings = useMemo(() => wallOpenings(plan), [plan]);
  const rooms = plan.rooms;

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

      {rooms.map((room) =>
        exterior && !room.outdoor ? (
          <group key={room.id}>
            <Shell room={room} rooms={rooms} wallpaper={wallpaper} />
          </group>
        ) : (
          <RoomShell
            key={room.id}
            room={room}
            rooms={rooms}
            openings={exterior ? EMPTY_OPENINGS : (openings[room.id] ?? EMPTY_OPENINGS)}
            wallpaper={wallpaper}
            floor={floor}
            wallsOff={exterior}
          />
        ),
      )}
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
