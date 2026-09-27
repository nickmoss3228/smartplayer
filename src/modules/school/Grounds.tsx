// modules/school/Grounds.tsx
//
// The plot the school stands on — see groundsLayout.ts for what goes where and why.
// Drawn as a diorama: a slab of land with its turf, soil and rock showing on
// the two sides the camera looks at, so the edge of the world reads as the
// edge of a model rather than as the school falling off a cliff.
//
// Everything here is cheap on purpose. It is scenery: boxes and planes, the
// fence posts instanced, and only the two cars on the road move.

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Furnishings } from "./furniture";
import { GroundFeature, GroundsPlan, House, WayIn, busStopX } from "./groundsLayout";
import { PropInstance } from "./props";
import { Season, WINDOW_DAY, WINDOW_LIT, useAtmosphere } from "./atmosphere";
import { grassTexture } from "./textures";
import { LampPools } from "./NightLights";

/** The top of the land: a hair under the rooms' base slabs, which then read
 *  as the low plinth the school is built on. */
const GROUND_Y = -0.04;

const Box = ({
  p,
  s,
  c,
  ry = 0,
  basic = false,
}: {
  p: [number, number, number];
  s: [number, number, number];
  c: string;
  ry?: number;
  /** Lit from inside — a lamp, a lit window — rather than by the sun. */
  basic?: boolean;
}) => (
  <mesh position={[p[0], p[1] + s[1] / 2, p[2]]} rotation={[0, ry, 0]}>
    <boxGeometry args={s} />
    {basic ? <meshBasicMaterial color={c} /> : <meshLambertMaterial color={c} />}
  </mesh>
);

const TURF: Record<Season, string> = {
  summer: "#5c8a47",
  spring: "#629450",
  autumn: "#7a8744",
  winter: "#dfe6ea",
};

// ── The land ────────────────────────────────────────────────────────────────

const Plot = ({ g }: { g: GroundsPlan }) => {
  const { season } = useAtmosphere();
  const { x0, z0, x1, z1 } = g.tile;
  const w = x1 - x0;
  const d = z1 - z0;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const map = useMemo(() => {
    const t = grassTexture(season).clone();
    t.needsUpdate = true;
    t.repeat.set(w, d);
    return t;
  }, [season, w, d]);
  return (
    <group>
      <mesh position={[cx, GROUND_Y, cz]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-2}>
        <planeGeometry args={[w, d]} />
        <meshLambertMaterial map={map} />
      </mesh>
      {/* Turf, soil, rock: the cut edge of the model. */}
      <Box p={[cx, GROUND_Y - 0.24, cz]} s={[w, 0.235, d]} c={TURF[season]} />
      <Box p={[cx, GROUND_Y - 1.1, cz]} s={[w - 0.02, 0.86, d - 0.02]} c="#7a5a3c" />
      <Box p={[cx, GROUND_Y - 1.7, cz]} s={[w - 0.04, 0.6, d - 0.04]} c="#8d8780" />
    </group>
  );
};

// ── The street ──────────────────────────────────────────────────────────────

type Span = readonly [number, number];

/** The openings in the front edge of the grounds: where the path comes in,
 *  and where each car park's driveway goes out. */
function frontGaps(g: GroundsPlan, gateX: number | null): Span[] {
  const out: Span[] = g.driveways.map((dw) => [dw.x - dw.width / 2, dw.x + dw.width / 2] as const);
  if (gateX !== null) out.push([gateX - 1.7, gateX + 1.7]);
  return out.sort((a, b) => a[0] - b[0]);
}

/** A run from `from` to `to`, minus the gaps, as the pieces left over. */
function runsBetween(from: number, to: number, gaps: Span[]): Span[] {
  const out: Span[] = [];
  let at = from;
  for (const [a, b] of gaps) {
    if (b <= at || a >= to) continue;
    if (a > at) out.push([at, a]);
    at = Math.max(at, b);
  }
  if (at < to) out.push([at, to]);
  return out;
}

