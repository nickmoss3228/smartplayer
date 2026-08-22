// modules/school/SchoolCanvas.tsx
//
// The isometric view: an orthographic camera locked at a fixed 45°/35.26°
// angle, rendered at a fraction of the screen resolution and upscaled with
// nearest-neighbour. That upscale IS the pixel art — there are no sprites
// anywhere in this game.
//
// Set PIXEL_DPR to 1 and the same scene renders crisp. When the designer's
// models land, that is the switch (docs/room-game-concept.md §6).
//
// The camera never rotates. Rotation turns an isometric scene into "a 3D app"
// and invites the player to fight the camera instead of looking at the room;
// one finger pans, two fingers zoom, and that is the whole interaction.

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { MapControls } from "@react-three/drei";
import * as THREE from "three";
import {
  DEFAULT_VARIANT_ID,
  getFloor,
  getLayoutId,
  getStage,
  getWallpaper,
  planBounds,
} from "../../config/schoolCatalog";
import { SchoolState } from "../../services/schoolServices";
import { CharacterState } from "../../types/Character";
import { getCharacterItem } from "../../config/characterCatalog";
import { Building } from "./Building";
import { Deskware, Furnishings } from "./furniture";
import { People, PersonLook } from "./People";
import { boardWords, buildBubblePool } from "./bubbles";
import { SchoolPlan, buildPlan, classroomsOf, deskLayout, peoplePlan, stageProps } from "./props";

/** Render scale. 0.38 ≈ chunky pixels on a phone; 1 is a crisp modern render. */
const PIXEL_DPR = 0.38;

// True isometric: equal parts x, y and z, which is what makes a tile grid
// project to a clean 2:1 diamond.
const ISO = new THREE.Vector3(1, 1, 1).normalize();
const CAM_DISTANCE = 70;
const WALL_H = 3;

// ── Camera ──────────────────────────────────────────────────────────────────

// Below this, a person is fewer than ~16 screen pixels tall and the whole
// point of the scene — that it is full of people doing things — is lost. A
// campus too wide to fit at this zoom starts centred and gets panned, which is
// the interaction the player already has two fingers for. Set low enough that
// all three variants fit whole on a desktop at stage 9 — the Terrace is 55
// tiles across — while a phone still clamps here and pans.
const MIN_READABLE_ZOOM = 15;

function fitZoom(
  bounds: ReturnType<typeof planBounds>,
  width: number,
  height: number,
): number {
  // Under a 45° yaw the footprint's diagonal faces the camera, so the projected
  // size is driven by (w + d), not by max(w, d). Screen axes for a (1,1,1)
  // camera work out to x=(x−z)/√2 and y=(2y−x−z)/√6, which is where both
  // constants below come from.
  const projectedW = (bounds.w + bounds.d) * Math.SQRT1_2;
  const projectedH = (bounds.w + bounds.d + 2 * WALL_H) / Math.sqrt(6);
  const contain = Math.min((width * 0.9) / projectedW, (height * 0.86) / projectedH);
  return Math.max(contain, MIN_READABLE_ZOOM);
}

// Walls rise from the ground plane, so the campus's projected centre sits
// WALL_H/2 above it — aiming at y=0 leaves a band of empty sky under the
// building and clips its back corner off the top of the frame.
const TARGET_Y = WALL_H / 2;

/** How far past the campus edge the view centre may be dragged. Enough to put
 *  a corner room in the middle of the screen, not enough to lose the school. */
const PAN_MARGIN = 5;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

interface ControlsLike {
  target: THREE.Vector3;
  update: () => void;
  minZoom: number;
  maxZoom: number;
  addEventListener: (type: string, fn: () => void) => void;
  removeEventListener: (type: string, fn: () => void) => void;
}

/**
 * Frames the whole campus on load, re-frames it when a stage is bought, and
 * otherwise stays out of the way.
 *
 * "Otherwise stays out of the way" is the load-bearing part. This used to run
 * its easing every single frame, which meant a finger drag was undone as fast
 * as it was made and the view rubber-banded back to centre — panning felt
 * broken because it WAS broken. The easing now runs only while there is
 * somewhere to ease TO, and any touch cancels it outright: once you take hold
 * of the camera it is yours.
 *
 * What replaces the re-centring is a leash rather than a spring. The view
 * centre is clamped to the campus bounds plus a margin, so the school can never
 * be dragged off screen, but nothing pulls back while you are inside that
 * range.
 */
