// modules/school/SchoolCanvas.tsx
//
// The isometric view: an orthographic camera locked at a fixed 45°/35.26°
// angle, rendered at a fraction of the screen resolution and upscaled with
// nearest-neighbour. That upscale IS the pixel art — there are no sprites
// anywhere in this game.
//
// The fraction comes from renderScale.ts: chunky on a desktop, finer on a
// phone, whose screen is too small to spend pixels that freely. Pin it at 1
// and the same scene renders crisp everywhere. When the designer's models
// land, that is the switch (docs/room-game-concept.md §6).
//
// The camera never rotates. Rotation turns an isometric scene into "a 3D app"
// and invites the player to fight the camera instead of looking at the room;
// one finger pans, two fingers zoom, a double-tap zooms in, and that is the
// whole interaction.

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, MapControls } from "@react-three/drei";
import * as THREE from "three";
import { DEFAULT_VARIANT_ID, RoomLook, getVariant, lookFor, planBounds } from "../../config/schoolCatalog";
import { SchoolState, WalletBalances } from "../../services/schoolServices";
import { CharacterState } from "../../types/Character";
import { resolveLook } from "../character/look";
import { Building } from "./Building";
import { Deskware, Furnishings } from "./furniture";
import { People } from "./People";
import { PersonRole, PhraseBook, boardWords, buildBubblePool } from "./bubbles";
import { SchoolRoomRect } from "../../config/schoolCatalog";
import {
  GhostRoom,
  SchoolPlan,
  buildPlan,
  castFor,
  classroomsOf,
  deskLayout,
  ghostBounds,
  ghostRooms,
  peoplePlan,
  porchProps,
  stageProps,
} from "./props";
import { Ghosts } from "./Ghosts";
import { Baked } from "./Baked";
import { RoomPicks } from "./RoomPicks";
import { Presence, PresenceContext } from "./presence";
import { AtmosphereContext, seasonFor } from "./atmosphere";
import { DayPart, schoolNow, useDayPart } from "./schoolClock";
import { outsideLook } from "./exterior";
import { Grounds } from "./Grounds";
import { LampPools, NightDriver, Pendants, RoomLights } from "./NightLights";
import { pendantsFor, roomLights } from "./lampLayout";
import { arrivals, groundsPlan, wayIn } from "./groundsLayout";
import { useRenderScale } from "./renderScale";
import { playCast } from "./playLayout";
import { walkGrid, nearestStandable } from "./walkGrid";
import { AvatarState, newAvatar } from "./avatar";
import { FloorCatcher, WalkTarget } from "./Walking";
import { useWalkKeys } from "./walkKeys";

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
// all three variants fit whole on a desktop when complete — the Terrace is 55
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
 * Frames the whole campus on load, re-frames it when a room is bought, and
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
const CameraRig = ({
  plan,
  ghosts,
  focus,
  glide,
  seek,
  land,
  bottomInset = 0,
  follow = null,
}: {
  plan: SchoolPlan;
  ghosts: GhostRoom[];
  /** One room to frame instead of the whole campus. Customize mode sets it, so
   *  the room being changed is the room you are looking at. */
  focus?: SchoolRoomRect | null;
  /** A one-off glide to a room — "show me" on a note from the staff. Unlike
   *  `focus` it leaves the leash on the whole campus, so the player can pan
   *  straight back out; `nonce` is what makes the same room glide twice. */
  glide?: { roomId: string; nonce: number } | null;
  /** A one-off glide to a point — the player's own desk. Only a new `nonce`
   *  moves the camera; the point coming and going with the time of day does
   *  not. */
  seek?: { at: { x: number; z: number } | null; nonce: number };
  /** The whole plot. The view may be dragged anywhere over it, and zoomed out
   *  far enough to see all of it: a finished school on its grounds is worth
   *  looking at whole. */
  land?: { x0: number; z0: number; x1: number; z1: number };
  /** How much of the screen, from the bottom, a sheet is covering: the
   *  school is framed in what is left above it, not behind the sheet. */
  bottomInset?: number;
  /** The player's character, out for a walk: close in on it, then keep it in
   *  view — unless the player pans away, until they next send it somewhere. */
  follow?: AvatarState | null;
}) => {
  const camera = useThree((s) => s.camera) as THREE.OrthographicCamera;
  const size = useThree((s) => s.size);
  const controls = useThree((s) => s.controls) as unknown as ControlsLike | null;

  const goal = useRef({ zoom: 1, cx: 0, cz: 0 });
  const easing = useRef(false);
  const settled = useRef(false);
  // Build mode has to fit what you could buy as well as what you have, or the
  // rooms being offered sit off the edge of the frame. Widening the EXISTING
  // bounds rather than adding a second camera path also means the leash and the
  // glide keep working unchanged: buying a room re-frames, and so does opening
  // build mode.
  const bounds = useMemo(
    () =>
      planBounds(
        focus ? [focus] : ghosts.length ? ghostBounds(plan.rooms, ghosts) : plan.rooms,
      ),
    [plan, ghosts, focus],
  );

  // The leash: how far the view centre may go — the campus plus a margin, or
  // the whole plot where there is one.
  const leash = (x: number, z: number) => ({
    x: clamp(
      x,
      Math.min(bounds.minX - PAN_MARGIN, land?.x0 ?? Infinity),
      Math.max(bounds.maxX + PAN_MARGIN, land?.x1 ?? -Infinity),
    ),
    z: clamp(
      z,
      Math.min(bounds.minZ - PAN_MARGIN, land?.z0 ?? Infinity),
      Math.max(bounds.maxZ + PAN_MARGIN, land?.z1 ?? -Infinity),
    ),
  });
  const leashRef = useRef(leash);
  leashRef.current = leash;

  // Deliberately NOT keyed on `size`: a mobile browser fires a resize every
  // time the address bar collapses, and re-framing there would yank the view
  // out from under a finger mid-pan.
  const sizeRef = useRef(size);
  sizeRef.current = size;

  useEffect(() => {
    const { width, height } = sizeRef.current;
    const zoom = fitZoom(bounds, width, height * (1 - bottomInset));
    // Aim BELOW the school by half the covered strip, so the school sits in
    // the middle of the part of the screen still showing. Toward the camera
    // on the ground, (d, 0, d), is straight down the screen, 2d/√6 per unit.
    const lift = (height * bottomInset) / 2 / zoom;
    const d = (lift * Math.sqrt(6)) / 2;
    goal.current = { zoom, cx: bounds.fx + d, cz: bounds.fz + d };

    // MapControls mounts after this rig on the first pass, so `controls` is
    // null for one render. Framing then would set the camera but leave the
    // orbit target at the origin, and the campus would sit off-centre for the
    // whole session. Wait for it — the effect re-runs when it appears.
    if (!controls) return;
    // Out far enough to take in the whole plot, where there is one.
    const whole = land
      ? (() => {
          const w = land.x1 - land.x0;
          const d = land.z1 - land.z0;
          const pw = (w + d) * Math.SQRT1_2;
          const ph = (w + d + 2 * WALL_H) / Math.sqrt(6);
          return Math.min((width * 0.95) / pw, (height * 0.95) / ph);
        })()
      : Infinity;
    controls.minZoom = Math.min(zoom * 0.5, whole);
    controls.maxZoom = zoom * 6;

    if (!settled.current) {
      const { cx, cz } = goal.current;
      camera.position.set(cx + ISO.x * CAM_DISTANCE, TARGET_Y + ISO.y * CAM_DISTANCE, cz + ISO.z * CAM_DISTANCE);
      camera.zoom = zoom;
      camera.updateProjectionMatrix();
      controls.target.set(cx, TARGET_Y, cz);
      controls.update();
      settled.current = true;
      return;
    }

    // A room was bought, or one was picked to customize: glide to it. These are
    // the only things that ever move the camera on its own.
    easing.current = true;
  }, [bounds, camera, controls, land, bottomInset]);

  useEffect(() => {
    if (!glide || !controls) return;
    const room = plan.rooms.find((r) => r.id === glide.roomId);
    if (!room) return;
    const b = planBounds([room]);
    const { width, height } = sizeRef.current;
    // Close enough to see who is talking, not so close the room fills the
    // screen and the player loses where it is in the school.
    const zoom = Math.min(controls.maxZoom, fitZoom(b, width, height) * 0.6);
    goal.current = { zoom: Math.max(zoom, camera.zoom), cx: b.fx, cz: b.fz };
    easing.current = true;
    // Only a new nonce means a new glide; the plan changing under it does not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glide?.nonce, controls]);

  useEffect(() => {
    if (!seek?.nonce || !seek.at || !controls) return;
    // Close in on one desk: near enough to see the face, with the desks
    // around it still in the frame.
    const { width, height } = sizeRef.current;
    const b = planBounds([{ x: seek.at.x - 2.5, z: seek.at.z - 2.5, w: 5, d: 5 } as SchoolRoomRect]);
    const zoom = Math.min(controls.maxZoom, fitZoom(b, width, height));
    goal.current = { zoom: Math.max(zoom, camera.zoom), cx: b.cx, cz: b.cz };
    easing.current = true;
    // Only a new nonce is a new "find me".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seek?.nonce, controls]);

  // Close in on the character when it gets up: near enough to see it walk.
  const followRef = useRef(follow);
  followRef.current = follow;
  useEffect(() => {
    if (!follow || !controls) return;
    const { width, height } = sizeRef.current;
    const b = planBounds([{ x: follow.x - 5, z: follow.z - 5, w: 10, d: 10 } as SchoolRoomRect]);
    const zoom = Math.min(controls.maxZoom, fitZoom(b, width, height));
    goal.current = { zoom: Math.max(zoom, camera.zoom), cx: follow.x, cz: follow.z };
    easing.current = true;
    // Only a new walk closes in; the character moving does not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [follow, controls]);

  // Touching the camera cancels any pending glide. Without this, buying a room
  // and immediately grabbing the view means fighting the animation for a second.
  // It also lets go of the character: panning away means "let me look".
  useEffect(() => {
    if (!controls) return;
    const stop = () => {
      easing.current = false;
      if (followRef.current) followRef.current.follow = false;
    };
    controls.addEventListener("start", stop);
    return () => controls.removeEventListener("start", stop);
  }, [controls]);

  // Double-tap to zoom in, the way a map does: twice as close, with the spot
  // you tapped staying under your finger. Already as close as it goes, it
  // glides back out to the whole school instead, so the gesture never just
  // does nothing. Touch only — a mouse has its wheel, and a double-click is
  // two taps on whatever it lands on.
  const dom = useThree((s) => s.gl.domElement);
  useEffect(() => {
    if (!controls) return;
    const down = new Map<number, { x: number; y: number; t: number }>();
    let multi = false;
    let lastTap: { x: number; y: number; t: number } | null = null;
    const ray = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -TARGET_Y);
    const hit = new THREE.Vector3();

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      down.set(e.pointerId, { x: e.clientX, y: e.clientY, t: e.timeStamp });
      // A second finger makes it a pinch, and nothing in it is a tap.
      if (down.size > 1) multi = true;
    };
    const onUp = (e: PointerEvent) => {
      const start = down.get(e.pointerId);
      down.delete(e.pointerId);
      if (!start) return;
      const wasMulti = multi;
      if (down.size === 0) multi = false;
      const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
      if (wasMulti || moved > 10 || e.timeStamp - start.t > 300) {
        lastTap = null;
        return;
      }
      const tap = { x: e.clientX, y: e.clientY, t: e.timeStamp };
      const prev = lastTap;
      const double = prev && tap.t - prev.t < 320 && Math.hypot(tap.x - prev.x, tap.y - prev.y) < 36;
      lastTap = double ? null : tap;
      if (!double) return;

      if (camera.zoom >= controls.maxZoom * 0.98) {
        // Back out to the framing the scene opened with.
        const { width, height } = sizeRef.current;
        goal.current = { zoom: fitZoom(bounds, width, height), cx: bounds.fx, cz: bounds.fz };
        easing.current = true;
        return;
      }
      const rect = dom.getBoundingClientRect();
      ray.setFromCamera(
        new THREE.Vector2(((tap.x - rect.left) / rect.width) * 2 - 1, -((tap.y - rect.top) / rect.height) * 2 + 1),
        camera,
      );
      if (!ray.ray.intersectPlane(plane, hit)) return;
      const zoom = Math.min(controls.maxZoom, camera.zoom * 2);
      // In an orthographic view the tapped point's offset from the centre
      // shrinks in proportion to the zoom, so this keeps it where it was.
      const keep = camera.zoom / zoom;
      const c = leashRef.current(
        hit.x + (controls.target.x - hit.x) * keep,
        hit.z + (controls.target.z - hit.z) * keep,
      );
      goal.current = { zoom, cx: c.x, cz: c.z };
      easing.current = true;
    };
    const onCancel = (e: PointerEvent) => {
      down.delete(e.pointerId);
      if (down.size === 0) multi = false;
      lastTap = null;
    };
    dom.addEventListener("pointerdown", onDown);
    dom.addEventListener("pointerup", onUp);
    dom.addEventListener("pointercancel", onCancel);
    return () => {
      dom.removeEventListener("pointerdown", onDown);
      dom.removeEventListener("pointerup", onUp);
      dom.removeEventListener("pointercancel", onCancel);
    };
  }, [controls, camera, dom, bounds]);

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

    // Keeping the walking character in view: the view drifts after it once it
    // is more than a couple of metres off centre, so a step or two does not
    // swing the whole school about.
    const f = followRef.current;
    if (f?.follow) {
      const dx = f.x - controls.target.x;
      const dz = f.z - controls.target.z;
      const d = Math.hypot(dx, dz);
      const slack = 1.5;
      if (d > slack) {
        const k = Math.min(1, dt * 3) * (1 - slack / d);
        controls.target.x += dx * k;
        controls.target.z += dz * k;
        camera.position.x += dx * k;
        camera.position.z += dz * k;
        controls.update();
      }
    }

    // The leash. Only acts at the very edge, so ordinary panning never feels it.
    const { x, z } = leash(controls.target.x, controls.target.z);
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
// Follows the school's own clock (schoolClock.ts), which runs a whole day in
// eighteen minutes — so the light is always on the move: a pink dawn, a pale
// noon, an amber evening, then blue moonlight. It is the first thing that says
// what time it is, before anybody reads the clock.
//
// Night is darker than it used to be, when the lighting read the real hour
// once and could not afford to make somebody's evening visit gloomy. Now the
// night lasts four minutes and ends in a sunrise, so it can look like night —
// but it stays readable: moonlight, not a blackout.

interface LightKey {
  /** School hour this key is exact at. */
  h: number;
  key: string;
  fill: string;
  sky: string;
  ground: string;
  keyI: number;
  hemiI: number;
  fillI: number;
}

const NIGHT: Omit<LightKey, "h"> = {
  key: "#a9b8f0", fill: "#6a78a8", sky: "#1f2740", ground: "#1d2233", keyI: 0.85, hemiI: 0.85, fillI: 0.3,
};
const NOON: Omit<LightKey, "h"> = {
  key: "#fff6e6", fill: "#b7cadb", sky: "#d8ebf6", ground: "#b0a695", keyI: 1.35, hemiI: 1.2, fillI: 0.45,
};

/** Around the clock, in order, first and last both at midnight. */
const LIGHT_KEYS: LightKey[] = [
  { h: 0, ...NIGHT },
  { h: 5.5, ...NIGHT },
  { h: 7, key: "#ffc9a0", fill: "#9aa8c8", sky: "#ecc9b6", ground: "#8d8171", keyI: 1.15, hemiI: 0.95, fillI: 0.4 },
  { h: 9.5, key: "#ffe4bd", fill: "#a8bcd0", sky: "#cfe4f2", ground: "#a89a86", keyI: 1.4, hemiI: 1.15, fillI: 0.45 },
  { h: 12, ...NOON },
  { h: 16.5, ...NOON },
  { h: 18.5, key: "#ffd9ab", fill: "#9aa6c4", sky: "#e8cbb2", ground: "#a2907d", keyI: 1.45, hemiI: 1.05, fillI: 0.45 },
  { h: 20, key: "#ffb487", fill: "#7d82b0", sky: "#b98f94", ground: "#6f5f60", keyI: 1.15, hemiI: 0.92, fillI: 0.4 },
  { h: 21.5, ...NIGHT },
  { h: 24, ...NIGHT },
];

/**
 * The sun, the sky and the fill light, eased between LIGHT_KEYS every frame.
 * Written straight into the lights rather than through React state: the light
 * changes continuously, and re-rendering the scene sixty times a second to
 * move it would be absurd.
 */
const DayCycle = () => {
  const scene = useThree((s) => s.scene);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const key = useRef<THREE.DirectionalLight>(null);
  const fill = useRef<THREE.DirectionalLight>(null);
  const sky = useMemo(() => new THREE.Color(), []);
  const b = useMemo(() => new THREE.Color(), []);

  useEffect(() => {
    const before = scene.background;
    scene.background = sky;
    return () => {
      scene.background = before;
    };
  }, [scene, sky]);

  useFrame(() => {
    const h = schoolNow().hours;
    let i = 0;
    while (i < LIGHT_KEYS.length - 2 && LIGHT_KEYS[i + 1].h <= h) i++;
    const from = LIGHT_KEYS[i];
    const to = LIGHT_KEYS[i + 1];
    const t = Math.min(1, Math.max(0, (h - from.h) / (to.h - from.h)));
    const mix = (x: string, y: string, out: THREE.Color) => out.set(x).lerp(b.set(y), t);
    const num = (x: number, y: number) => x + (y - x) * t;

    mix(from.sky, to.sky, sky);
    if (hemi.current) {
      mix(from.sky, to.sky, hemi.current.color);
      mix(from.ground, to.ground, hemi.current.groundColor);
      hemi.current.intensity = num(from.hemiI, to.hemiI);
    }
    if (key.current) {
      mix(from.key, to.key, key.current.color);
      key.current.intensity = num(from.keyI, to.keyI);
    }
    if (fill.current) {
      mix(from.fill, to.fill, fill.current.color);
      fill.current.intensity = num(from.fillI, to.fillI);
    }
  });

  return (
    <>
      <hemisphereLight ref={hemi} />
      <directionalLight ref={key} position={[14, 22, 10]} />
      {/* A dim light from behind the camera keeps the two visible walls from
          going flat black at the bottom of the frame. */}
      <directionalLight ref={fill} position={[-12, 9, -14]} />
    </>
  );
};

// ── Scene ───────────────────────────────────────────────────────────────────

/** What the scene is FOR right now. "play" is the school; "build" swaps the
 *  people for the rooms you could add. Not a boolean because customize mode
 *  lands in the same slot next. */
export type SchoolMode = "play" | "build" | "customize";

interface SceneProps {
  school: SchoolState;
  character: Pick<CharacterState, "skinTone" | "equipped" | "look"> | null;
  learnedWords: string[];
  /** Everything the people say, in the player's language (phraseBook.ts). */
  phrases: PhraseBook;
  interactive: boolean;
  /** Whole building from outside instead of the cutaway. */
  exterior?: boolean;
  mode?: SchoolMode;
  /** Build mode only. Drives which ghosts read as affordable. */
  wallet?: WalletBalances;
  selectedRoomId?: string | null;
  onPickRoom?: (roomId: string) => void;
  /** Translated room name; falls back to the id so the canvas needs no i18n. */
  roomName?: (roomId: string) => string;
  /** Rooms that arrived with the last purchase, which rise into place. */
  justBuilt?: string[];
  /** Glide to a room and have somebody in it say `text` — a note from the
   *  staff that the player asked to see. */
  announce?: { roomId: string; text: string; nonce: number } | null;
  /** What the sign over the way in says: the player's own name for the school,
   *  or the localized default. Resolved by the page — the canvas has no i18n. */
  schoolName?: string;
  /** Somebody in the school was tapped. The canvas makes no sound itself; the
   *  page decides what a poke sounds like. */
  onPersonTap?: (key: string, role: PersonRole) => void;
  /** Customize mode: tap targets on every room ("one"), every room outlined
   *  because a change is about to reach them all ("all"), or none at all
   *  ("none" — the outside, where the rooms are under the roof). */
  pickScope?: "one" | "all" | "none";
  /** The name over the player's own head, so they can pick themselves out of
   *  the class. None when visiting: that figure is the host. */
  playerName?: string;
  /** "Find me": a new number glides the camera to the player's desk — or,
   *  while walking, back onto the player wherever they are. */
  seekMe?: number;
  /** The player is up and walking round the school (Walking.tsx). */
  walking?: boolean;
}

/**
 * The school's name, on a board over the way in: above the forecourt's gate
 * once there is one, on the signpost by the front door before that. DOM rather
 * than a texture, for the same reason the chalkboard word is — at this render
 * scale painted letters are a smudge.
 */
const SchoolSign = ({ position, text }: { position: [number, number, number]; text: string }) => (
  <Html position={position} center zIndexRange={[15, 0]} style={{ pointerEvents: "none" }}>
    <div
      style={{
        background: "#2f4a3a",
        color: "#f4e6b8",
        border: "2px solid #c9a24e",
        borderRadius: 4,
        padding: "2px 9px",
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: 0.5,
        whiteSpace: "nowrap",
        boxShadow: "0 2px 0 rgba(0,0,0,0.3)",
      }}
    >
      {text}
    </div>
  </Html>
);

const NO_WALLET: WalletBalances = { bitAward: 0, bitWord: 0, bitPhrase: 0 };

/** An hour that stands for each part of the day, for what people say: "Good
 *  morning!" through lessons, "Good evening!" after dark. */
const HOUR_OF_PART: Record<DayPart, number> = {
  morning: 7,
  lessons: 10,
  afterSchool: 16,
  evening: 19,
  night: 23,
};

const Scene = ({
  school,
  character,
  learnedWords,
  phrases,
  interactive,
  exterior = false,
  mode = "play",
  wallet = NO_WALLET,
  selectedRoomId = null,
  onPickRoom,
  roomName,
  justBuilt,
  announce = null,
  schoolName,
  onPersonTap,
  pickScope = "one",
  playerName,
  seekMe = 0,
  walking = false,
}: SceneProps) => {
  const building = mode === "build";
  const customizing = mode === "customize";
  const plan = useMemo(
    () =>
      buildPlan(
        school.ownedRoomIds,
        school.variantId ?? DEFAULT_VARIANT_ID,
        school.levelFloor,
        school.payroll?.morale ?? 100,
      ),
    [school.ownedRoomIds, school.variantId, school.levelFloor, school.payroll?.morale],
  );
  // One resolved look per room: its own overrides where it has them, the
  // school's default everywhere else. Memoised as a map rather than resolved at
  // each call site, because Building asks for every room on every render.
  const looks = useMemo(() => {
    const base = {
      layoutId: school.layoutId,
      wallpaperId: school.wallpaperId,
      floorId: school.floorId,
    };
    const out = new Map<string, RoomLook>();
    for (const r of plan.rooms) out.set(r.id, lookFor(r.id, school.presets ?? {}, base));
    return out;
  }, [plan.rooms, school.presets, school.layoutId, school.wallpaperId, school.floorId]);

  const lookOf = useCallback(
    (roomId: string) => looks.get(roomId) ?? lookFor(roomId, {}, school),
    [looks, school],
  );

  // Per classroom, so a room the player has rearranged keeps its arrangement —
  // and so the students sit at the desks that room actually has.
  const layoutOf = useCallback((roomId: string) => lookOf(roomId).layoutId, [lookOf]);

  const ghosts = useMemo(
    () => (building ? ghostRooms(school.variantId ?? DEFAULT_VARIANT_ID, school.ownedRoomIds) : []),
    [building, school.variantId, school.ownedRoomIds],
  );
  // The build preview: tap a room you could buy and the school is drawn as it
  // would be with it — its walls in the school's wallpaper, its floor, its
  // furniture, and whatever else it changes (the corridor stretching to meet
  // it, the forecourt reception brings). People still come from the school you
  // HAVE, so the new room stands empty: that is how it reads as a preview.
  const previewing = useMemo(
    () =>
      building && selectedRoomId
        ? (ghosts.find((g) => g.spec.id === selectedRoomId && g.blocker === null) ?? null)
        : null,
    [building, selectedRoomId, ghosts],
  );
  const shown = useMemo(() => {
    if (!previewing) return plan;
    const want = new Set([...school.ownedRoomIds, previewing.spec.id, ...previewing.extra.map((r) => r.id)]);
    const vid = school.variantId ?? DEFAULT_VARIANT_ID;
    return buildPlan(
      getVariant(vid).rooms.map((r) => r.id).filter((id) => want.has(id)),
      vid,
      school.levelFloor,
      school.payroll?.morale ?? 100,
    );
  }, [previewing, plan, school.ownedRoomIds, school.variantId, school.levelFloor, school.payroll?.morale]);

  const desks = useMemo(
    () => classroomsOf(shown).flatMap((c) => deskLayout(shown, layoutOf(c.id), c.id)),
    [shown, layoutOf],
  );
  // From outside, only what stands on open ground is still visible; everything
  // indoors is behind a wall and a roof, so drawing it is pure waste.
  const furniture = useMemo(() => {
    const all = stageProps(shown);
    if (!exterior) return all;
    const outdoors = new Set(shown.rooms.filter((r) => r.outdoor).map((r) => r.id));
    return all.filter((p) => outdoors.has(p.key.split("-")[0]));
  }, [shown, exterior]);
  // Everybody the school holds, then only whoever is in at this hour.
  const fullCast = useMemo(() => peoplePlan(plan, layoutOf), [plan, layoutOf]);
  // The front step and path, until there is a forecourt to arrive through.
  // Outside every room, so outside `stageProps`; hidden while building, when
  // that ground is a ghost you can tap.
  const porch = useMemo(() => (building ? [] : porchProps(plan)), [plan, building]);
  const rising = useMemo(() => new Set(justBuilt ?? []), [justBuilt]);
  // The school's own lights. Lamps hang in every room (not the ones still
  // going up); the light they give is only mounted after dark, so the day
  // pays nothing for it. Lampposts, inside the grounds and out, throw a pool.
  const pendants = useMemo(
    () => pendantsFor(shown.rooms).filter((p) => !rising.has(p.roomId)),
    [shown.rooms, rising],
  );
  const lights = useMemo(() => roomLights(shown.rooms), [shown.rooms]);
  const lampposts = useMemo(
    () => [...furniture, ...porch].filter((p) => p.type === "lamppost"),
    [furniture, porch],
  );
  const risingRects = useMemo(() => plan.rooms.filter((r) => rising.has(r.id)), [plan.rooms, rising]);
  const speakUp = useMemo(() => {
    if (!announce) return null;
    const rect = plan.rooms.find((r) => r.id === announce.roomId);
    return rect ? { rect, text: announce.text, nonce: announce.nonce } : null;
  }, [announce, plan.rooms]);
  const outside = useMemo(() => outsideLook(school.exterior), [school.exterior]);
  // Over the gate if there is one, else over the porch's signpost.
  const signAt = useMemo((): [number, number, number] | null => {
    const court = plan.rooms.find((r) => r.id === "forecourt");
    if (court) return [court.x + court.w / 2, 3.85, court.z + court.d - 0.2];
    const post = porch.find((p) => p.type === "signpost");
    return post ? [post.x, 2.1, post.z] : null;
  }, [plan.rooms, porch]);
  // Framed only while customizing. In build mode the selected room is a ghost
  // and the point is to see it in context, not to fill the screen with it.
  const focusRect = useMemo(
    () =>
      customizing && selectedRoomId
        ? (plan.rooms.find((r) => r.id === selectedRoomId) ?? null)
        : null,
    [customizing, selectedRoomId, plan.rooms],
  );
  // The school's own clock, the same one the lighting reads — so "Good
  // evening!" and the amber light agree with each other. Only the PART of the
  // day re-renders the scene; the light moves on its own every frame.
  const part = useDayPart();
  const hour = HOUR_OF_PART[part];
  const pool = useMemo(() => buildBubblePool(learnedWords, hour, phrases), [learnedWords, hour, phrases]);
  // The plot the school stands on, sized for the finished campus; and the way
  // in from the street, which moves as the front door does.
  const variantId = school.variantId ?? DEFAULT_VARIANT_ID;
  const grounds = useMemo(() => groundsPlan(variantId), [variantId]);
  const way = useMemo(() => wayIn(plan, grounds), [plan, grounds]);
  // The grounds in use: a kickabout and a busy playground before school,
  // after it, and into the evening under the floodlights — never in lesson
  // time, and never at night.
  const play = useMemo(() => playCast(grounds), [grounds]);
  const outdoors = part === "morning" || part === "afterSchool" || part === "evening";
  const cast = useMemo(() => {
    const here = castFor(plan, fullCast, part);
    // Morning and after school, people are coming and going up the path.
    const coming = part === "morning" || part === "afterSchool";
    return {
      ...here,
      roomLoops: coming ? [...here.roomLoops, ...arrivals(way, grounds)] : here.roomLoops,
      play: outdoors ? play : undefined,
    };
  }, [plan, fullCast, part, way, grounds, play, outdoors]);
  const glide = useMemo(
    () => (announce ? { roomId: announce.roomId, nonce: announce.nonce } : null),
    [announce],
  );
  // Walking round the school: a grid of where a body can stand, built only
  // while it is wanted, and the character itself, which starts from the
  // player's desk (or the corridor, after dark, when there is no desk to be
  // at) and keeps its place if the school changes under it.
  const walkable = walking && mode === "play" && !exterior;
  const grid = useMemo(() => (walkable ? walkGrid(plan) : null), [walkable, plan]);
  const [avatar, setAvatar] = useState<AvatarState | null>(null);
  useEffect(() => {
    if (!grid) {
      setAvatar(null);
      return;
    }
    setAvatar((prev) => {
      const hub = plan.rooms.find((r) => r.id === "corridor") ?? plan.rooms[0];
      const from = prev ?? cast.playerSeat ?? { x: hub.x + hub.w / 2, z: hub.z + hub.d / 2 };
      const at = nearestStandable(grid, from, 8);
      if (!at) return null;
      if (prev) {
        prev.x = at.x;
        prev.z = at.z;
        prev.path = [];
        prev.target = null;
        return prev;
      }
      // Stand up facing the way the chair did.
      return newAvatar(at, cast.playerSeat ? cast.playerSeat.ry + Math.PI : 0);
    });
    // The seat only matters at the moment the character gets up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid]);
  useWalkKeys(avatar);
  const walker = useMemo(() => (avatar && grid ? { state: avatar, grid } : null), [avatar, grid]);
  // "Find me" while walking: back onto the character, wherever it has got to.
  useEffect(() => {
    if (seekMe && avatar) avatar.follow = true;
  }, [seekMe, avatar]);

  // "Find me": the player's desk, whenever they are in (not after dark).
  const seek = useMemo(
    () => ({ at: walker ? null : cast.playerSeat, nonce: seekMe }),
    [cast.playerSeat, seekMe, walker],
  );
  const words = useMemo(() => boardWords(learnedWords), [learnedWords]);
  // The player's own character, as they made it in the dashboard.
  const playerLook = useMemo(() => resolveLook(character), [character]);

  // Tapping the board chalks up the next word you have learned. It is the only
  // prop with state, and it deliberately holds none of it on the server.
  const [boardIdx, setBoardIdx] = useState(0);
  const boardWord = words.length ? words[boardIdx % words.length] : null;

  // Who is walking where, for the doors that open when somebody reaches them.
  // One set for the life of the scene; the walkers add and remove themselves.
  const presence = useMemo<Presence>(() => new Set(), []);
  // The season from the calendar; the lights from the school clock. They go on
  // at seven in the evening and off at seven in the morning, which are both
  // edges of a part of the day, so this is exact without ticking.
  const atmosphere = useMemo(
    () => ({ season: seasonFor(new Date()), lightsOn: part === "evening" || part === "night" }),
    [part],
  );

  return (
    <PresenceContext.Provider value={presence}>
    <AtmosphereContext.Provider value={atmosphere}>
      <DayCycle />
      <NightDriver />
      {/* Everything that stands still, drawn as a few merged meshes instead of
          one per box (bake.ts). What moves inside it is marked LIVE. */}
      <Baked>
        <Grounds grounds={grounds} way={way} playing={outdoors} />

        <Building plan={shown} lookFor={lookOf} exterior={exterior} rising={rising} outside={outside} />
        <Furnishings
          props={furniture}
          rising={rising}
          boardWord={exterior || building ? null : boardWord}
          onBoardTap={
            interactive && !exterior && !building && words.length
              ? () => setBoardIdx((i) => i + 1)
              : undefined
          }
        />
        <Furnishings props={porch} />
        <LampPools at={lampposts} />
        {/* Indoors, under the roof from outside: nothing to see there. */}
        {!exterior && <Pendants pendants={pendants} />}
        {!exterior && <Deskware desks={desks} rising={risingRects} />}
      </Baked>
      {schoolName && signAt && !building && !customizing && <SchoolSign position={signAt} text={schoolName} />}
      {!exterior && atmosphere.lightsOn && <RoomLights lights={lights} />}
      <People
        plan={cast}
        pool={pool}
        playerLook={playerLook}
        interactive={interactive && !exterior && !building && !customizing}
        // Bubbles are DOM overlays and ignore depth, so from outside they would
        // float over the roof while the person saying them is correctly hidden.
        // In build and customize mode they would fight the room labels for the
        // same pixels, and those labels are what you are there to read.
        mute={exterior || building || customizing}
        announce={speakUp}
        onTap={onPersonTap}
        playerName={playerName}
        walker={walker}
      />
      {walker && (
        <>
          <FloorCatcher land={grounds.tile} state={walker.state} grid={walker.grid} />
          <WalkTarget state={walker.state} />
        </>
      )}

      {customizing && pickScope !== "none" && (
        <RoomPicks
          rooms={plan.rooms}
          selected={selectedRoomId}
          onPick={onPickRoom}
          nameOf={roomName ?? ((id) => id)}
          all={pickScope === "all"}
        />
      )}

      {building && (
        <Ghosts ghosts={ghosts} wallet={wallet} selectedRoomId={selectedRoomId} onPick={onPickRoom} />
      )}

      <CameraRig
        plan={plan}
        ghosts={ghosts}
        focus={focusRect}
        glide={glide}
        seek={seek}
        land={grounds.tile}
        // The decorate sheet covers the bottom half, near enough.
        bottomInset={customizing ? 0.45 : 0}
        follow={avatar}
      />
    </AtmosphereContext.Provider>
    </PresenceContext.Provider>
  );
};

// ── Canvas ──────────────────────────────────────────────────────────────────

export interface SchoolCanvasProps extends SceneProps {
  className?: string;
}

export const SchoolCanvas = ({ className = "", ...scene }: SchoolCanvasProps) => {
  const scale = useRenderScale();
  return (
  <div className={`relative ${className}`}>
    {/* The nearest-neighbour upscale has to be applied to the <canvas> itself,
        which R3F owns — hence a rule rather than a style prop. */}
    <style>{`.school-canvas canvas { image-rendering: pixelated; image-rendering: crisp-edges; }`}</style>
    <Canvas
      className="school-canvas"
      orthographic
      flat
      dpr={scale}
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
};

export default SchoolCanvas;