const Street = ({ g, gateX }: { g: GroundsPlan; gateX: number | null }) => {
  const { x0, x1 } = g.tile;
  const w = x1 - x0;
  const cx = (x0 + x1) / 2;
  const pave = g.pavement;
  const road = g.road;
  const mid = (road.z0 + road.z1) / 2;
  const dashes = useMemo(() => {
    const out: number[] = [];
    for (let x = x0 + 1.5; x < x1 - 1; x += 3.2) out.push(x);
    return out;
  }, [x0, x1]);
  return (
    <group>
      <Box p={[cx, GROUND_Y, (pave.z0 + pave.z1) / 2]} s={[w, 0.06, pave.z1 - pave.z0]} c="#c9c3b8" />
      {/* The kerb, a step down to the road — dropped where a driveway
          crosses, so the cars can get out. */}
      {runsBetween(x0, x1, g.driveways.map((dw) => [dw.x - dw.width / 2, dw.x + dw.width / 2] as const)).map(
        ([a, b]) => (
          <Box key={a} p={[(a + b) / 2, GROUND_Y, pave.z1 - 0.1]} s={[b - a, 0.08, 0.2]} c="#9d978c" />
        ),
      )}
      {/* Each driveway: asphalt from the car park, through the fence and over
          the pavement, flush with the road. */}
      {g.driveways.map((dw) => (
        <Box
          key={dw.x}
          p={[dw.x, GROUND_Y, (dw.z0 + dw.z1) / 2]}
          s={[dw.width, 0.065, dw.z1 - dw.z0]}
          c="#5d626b"
        />
      ))}
      <Box p={[cx, GROUND_Y, mid]} s={[w, 0.02, road.z1 - road.z0]} c="#4a4f58" />
      {dashes.map((x) =>
        gateX !== null && Math.abs(x - gateX) < 2.4 ? null : (
          <Box key={x} p={[x, GROUND_Y + 0.02, mid]} s={[1.4, 0.005, 0.14]} c="#e8e2cf" />
        ),
      )}
      {/* A zebra crossing where the path meets the street. */}
      {gateX !== null &&
        [-1.35, -0.45, 0.45, 1.35].map((o) => (
          <Box
            key={o}
            p={[gateX + o, GROUND_Y + 0.02, mid]}
            s={[0.5, 0.005, road.z1 - road.z0 - 0.6]}
            c="#eeeae0"
          />
        ))}
    </group>
  );
};

/** A car. Faces +x; the body sits on four dark wheels. */
const Car = ({ color, lit }: { color: string; lit: boolean }) => (
  <group>
    {[-1.1, 1.1].flatMap((x) =>
      [-0.72, 0.72].map((z) => (
        <mesh key={`${x},${z}`} position={[x, 0.26, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.26, 0.26, 0.2, 10]} />
          <meshLambertMaterial color="#23262d" />
        </mesh>
      )),
    )}
    <Box p={[0, 0.3, 0]} s={[3.4, 0.5, 1.6]} c={color} />
    <Box p={[-0.2, 0.8, 0]} s={[1.8, 0.45, 1.44]} c={color} />
    <Box p={[-0.2, 0.84, 0]} s={[1.84, 0.34, 1.3]} c="#9fc4d8" />
    {/* Headlights: lit after dark. */}
    {[-0.5, 0.5].map((z) => (
      <Box key={z} p={[1.71, 0.52, z]} s={[0.04, 0.14, 0.3]} c={lit ? "#fff3c4" : "#e5e1d3"} basic={lit} />
    ))}
  </group>
);

const CAR_COLOURS = ["#c43d3d", "#3d6fc4", "#e0b43d", "#4f8a54", "#e9e6df", "#5a5f6b"];

/** Two cars driving the street, one each way, off one edge of the model and
 *  back on at the other — shrinking to nothing at the edge rather than
 *  sliding off into the sky. */