const CameraRig = ({ plan }: { plan: SchoolPlan }) => {
  const camera = useThree((s) => s.camera) as THREE.OrthographicCamera;
  const size = useThree((s) => s.size);
  const controls = useThree((s) => s.controls) as unknown as ControlsLike | null;

  const goal = useRef({ zoom: 1, cx: 0, cz: 0 });
  const easing = useRef(false);
  const settled = useRef(false);
  const bounds = useMemo(() => planBounds(plan.rooms), [plan]);

  // Deliberately NOT keyed on `size`: a mobile browser fires a resize every
  // time the address bar collapses, and re-framing there would yank the view
  // out from under a finger mid-pan.
  const sizeRef = useRef(size);
  sizeRef.current = size;

  useEffect(() => {
    const { width, height } = sizeRef.current;
    const zoom = fitZoom(bounds, width, height);
    goal.current = { zoom, cx: bounds.fx, cz: bounds.fz };

    // MapControls mounts after this rig on the first pass, so `controls` is
    // null for one render. Framing then would set the camera but leave the
    // orbit target at the origin, and the campus would sit off-centre for the
    // whole session. Wait for it — the effect re-runs when it appears.
    if (!controls) return;
    controls.minZoom = zoom * 0.5;
    controls.maxZoom = zoom * 6;

    if (!settled.current) {
      camera.position.set(
        bounds.fx + ISO.x * CAM_DISTANCE,
        TARGET_Y + ISO.y * CAM_DISTANCE,
        bounds.fz + ISO.z * CAM_DISTANCE,
      );
      camera.zoom = zoom;
      camera.updateProjectionMatrix();
      controls.target.set(bounds.fx, TARGET_Y, bounds.fz);
      controls.update();
      settled.current = true;
      return;
    }

    // A stage was bought: glide out to reveal the new wing. This is the only
    // thing that ever moves the camera on its own.
    easing.current = true;
  }, [bounds, camera, controls]);

  // Touching the camera cancels any pending glide. Without this, buying a stage
  // and immediately grabbing the view means fighting the animation for a second.
  useEffect(() => {
    if (!controls) return;
    const stop = () => {
      easing.current = false;
    };
    controls.addEventListener("start", stop);
    return () => controls.removeEventListener("start", stop);
  }, [controls]);

  useFrame((_, dt) => {
    if (!controls) return;

    if (easing.current) {
      const g = goal.current;
      const k = Math.min(1, dt * 2.4);
      const dZoom = g.zoom - camera.zoom;
      const dx = g.cx - controls.target.x;
      const dz = g.cz - controls.target.z;

      camera.zoom += dZoom * k;
      camera.updateProjectionMatrix();
      // Target and camera move together, or the orbit offset changes and the
      // locked isometric angle drifts.
      controls.target.x += dx * k;
      controls.target.z += dz * k;
      camera.position.x += dx * k;
      camera.position.z += dz * k;
      controls.update();

      if (Math.abs(dZoom) < 0.05 && Math.abs(dx) < 0.02 && Math.abs(dz) < 0.02) {
        easing.current = false;
      }
      return;
    }

    // The leash. Only acts at the very edge, so ordinary panning never feels it.
    const x = clamp(controls.target.x, bounds.minX - PAN_MARGIN, bounds.maxX + PAN_MARGIN);
    const z = clamp(controls.target.z, bounds.minZ - PAN_MARGIN, bounds.maxZ + PAN_MARGIN);
    if (x !== controls.target.x || z !== controls.target.z) {
      camera.position.x += x - controls.target.x;
      camera.position.z += z - controls.target.z;
      controls.target.x = x;
      controls.target.z = z;
      controls.update();
    }
  });

  return null;
};

// ── Lighting ────────────────────────────────────────────────────────────────
// Tinted by the player's actual clock. It costs nothing, and a school that is
// warm at 8am and amber at 7pm quietly rewards coming back at a different time.

interface Lighting {
  key: string;
  fill: string;
  sky: string;
  ground: string;
  keyI: number;
  hemiI: number;
}

function lightingForHour(hour: number): Lighting {
  // Night is lit WARM and bright, not dimmed: the school has its lights on, and
  // a player checking in after dinner should find somewhere cosy rather than a
  // dark building. Only the sky behind it goes night-blue.
  if (hour < 6 || hour >= 21) {
    return { key: "#ffeacb", fill: "#93a4cc", sky: "#2f3750", ground: "#2a3145", keyI: 1.5, hemiI: 0.95 };
  }
  if (hour < 10) {
    return { key: "#ffe4bd", fill: "#a8bcd0", sky: "#cfe4f2", ground: "#a89a86", keyI: 1.4, hemiI: 1.15 };
  }
  if (hour < 17) {
    return { key: "#fff6e6", fill: "#b7cadb", sky: "#d8ebf6", ground: "#b0a695", keyI: 1.35, hemiI: 1.2 };
  }
  return { key: "#ffd9ab", fill: "#9aa6c4", sky: "#e8cbb2", ground: "#a2907d", keyI: 1.45, hemiI: 1.05 };
}

// ── Scene ───────────────────────────────────────────────────────────────────