const Traffic = ({ g }: { g: GroundsPlan }) => {
  const { lightsOn } = useAtmosphere();
  const cars = useRef<(THREE.Group | null)[]>([]);
  const mid = (g.road.z0 + g.road.z1) / 2;
  const lanes = [
    { z: mid + 1.2, dir: 1, speed: 4.2, offset: 0 },
    { z: mid - 1.2, dir: -1, speed: 3.6, offset: 0.55 },
  ];
  const span = g.tile.x1 - g.tile.x0;
  useFrame(({ clock }) => {
    lanes.forEach((lane, i) => {
      const car = cars.current[i];
      if (!car) return;
      const k = ((clock.elapsedTime * lane.speed) / (span + 12) + lane.offset) % 1;
      const along = k * (span + 12) - 6;
      const x = lane.dir > 0 ? g.tile.x0 + along : g.tile.x1 - along;
      car.position.set(x, GROUND_Y, lane.z);
      const edge = Math.min(x - g.tile.x0, g.tile.x1 - x);
      car.scale.setScalar(Math.max(0.001, Math.min(1, edge / 2.2)));
    });
  });
  return (
    <group>
      {lanes.map((lane, i) => (
        <group
          key={i}
          ref={(el) => {
            cars.current[i] = el;
          }}
          rotation={[0, lane.dir > 0 ? 0 : Math.PI, 0]}
        >
          <Car color={CAR_COLOURS[i * 3]} lit={lightsOn} />
        </group>
      ))}
    </group>
  );
};

const BusStop = ({ x, z }: { x: number; z: number }) => (
  <group position={[x, GROUND_Y + 0.06, z]}>
    <Box p={[0, 0, -0.6]} s={[2.4, 2.1, 0.08]} c="#9fc4d8" />
    <Box p={[-1.15, 0, -0.1]} s={[0.1, 2.2, 0.1]} c="#3a4152" />
    <Box p={[1.15, 0, -0.1]} s={[0.1, 2.2, 0.1]} c="#3a4152" />
    <Box p={[0, 2.2, -0.2]} s={[2.6, 0.1, 1.1]} c="#3a4152" />
    <Box p={[0, 0.45, -0.35]} s={[1.8, 0.08, 0.35]} c="#8a5a34" />
    {/* The sign: a pole and a round plate. */}
    <Box p={[1.9, 0, 0.3]} s={[0.08, 2.3, 0.08]} c="#5b6270" />
    <mesh position={[1.9, 2.35, 0.3]}>
      <cylinderGeometry args={[0.3, 0.3, 0.06, 12]} />
      <meshLambertMaterial color="#2f6fb3" />
    </mesh>
  </group>
);

// ── The fence ───────────────────────────────────────────────────────────────

const POST_GEO = new THREE.BoxGeometry(0.12, 0.9, 0.12);

/** A low picket fence round the grounds, open where the path comes in and
 *  where each car park's driveway goes out. Low enough never to hide anybody
 *  inside it. */
const Fence = ({ g, gateX }: { g: GroundsPlan; gateX: number | null }) => {
  const { x0, z0, x1, z1 } = g.fence;
  const gaps = useMemo(() => frontGaps(g, gateX), [g, gateX]);
  const posts = useMemo(() => {
    const out: [number, number][] = [];
    for (let x = x0; x <= x1; x += 2) {
      out.push([x, z0]);
      if (!gaps.some(([a, b]) => x >= a - 0.1 && x <= b + 0.1)) out.push([x, z1]);
    }
    for (let z = z0 + 2; z < z1; z += 2) {
      out.push([x0, z]);
      out.push([x1, z]);
    }
    return out;
  }, [x0, z0, x1, z1, gaps]);
  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const t = new THREE.Object3D();
    posts.forEach(([x, z], i) => {
      t.position.set(x, GROUND_Y + 0.45, z);
      t.updateMatrix();
      m.setMatrixAt(i, t.matrix);
    });
    m.count = posts.length;
    m.instanceMatrix.needsUpdate = true;
  }, [posts]);

  // Rails, as runs between the corners and either side of every gap.
  const rails: [number, number, number, number][] = [
    [x0, z0, x1, z0],
    [x0, z0, x0, z1],
    [x1, z0, x1, z1],
    ...runsBetween(x0, x1, gaps).map(([a, b]) => [a, z1, b, z1] as [number, number, number, number]),
  ];
  return (
    <group>
      <instancedMesh ref={mesh} args={[POST_GEO, undefined, Math.max(1, posts.length)]}>
        <meshLambertMaterial color="#efe9dc" />
      </instancedMesh>
      {rails.flatMap(([ax, az, bx, bz], i) => {
        const alongX = az === bz;
        const len = alongX ? bx - ax : bz - az;
        if (len <= 0.05) return [];
        return [0.3, 0.7].map((y) => (
          <Box
            key={`${i}-${y}`}
            p={[(ax + bx) / 2, GROUND_Y + y, (az + bz) / 2]}
            s={alongX ? [len, 0.07, 0.05] : [0.05, 0.07, len]}
            c="#e2dccd"
          />
        ));
      })}
      {/* Brick pillars either side of every opening. */}
      {gaps.flatMap(([a, b]) =>
        [a, b].map((x) => <Box key={x} p={[x, GROUND_Y, z1]} s={[0.4, 1.25, 0.4]} c="#a8513c" />),
      )}
    </group>
  );
};