function playerLookFrom(character: Pick<CharacterState, "skinTone" | "equipped"> | null): PersonLook {
  const swatch = (slot: "hairstyle" | "outfit" | "hat") => {
    const id = character?.equipped?.[slot];
    return id ? getCharacterItem(id)?.swatch : undefined;
  };
  const outfit = swatch("outfit");
  return {
    skin: character?.skinTone ?? "#f2c48d",
    hair: swatch("hairstyle")?.color ?? "#3b2a1e",
    shirt: outfit?.color ?? "#4a7fd6",
    trousers: outfit?.accent ?? "#3d4557",
    hat: swatch("hat")?.color ?? null,
  };
}

interface SceneProps {
  school: SchoolState;
  character: Pick<CharacterState, "skinTone" | "equipped"> | null;
  learnedWords: string[];
  interactive: boolean;
  /** Whole building from outside instead of the cutaway. */
  exterior?: boolean;
}

const Scene = ({ school, character, learnedWords, interactive, exterior = false }: SceneProps) => {
  const stage = useMemo(() => getStage(school.stage), [school.stage]);
  const plan = useMemo(
    () => buildPlan(stage, school.variantId ?? DEFAULT_VARIANT_ID),
    [stage, school.variantId],
  );
  const layoutId = useMemo(() => getLayoutId(school.layoutId), [school.layoutId]);
  const wallpaper = useMemo(() => getWallpaper(school.wallpaperId), [school.wallpaperId]);
  const floor = useMemo(() => getFloor(school.floorId), [school.floorId]);

  // Desks from EVERY classroom, not just the main one — the player's layout
  // preset rearranges the whole school at once.
  const desks = useMemo(
    () => classroomsOf(plan).flatMap((c) => deskLayout(plan, layoutId, c.id)),
    [plan, layoutId],
  );
  // From outside, only what stands on open ground is still visible; everything
  // indoors is behind a wall and a roof, so drawing it is pure waste.
  const furniture = useMemo(() => {
    const all = stageProps(plan);
    if (!exterior) return all;
    const outdoors = new Set(plan.rooms.filter((r) => r.outdoor).map((r) => r.id));
    return all.filter((p) => outdoors.has(p.key.split("-")[0]));
  }, [plan, exterior]);
  const cast = useMemo(() => peoplePlan(plan, layoutId), [plan, layoutId]);
  const pool = useMemo(() => buildBubblePool(learnedWords), [learnedWords]);
  const words = useMemo(() => boardWords(learnedWords), [learnedWords]);
  const playerLook = useMemo(() => playerLookFrom(character), [character]);

  // Tapping the board chalks up the next word you have learned. It is the only
  // prop with state, and it deliberately holds none of it on the server.
  const [boardIdx, setBoardIdx] = useState(0);
  const boardWord = words.length ? words[boardIdx % words.length] : null;

  const light = useMemo(() => lightingForHour(new Date().getHours()), []);

  return (
    <>
      <color attach="background" args={[light.sky]} />
      <hemisphereLight args={[light.sky, light.ground, light.hemiI]} />
      <directionalLight position={[14, 22, 10]} intensity={light.keyI} color={light.key} />
      {/* A dim light from behind the camera keeps the two visible walls from
          going flat black at the bottom of the frame. */}
      <directionalLight position={[-12, 9, -14]} intensity={0.45} color={light.fill} />

      <Building plan={plan} wallpaper={wallpaper} floor={floor} exterior={exterior} />
      <Furnishings
        props={furniture}
        boardWord={exterior ? null : boardWord}
        onBoardTap={
          interactive && !exterior && words.length ? () => setBoardIdx((i) => i + 1) : undefined
        }
      />
      {!exterior && <Deskware desks={desks} />}
      <People
        plan={cast}
        pool={pool}
        playerLook={playerLook}
        interactive={interactive && !exterior}
        // Bubbles are DOM overlays and ignore depth, so from outside they would
        // float over the roof while the person saying them is correctly hidden.
        mute={exterior}
      />

      <CameraRig plan={plan} />
    </>
  );
};

// ── Canvas ──────────────────────────────────────────────────────────────────

export interface SchoolCanvasProps extends SceneProps {
  className?: string;
}

export const SchoolCanvas = ({ className = "", ...scene }: SchoolCanvasProps) => (
  <div className={`relative ${className}`}>
    {/* The nearest-neighbour upscale has to be applied to the <canvas> itself,
        which R3F owns — hence a rule rather than a style prop. */}
    <style>{`.school-canvas canvas { image-rendering: pixelated; image-rendering: crisp-edges; }`}</style>
    <Canvas
      className="school-canvas"
      orthographic
      flat
      dpr={PIXEL_DPR}
      gl={{ antialias: false, powerPreference: "low-power" }}
      camera={{ position: [40, 40, 40], zoom: 40, near: 0.1, far: 400 }}
      style={{ touchAction: "none" }}
    >
      <Suspense fallback={null}>
        <Scene {...scene} />
      </Suspense>
      <MapControls
        makeDefault
        enableRotate={false}
        enableDamping
        dampingFactor={0.12}
        zoomSpeed={0.9}
        panSpeed={1}
      />
    </Canvas>
  </div>
);

export default SchoolCanvas;