// ── The school's own grounds ────────────────────────────────────────────────

const Pitch = ({ f }: { f: GroundFeature }) => {
  const { season } = useAtmosphere();
  const { x0, z0, x1, z1 } = f.rect;
  const w = x1 - x0;
  const d = z1 - z0;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const stripes = f.alongX ? Math.floor(w / 2) : Math.floor(d / 2);
  const snow = season === "winter";
  const line = snow ? "#b9c3cc" : "#f4f1e8";
  const y = GROUND_Y + 0.01;
  const t = 0.1;
  const long = f.alongX ? w : d;
  return (
    <group>
      {Array.from({ length: stripes }, (_, i) => {
        const size = long / stripes;
        const at = -long / 2 + size * (i + 0.5);
        return (
          <Box
            key={i}
            p={f.alongX ? [cx + at, y, cz] : [cx, y, cz + at]}
            s={f.alongX ? [size, 0.01, d] : [w, 0.01, size]}
            c={snow ? (i % 2 ? "#e8eef2" : "#dde5ea") : i % 2 ? "#5f9c4f" : "#69a858"}
          />
        );
      })}
      {/* Touchlines, the halfway line and the centre circle. */}
      <Box p={[cx, y + 0.01, z0 + 0.4]} s={[w - 0.8, 0.005, t]} c={line} />
      <Box p={[cx, y + 0.01, z1 - 0.4]} s={[w - 0.8, 0.005, t]} c={line} />
      <Box p={[x0 + 0.4, y + 0.01, cz]} s={[t, 0.005, d - 0.8]} c={line} />
      <Box p={[x1 - 0.4, y + 0.01, cz]} s={[t, 0.005, d - 0.8]} c={line} />
      <Box p={[cx, y + 0.01, cz]} s={f.alongX ? [t, 0.005, d - 0.8] : [w - 0.8, 0.005, t]} c={line} />
      <mesh position={[cx, y + 0.025, cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.6, 1.72, 24]} />
        <meshLambertMaterial color={line} />
      </mesh>
      {/* A goal at each end. */}
      {[-1, 1].map((end) => {
        const gx = f.alongX ? cx + end * (w / 2 - 0.4) : cx;
        const gz = f.alongX ? cz : cz + end * (d / 2 - 0.4);
        const across = 3.2;
        return (
          <group key={end} position={[gx, GROUND_Y, gz]} rotation={[0, f.alongX ? Math.PI / 2 : 0, 0]}>
            <Box p={[-across / 2, 0, 0]} s={[0.1, 1.3, 0.1]} c="#ffffff" />
            <Box p={[across / 2, 0, 0]} s={[0.1, 1.3, 0.1]} c="#ffffff" />
            <Box p={[0, 1.3, 0]} s={[across + 0.1, 0.1, 0.1]} c="#ffffff" />
            <Box p={[0, 0.02, -end * 0.6]} s={[across, 1.2, 0.04]} c="#dfe4e8" />
          </group>
        );
      })}
    </group>
  );
};

const Playground = ({ f }: { f: GroundFeature }) => {
  const { x0, z0, x1, z1 } = f.rect;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const w = x1 - x0;
  const d = z1 - z0;
  return (
    <group>
      <Box p={[cx, GROUND_Y, cz]} s={[w, 0.03, d]} c="#c98a5e" />
      {/* Swings: an A-frame and two seats. */}
      <group position={[x0 + 2.4, GROUND_Y, z0 + 2]}>
        {[-1.4, 1.4].map((x) => (
          <group key={x}>
            <Box p={[x, 0, -0.5]} s={[0.1, 2.1, 0.1]} c="#3d6fc4" />
            <Box p={[x, 0, 0.5]} s={[0.1, 2.1, 0.1]} c="#3d6fc4" />
          </group>
        ))}
        <Box p={[0, 2.05, 0]} s={[3, 0.12, 0.12]} c="#3d6fc4" />
        {[-0.6, 0.6].map((x) => (
          <group key={x}>
            <Box p={[x, 0.55, 0]} s={[0.5, 0.06, 0.25]} c="#e0b43d" />
            <Box p={[x - 0.22, 0.6, 0]} s={[0.02, 1.45, 0.02]} c="#5b6270" />
            <Box p={[x + 0.22, 0.6, 0]} s={[0.02, 1.45, 0.02]} c="#5b6270" />
          </group>
        ))}
      </group>
      {/* A slide: a platform, its ladder, and the chute. */}
      <group position={[x1 - 2.2, GROUND_Y, z0 + 2.2]}>
        <Box p={[0, 0, 0]} s={[1.1, 1.4, 1.1]} c="#c43d3d" />
        <Box p={[0, 1.4, 0]} s={[1.3, 0.1, 1.3]} c="#e0b43d" />
        <mesh position={[0, 0.72, 1.55]} rotation={[0.72, 0, 0]}>
          <boxGeometry args={[0.7, 0.08, 2.4]} />
          <meshLambertMaterial color="#4f8a54" />
        </mesh>
      </group>
      {/* A sandpit. */}
      <group position={[cx, GROUND_Y, z1 - 1.8]}>
        <Box p={[0, 0, 0]} s={[2.6, 0.25, 2]} c="#8a5a34" />
        <Box p={[0, 0.02, 0]} s={[2.3, 0.25, 1.7]} c="#e8d39a" />
      </group>
    </group>
  );
};

const CarPark = ({ f }: { f: GroundFeature }) => {
  const { x0, z0, x1, z1 } = f.rect;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const w = x1 - x0;
  const d = z1 - z0;
  const bays = Math.max(2, Math.floor(w / 2.6));
  const bay = w / bays;
  return (
    <group>
      <Box p={[cx, GROUND_Y, cz]} s={[w, 0.02, d]} c="#6a6e76" />
      {Array.from({ length: bays + 1 }, (_, i) => (
        <Box key={i} p={[x0 + i * bay, GROUND_Y + 0.02, z0 + 1.4]} s={[0.1, 0.005, 2.6]} c="#e8e2cf" />
      ))}
      {/* An arrow down the aisle to the way out. */}
      <group position={[cx, GROUND_Y + 0.02, z1 - 1.3]}>
        <Box p={[0, 0, -0.35]} s={[0.14, 0.005, 1.0]} c="#e8e2cf" />
        <Box p={[-0.18, 0, 0.18]} s={[0.12, 0.005, 0.5]} c="#e8e2cf" ry={0.7} />
        <Box p={[0.18, 0, 0.18]} s={[0.12, 0.005, 0.5]} c="#e8e2cf" ry={-0.7} />
      </group>
      {/* A few cars, nose in. Which bays are taken never changes. */}
      {Array.from({ length: bays }, (_, i) => i)
        .filter((i) => (i * 7 + 3) % 5 < 3)
        .map((i) => (
          <group key={i} position={[x0 + (i + 0.5) * bay, GROUND_Y, z0 + 1.5]} rotation={[0, -Math.PI / 2, 0]} scale={0.8}>
            <Car color={CAR_COLOURS[(i * 5 + 1) % CAR_COLOURS.length]} lit={false} />
          </group>
        ))}
    </group>
  );
};

/** A neighbour's house: walls, a pitched roof, a door and two windows that
 *  light up in the evening like the school's own. */
const HouseModel = ({ h }: { h: House }) => {
  const { lightsOn, season } = useAtmosphere();
  const roofGeo = useMemo(() => {
    const ridge = 1.5;
    const L = h.w / 2 + 0.25;
    const S = h.d / 2 + 0.3;
    const pts = [
      [-L, 0, -S], [L, 0, -S], [L, 0, S], [-L, 0, S], [-L, ridge, 0], [L, ridge, 0],
    ];
    const [A, B, C, D, R1, R2] = pts;
    const tris = [D, C, R2, D, R2, R1, B, A, R1, B, R1, R2, A, D, R1, C, B, R2];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(tris.flat(), 3));
    g.computeVertexNormals();
    return g;
  }, [h.w, h.d]);
  useLayoutEffect(() => () => roofGeo.dispose(), [roofGeo]);
  const win = lightsOn ? WINDOW_LIT : WINDOW_DAY;
  return (
    <group position={[h.x, GROUND_Y, h.z]} rotation={[0, h.ry, 0]}>
      <Box p={[0, 0, 0]} s={[h.w, 2.5, h.d]} c={h.wall} />
      <mesh geometry={roofGeo} position={[0, 2.5, 0]}>
        <meshLambertMaterial color={season === "winter" ? "#eef2f5" : h.roof} side={THREE.DoubleSide} />
      </mesh>
      <Box p={[h.w / 2 - 1, 2.8, -0.6]} s={[0.4, 1.1, 0.4]} c="#8a5a3c" />
      {/* The front, toward the school: +z. */}
      <Box p={[0, 0, h.d / 2 + 0.01]} s={[0.8, 1.6, 0.05]} c="#6f4d2d" />
      {[-1, 1].map((side) => (
        <Box key={side} p={[side * (h.w / 4 + 0.3), 1.0, h.d / 2 + 0.01]} s={[0.9, 0.8, 0.05]} c={win} basic={lightsOn} />
      ))}
      {/* A garden hedge along the front. */}
      <Box p={[0, 0, h.d / 2 + 1.4]} s={[h.w, 0.55, 0.45]} c={season === "winter" ? "#cdd7cf" : "#4f7a45"} />
    </group>
  );
};

// ── Paths ───────────────────────────────────────────────────────────────────

/** Paving along the way in: straight runs of slabs, a shade either way so
 *  the joints read. */
const Paving = ({ path }: { path: { x: number; z: number }[] }) => (
  <group>
    {path.slice(0, -1).flatMap((a, i) => {
      const b = path[i + 1];
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      if (len < 0.2) return [];
      const alongX = Math.abs(b.x - a.x) > Math.abs(b.z - a.z);
      const slabs = Math.max(1, Math.round(len / 1.1));
      return Array.from({ length: slabs }, (_, k) => {
        const t = (k + 0.5) / slabs;
        const x = a.x + (b.x - a.x) * t;
        const z = a.z + (b.z - a.z) * t;
        const size = len / slabs - 0.08;
        return (
          <Box
            key={`${i}-${k}`}
            p={[x, GROUND_Y, z]}
            s={alongX ? [size, 0.035, 1.5] : [1.5, 0.035, size]}
            c={k % 2 ? "#cfc8b8" : "#c6bfae"}
          />
        );
      });
    })}
  </group>
);

// ── All of it ───────────────────────────────────────────────────────────────

export const Grounds = ({ grounds, way }: { grounds: GroundsPlan; way: WayIn | null }) => {
  const gateX = way?.gateX ?? null;
  // Trees, bushes and street lamps are the school's own props, so they follow
  // the season and light up at night the same way the ones in the yard do.
  const props = useMemo<PropInstance[]>(() => {
    const out: PropInstance[] = grounds.items.map((t, i) => ({
      key: `g-${t.kind}-${i}`,
      type: t.kind,
      x: t.x,
      z: t.z,
      ry: (i % 4) * 0.4,
    }));
    grounds.lamps.forEach((l, i) => out.push({ key: `g-lamp-${i}`, type: "lamppost", x: l.x, z: l.z, ry: 0 }));
    return out;
  }, [grounds]);

  return (
    <group>
      <Plot g={grounds} />
      <Street g={grounds} gateX={gateX} />
      <Fence g={grounds} gateX={gateX} />
      {way && <Paving path={way.path} />}
      {gateX !== null && <BusStop x={busStopX(grounds, gateX)} z={(grounds.pavement.z0 + grounds.pavement.z1) / 2 + 0.2} />}
      {grounds.features.map((f, i) =>
        f.kind === "pitch" ? <Pitch key={i} f={f} /> : f.kind === "playground" ? <Playground key={i} f={f} /> : <CarPark key={i} f={f} />,
      )}
      {grounds.houses.map((h, i) => (
        <HouseModel key={i} h={h} />
      ))}
      <Furnishings props={props} />
      <LampPools at={grounds.lamps} />
      <Traffic g={grounds} />
    </group>
  );
};
