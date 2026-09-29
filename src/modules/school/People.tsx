// modules/school/People.tsx
//
// Everyone in the school. Bodies are boxes on refs, driven every frame — see
// docs/room-game-concept.md §6 for how this becomes useAnimations + named glTF
// clips without touching the state machine above it. What a body IS — which
// boxes, in what colours — lives in modules/character (figureParts.ts), shared
// with the character the player builds in the dashboard: the player at the
// front desk is drawn by the same code as the student next to them.
//
// Two rules keep it from looking mechanical:
//
//   • every actor gets a per-actor phase offset, so fifteen students on the
//     same 2.4-second write loop never reach the bottom of the stroke together;
//   • walkers pause at waypoints and turn while paused, because a figure that
//     changes direction without stopping reads as sliding, not walking.
//
// Speech is scheduled centrally rather than per actor: exactly one bubble at a
// time is the difference between "a room with people in it" and a comic panel.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import {
  PatrolPerson,
  PeoplePlan,
  SEAT_TOP,
  SeatedPerson,
  Spot,
  WALK_SPEED,
  walkerAt,
} from "./props";
import { BubblePool, PersonRole, pickLine } from "./bubbles";
import { usePresencePoint } from "./presence";
import { Figure } from "../character/Figure";
import { BodyRefs, useBodyRefs } from "../character/bodyRefs";
import { CharacterLook, DEFAULT_LOOK, crowdLook } from "../character/look";

/** What somebody in the school looks like — the same shape as the player's
 *  own character. */
export type PersonLook = CharacterLook;

/** A tracksuit and a cap — the gym's coach. */
const COACH_LOOK: PersonLook = {
  ...DEFAULT_LOOK,
  skin: "#c98c5b",
  hair: "short",
  hairColor: "#2b2d2f",
  top: "hoodie",
  topColor: "#c43d3d",
  bottomColor: "#2e3a58",
  hat: "cap",
  hatColor: "#2e3a58",
};

/** Cardigan and slacks: the adults who work here but do not teach. */
const STAFF_LOOK: PersonLook = {
  ...DEFAULT_LOOK,
  skin: "#f2c48d",
  hair: "bob",
  hairColor: "#8a8a8a",
  top: "sweater",
  topColor: "#7a8f6a",
  bottomColor: "#4a4238",
  glasses: "glasses",
};

/** Whites, so the person behind the counter reads as kitchen staff at twelve
 *  pixels tall. The hat is the chef's toque. */
const COOK_LOOK: PersonLook = {
  ...DEFAULT_LOOK,
  skin: "#e0a870",
  hairColor: "#2b2d2f",
  top: "sweater",
  topColor: "#f1efe8",
  bottomColor: "#5b6270",
  hat: "chef",
  hatColor: "#ffffff",
};

/** Overalls and a cap: the caretaker, who has the building to themselves at
 *  night. */
const CARETAKER_LOOK: PersonLook = {
  ...DEFAULT_LOOK,
  skin: "#d9a577",
  hairColor: "#5a4a3a",
  top: "sweater",
  topColor: "#3f6b5a",
  bottomColor: "#3f6b5a",
  hat: "cap",
  hatColor: "#2f4a3a",
};

/** Shirt and tie: whoever is at the front of the class. */
const TEACHER_LOOK: PersonLook = {
  ...DEFAULT_LOOK,
  skin: "#e8b98a",
  hairColor: "#4a3b2f",
  top: "shirt",
  topColor: "#5c6b8a",
  bottomColor: "#3a4152",
};

// ── Body ────────────────────────────────────────────────────────────────────

const Body = ({ refs, look, sitting }: { refs: BodyRefs; look: PersonLook; sitting: boolean }) => (
  <Figure refs={refs} look={look} sitting={sitting} seatTop={SEAT_TOP} />
);

// ── Bubble ──────────────────────────────────────────────────────────────────

const Bubble = ({ text }: { text: string }) => (
  <Html position={[0, 1.75, 0]} center style={{ pointerEvents: "none" }} zIndexRange={[20, 0]}>
    <div
      style={{
        background: "rgba(255,255,255,0.96)",
        color: "#1f2430",
        border: "2px solid #2b3040",
        borderRadius: 10,
        padding: "4px 9px",
        fontSize: 12,
        fontWeight: 700,
        // Chatter is a few words on one line. A note from the staff repeated
        // in the room is a whole sentence, and wraps rather than stretching
        // across half the school.
        whiteSpace: text.length > 32 ? "normal" : "nowrap",
        width: text.length > 32 ? 220 : undefined,
        textAlign: "center",
        boxShadow: "0 2px 0 rgba(43,48,64,0.35)",
        transform: "translateY(-6px)",
      }}
    >
      {text}
    </div>
  </Html>
);

/** The player's name over their own head, so they can find themselves in a
 *  class of look-alikes. Gold, like the ring at their feet. */
const NameTag = ({ text }: { text: string }) => (
  <Html position={[0, 1.62, 0]} center style={{ pointerEvents: "none" }} zIndexRange={[18, 0]}>
    <div
      style={{
        background: "#f4c04a",
        color: "#1f2430",
        border: "2px solid #2b3040",
        borderRadius: 6,
        padding: "1px 7px",
        fontSize: 11,
        fontWeight: 800,
        whiteSpace: "nowrap",
        maxWidth: 140,
        overflow: "hidden",
        textOverflow: "ellipsis",
        boxShadow: "0 2px 0 rgba(43,48,64,0.35)",
      }}
    >
      {text}
    </div>
  </Html>
);

// A hit target big enough for a thumb. The body is a stack of thin boxes with
// gaps between the limbs, so tapping the actual geometry misses about half the
// time on a phone.
const HitBox = ({ onTap }: { onTap: () => void }) => (
  <mesh
    position={[0, 0.75, 0]}
    onClick={(e) => {
      e.stopPropagation();
      onTap();
    }}
  >
    <boxGeometry args={[0.75, 1.5, 0.75]} />
    <meshBasicMaterial transparent opacity={0} depthWrite={false} />
  </mesh>
);

/** Shared poke response: a short hop, decaying. Returns a getter the caller
 *  folds into whatever y offset its pose already uses. */
function useHop() {
  const t = useRef(0);
  const trigger = useCallback(() => {
    t.current = 1;
  }, []);
  const advance = (dt: number) => {
    if (t.current <= 0) return 0;
    t.current = Math.max(0, t.current - dt * 2.2);
    return Math.sin((1 - t.current) * Math.PI) * 0.18;
  };
  return { trigger, advance };
}

// ── Seated student ──────────────────────────────────────────────────────────

const POSE_ANIM = {
  desk: { arm: 0.55, speed: 2.3, lean: 0.09 },
  armchair: { arm: 0.12, speed: 1.1, lean: 0.03 },
  booth: { arm: 0.22, speed: 1.6, lean: 0.05 },
  // Fork to mouth: a big, slow lift of the right arm, in bursts like writing.
  eat: { arm: 0.85, speed: 1.3, lean: 0.06 },
} as const;

const Seated = ({
  spot,
  pose,
  look,
  phase,
  bubble,
  onTap,
  ring,
  tag,
}: {
  spot: Spot;
  pose: SeatedPerson["pose"];
  look: PersonLook;
  phase: number;
  bubble: string | null;
  onTap: () => void;
  /** The player's own avatar gets a marker so they can find themselves. */
  ring?: boolean;
  /** …and their name over their head, unless they are saying something. */
  tag?: string | null;
}) => {
  const refs = useBodyRefs();
  const hop = useHop();
  const cfg = POSE_ANIM[pose];
  // The seated body in Body() is already authored sitting: shins reach the
  // floor and the hips land at chair height. Lifting the group on top of that
  // would float the whole figure above its own chair.
  const baseY = 0;

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime * cfg.speed + phase;
    const stroke = Math.sin(t);
    // A long slow wave gates the fast one, so writing comes in bursts with
    // pauses between them instead of running like a metronome forever.
    const gate = Math.max(0, Math.sin(clock.elapsedTime * 0.28 + phase * 1.7));

    if (refs.armR.current) {
      refs.armR.current.rotation.x = -1.15 + stroke * cfg.arm * gate;
      refs.armR.current.rotation.z = 0.25;
    }
    if (refs.armL.current) {
      refs.armL.current.rotation.x = -1.1 + Math.sin(t * 0.5) * 0.06;
      refs.armL.current.rotation.z = -0.3;
    }
    if (refs.torso.current) {
      refs.torso.current.rotation.x = -cfg.lean * gate;
    }
    if (refs.head.current) {
      // Every so often a student looks up and sideways at a neighbour.
      const glance = Math.sin(clock.elapsedTime * 0.19 + phase * 2.3);
      refs.head.current.rotation.y = glance > 0.82 ? (glance - 0.82) * 6.5 : 0;
      refs.head.current.rotation.x = -0.22 * gate - Math.sin(t * 0.6) * 0.04;
    }
    if (refs.root.current) {
      refs.root.current.position.y = hop.advance(dt);
    }
  });

  return (
    <group position={[spot.x, baseY, spot.z]} rotation={[0, spot.ry, 0]}>
      <Body refs={refs} look={look} sitting />
      <HitBox
        onTap={() => {
          hop.trigger();
          onTap();
        }}
      />
      {ring && (
        <mesh position={[0, -baseY + 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.36, 0.46, 16]} />
          <meshBasicMaterial color="#f4c04a" transparent opacity={0.9} depthWrite={false} />
        </mesh>
      )}
      {bubble ? <Bubble text={bubble} /> : tag ? <NameTag text={tag} /> : null}
    </group>
  );
};

// ── Walker (teacher and wanderers) ──────────────────────────────────────────

const Walker = ({
  path,
  look,
  phase,
  bubble,
  onTap,
  idleFacing,
  lane,
  floorY = 0,
  ball = false,
}: {
  path: Spot[];
  look: PersonLook;
  phase: number;
  bubble: string | null;
  onTap: () => void;
  /** Which way to face when stopped. Teachers turn to the class; wanderers,
   *  who leave it undefined, keep facing the way they were going. */
  idleFacing?: number;
  /** Right-of-centre offset; see PatrolPerson.lane. */
  lane?: number;
  /** Height of whatever they are standing on — the stage. */
  floorY?: number;
  /** Bounces a ball as they go. */
  ball?: boolean;
}) => {
  const refs = useBodyRefs();
  const hop = useHop();
  const group = useRef<THREE.Group>(null);
  const ballRef = useRef<THREE.Mesh>(null);
  const here = usePresencePoint();

  useFrame(({ clock }, dt) => {
    if (!group.current || path.length < 2) return;

    // Position comes from the clock, not from integrating dt. Everybody on a
    // roaming loop walks the SAME loop at the SAME speed and holds for the
    // SAME time at each stop, so their spacing — set once, by distance, in
    // props.ts `spaceOut` — can never drift. It used to drift: the pause at
    // each waypoint was derived from the walker's own phase, so two wanderers
    // took different amounts of time per lap and slowly closed on one another
    // until they were standing in the same doorway, mixed up together.
    const step = walkerAt(path, clock.elapsedTime, WALK_SPEED, lane);
    const walking = step.walking;
    group.current.position.x = step.x;
    group.current.position.z = step.z;
    here.x = step.x;
    here.z = step.z;

    // Face the class while stopped, the direction of travel while moving, and
    // ease between the two rather than snapping.
    const want = walking || idleFacing === undefined ? step.heading : idleFacing;
    const cur = group.current.rotation.y;
    let delta = ((want - cur + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (delta < -Math.PI) delta += Math.PI * 2;
    group.current.rotation.y = cur + delta * Math.min(1, dt * 6);

    const t = clock.elapsedTime * 6 + phase;
    const swing = walking ? Math.sin(t) : 0;
    if (refs.legL.current) refs.legL.current.rotation.x = swing * 0.6;
    if (refs.legR.current) refs.legR.current.rotation.x = -swing * 0.6;
    if (refs.armL.current) {
      refs.armL.current.rotation.x = walking
        ? -swing * 0.45
        : // Standing still, a teacher gestures.
          -0.35 + Math.sin(clock.elapsedTime * 2.1 + phase) * 0.35;
    }
    if (refs.armR.current) refs.armR.current.rotation.x = walking ? swing * 0.45 : 0.06;
    if (refs.head.current) {
      refs.head.current.rotation.y = walking ? 0 : Math.sin(clock.elapsedTime * 1.3 + phase) * 0.28;
    }
    if (refs.root.current) {
      // Bob on the stride, plus any hop from a poke.
      refs.root.current.position.y = (walking ? Math.abs(Math.sin(t)) * 0.045 : 0) + hop.advance(dt);
    }
    if (ballRef.current) {
      // Dribbled: down to the floor and back up to the hand, twice a stride.
      ballRef.current.position.y = 0.12 + Math.abs(Math.sin(t * 0.5)) * 0.5;
    }
  });

  return (
    <group ref={group} position={[path[0].x, floorY, path[0].z]}>
      <Body refs={refs} look={look} sitting={false} />
      {ball && (
        <mesh ref={ballRef} position={[0.3, 0.4, 0.3]}>
          <sphereGeometry args={[0.12, 8, 6]} />
          <meshLambertMaterial color="#e0702e" />
        </mesh>
      )}
      <HitBox
        onTap={() => {
          hop.trigger();
          onTap();
        }}
      />
      {bubble && <Bubble text={bubble} />}
    </group>
  );
};


// ── Commuter (walks between rooms and sits down at each end) ────────────────

/**
 * The one actor with somewhere to be. Sits, gets up, walks a route across the
 * campus, sits down at the other end, and eventually walks back.
 *
 * It is deliberately a four-phase loop rather than anything cleverer: a student
 * who wanders semi-randomly reads as lost, whereas one who leaves the library,
 * crosses the corridor and takes a seat in the lab reads as having a timetable
 * — which is the impression a school wants to give.
 *
 * `sitting` is React state, not a ref, because the seated and standing bodies
 * are different geometry; everything else lives in a ref and is driven per
 * frame, so the component re-renders roughly twice a minute.
 */
const Commuter = ({
  seats,
  path,
  look,
  phase,
  bubble,
  onTap,
}: {
  seats: [Spot, Spot];
  path: Spot[];
  look: PersonLook;
  phase: number;
  bubble: string | null;
  onTap: () => void;
}) => {
  const refs = useBodyRefs();
  const hop = useHop();
  const group = useRef<THREE.Group>(null);
  const [sitting, setSitting] = useState(true);
  const here = usePresencePoint();

  // seat → waypoints → seat. Walking either way is the same array, reversed.
  const full = useMemo<Spot[]>(() => [seats[0], ...path, seats[1]], [seats, path]);

  const st = useRef({
    atEnd: 0,
    dwell: 6 + (phase % 7),
    route: full,
    leg: 0,
    t: 0,
  });

  useFrame(({ clock }, dt) => {
    const g = group.current;
    if (!g) return;
    const s = st.current;

    if (sitting) {
      const seat = seats[s.atEnd];
      g.position.set(seat.x, 0, seat.z);
      here.x = seat.x;
      here.z = seat.z;
      g.rotation.y = seat.ry;

      // Same writing loop the resident students use, so a visitor at a table
      // does not stand out as a different kind of thing.
      const t = clock.elapsedTime * 2.1 + phase;
      const gate = Math.max(0, Math.sin(clock.elapsedTime * 0.3 + phase));
      if (refs.armR.current) refs.armR.current.rotation.x = -1.1 + Math.sin(t) * 0.4 * gate;
      if (refs.armL.current) refs.armL.current.rotation.x = -1.05;
      if (refs.head.current) refs.head.current.rotation.x = -0.18 * gate;
      if (refs.root.current) refs.root.current.position.y = hop.advance(dt);

      s.dwell -= dt;
      if (s.dwell <= 0) {
        s.route = s.atEnd === 0 ? full : [...full].slice().reverse();
        s.leg = 0;
        s.t = 0;
        setSitting(false);
      }
      return;
    }

    const route = s.route;
    const from = route[s.leg];
    const to = route[s.leg + 1];
    if (!from || !to) return;
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const dist = Math.hypot(dx, dz) || 1;

    s.t += (dt * WALK_SPEED) / dist;
    if (s.t >= 1) {
      s.t = 0;
      s.leg += 1;
      if (s.leg >= route.length - 1) {
        // Arrived. Take the seat at this end and settle in for a while.
        s.atEnd = 1 - s.atEnd;
        s.dwell = 8 + ((phase * 3) % 9);
        setSitting(true);
        return;
      }
    }

    g.position.set(from.x + dx * s.t, 0, from.z + dz * s.t);
    here.x = g.position.x;
    here.z = g.position.z;
    const want = Math.atan2(dx, dz);
    const cur = g.rotation.y;
    let delta = ((want - cur + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (delta < -Math.PI) delta += Math.PI * 2;
    g.rotation.y = cur + delta * Math.min(1, dt * 7);

    const stride = clock.elapsedTime * 6 + phase;
    const swing = Math.sin(stride);
    if (refs.legL.current) refs.legL.current.rotation.x = swing * 0.6;
    if (refs.legR.current) refs.legR.current.rotation.x = -swing * 0.6;
    if (refs.armL.current) refs.armL.current.rotation.x = -swing * 0.45;
    if (refs.armR.current) refs.armR.current.rotation.x = swing * 0.45;
    if (refs.head.current) refs.head.current.rotation.x = 0;
    if (refs.root.current) {
      refs.root.current.position.y = Math.abs(Math.sin(stride)) * 0.045 + hop.advance(dt);
    }
  });

  return (
    <group ref={group} position={[seats[0].x, 0, seats[0].z]}>
      <Body refs={refs} look={look} sitting={sitting} />
      <HitBox
        onTap={() => {
          hop.trigger();
          onTap();
        }}
      />
      {bubble && <Bubble text={bubble} />}
    </group>
  );
};

// ── The cast ────────────────────────────────────────────────────────────────

export interface PeopleProps {
  plan: PeoplePlan;
  pool: BubblePool;
  playerLook: PersonLook;
  /** Visiting someone else's school: nobody talks back to you. */
  interactive?: boolean;
  /** Suppress every bubble. Used by the exterior view, where a DOM overlay
   *  would hang in the air over the roof. */
  mute?: boolean;
  /** Have somebody inside `rect` say `text`, now. A note from the staff that
   *  the player tapped "show me" on: the person it came from says it again in
   *  the room, so the card and the school are the same conversation. */
  announce?: { rect: { x: number; z: number; w: number; d: number }; text: string; nonce: number } | null;
  /** Somebody was poked — for the page's sound effects. */
  onTap?: (key: string, role: PersonRole) => void;
  /** Shown over the player's head. */
  playerName?: string;
}

export const People = ({
  plan,
  pool,
  playerLook,
  interactive = true,
  mute = false,
  announce = null,
  onTap,
  playerName,
}: PeopleProps) => {
  const [speaking, setSpeaking] = useState<{ key: string; text: string } | null>(null);
  const timer = useRef<number | null>(null);
  // Restarts the ambient chatter after a bubble somebody asked for — a poke,
  // or an announcement — has had its turn. Without it, the first poke ended
  // the room's chatter for as long as the page stayed open.
  const resume = useRef<() => void>(() => {});

  // Every actor that can hold a bubble, so the scheduler can pick one without
  // caring which kind it is. Each carries its ROLE, which is what decides the
  // pool it speaks from: reception says "Welcome!", the gym says "Nice pass!".
  const cast = useMemo(() => {
    const entries: { key: string; role: PersonRole }[] = [
      ...plan.students.map((s) => ({ key: s.key, role: s.role })),
      ...plan.teachers.map((t) => ({ key: t.key, role: t.role })),
      ...plan.wanderers.map((w) => ({ key: w.key, role: w.role })),
      ...plan.commuters.map((c) => ({ key: c.key, role: c.role })),
      ...plan.roomLoops.map((w) => ({ key: w.key, role: w.role })),
    ];
    if (plan.playerSeat) entries.push({ key: "me", role: "student" });
    return entries;
  }, [plan]);

  const say = useCallback(
    (key: string, role: PersonRole) => {
      setSpeaking({ key, text: pickLine(pool[role] ?? pool.student) });
    },
    [pool],
  );

  // One bubble at a time, on a self-rescheduling timeout rather than an
  // interval: the gap is randomised per tick, and an interval cannot do that.
  useEffect(() => {
    if (cast.length === 0) return;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const pick = cast[Math.floor(Math.random() * cast.length)];
      say(pick.key, pick.role);
      timer.current = window.setTimeout(() => {
        if (cancelled) return;
        setSpeaking(null);
        timer.current = window.setTimeout(tick, 1400 + Math.random() * 2600);
      }, 2800);
    };

    resume.current = () => {
      if (!cancelled) timer.current = window.setTimeout(tick, 1400 + Math.random() * 2600);
    };
    timer.current = window.setTimeout(tick, 1200);
    return () => {
      cancelled = true;
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [cast, say]);

  const tap = useCallback(
    (key: string, role: PersonRole) => {
      if (!interactive) return;
      onTap?.(key, role);
      // A poke jumps the queue: clear the pending hide so the bubble the player
      // asked for is not cut short by the scheduler's timer.
      if (timer.current) window.clearTimeout(timer.current);
      say(key, role);
      timer.current = window.setTimeout(() => {
        setSpeaking(null);
        resume.current();
      }, 2800);
    },
    [interactive, say, onTap],
  );

  // Whoever is in the room the note came from — staff before students, since
  // it is the staff who send the notes.
  useEffect(() => {
    if (!announce) return;
    const { rect, text } = announce;
    const inside = (p: { x: number; z: number }) =>
      p.x > rect.x && p.x < rect.x + rect.w && p.z > rect.z && p.z < rect.z + rect.d;
    const who =
      plan.teachers.find((t) => inside(t.path[0])) ??
      plan.roomLoops.find((w) => w.outfit && inside(w.path[0])) ??
      plan.students.find((s) => s.role !== "student" && inside(s.spot)) ??
      plan.roomLoops.find((w) => inside(w.path[0])) ??
      plan.students.find((s) => inside(s.spot));
    if (!who) return;
    if (timer.current) window.clearTimeout(timer.current);
    setSpeaking({ key: who.key, text });
    timer.current = window.setTimeout(() => {
      setSpeaking(null);
      resume.current();
    }, 6000);
    // Only a new nonce is a new announcement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announce?.nonce]);

  const bubbleFor = (key: string) =>
    !mute && speaking?.key === key ? speaking.text : null;

  return (
    <group>
      {plan.playerSeat && (
        <Seated
          spot={plan.playerSeat}
          pose="desk"
          look={playerLook}
          phase={0.4}
          ring
          tag={mute ? null : playerName}
          bubble={bubbleFor("me")}
          onTap={() => tap("me", "student")}
        />
      )}

      {plan.students.map((s, i) => (
        <Seated
          key={s.key}
          spot={s.spot}
          pose={s.pose}
          look={crowdLook(i)}
          phase={i * 1.37}
          bubble={bubbleFor(s.key)}
          onTap={() => tap(s.key, s.role)}
        />
      ))}

      {plan.teachers.map((t: PatrolPerson, i) => (
        <Walker
          key={t.key}
          path={t.path}
          look={TEACHER_LOOK}
          phase={i * 2.1}
          idleFacing={t.idleFacing}
          lane={t.lane}
          bubble={bubbleFor(t.key)}
          onTap={() => tap(t.key, t.role)}
        />
      ))}

      {plan.wanderers.map((w: PatrolPerson, i) => (
        <Walker
          key={w.key}
          path={w.path}
          lane={w.lane}
          look={crowdLook(i + 11)}
          phase={i * 1.9 + 0.6}
          bubble={bubbleFor(w.key)}
          onTap={() => tap(w.key, w.role)}
        />
      ))}

      {plan.roomLoops.map((w: PatrolPerson, i) => (
        <Walker
          key={w.key}
          path={w.path}
          lane={w.lane}
          idleFacing={w.idleFacing}
          floorY={w.floorY}
          ball={w.ball}
          // Staff dress for the job; everybody else is a student.
          look={
            w.outfit === "cook"
              ? COOK_LOOK
              : w.outfit === "coach"
                ? COACH_LOOK
                : w.outfit === "staff"
                  ? STAFF_LOOK
                  : w.outfit === "caretaker"
                    ? CARETAKER_LOOK
                    : crowdLook(i + 37)
          }
          phase={i * 1.3 + 0.2}
          bubble={bubbleFor(w.key)}
          onTap={() => tap(w.key, w.role)}
        />
      ))}

      {plan.commuters.map((c, i) => (
        <Commuter
          key={c.key}
          seats={c.seats}
          path={c.path}
          look={crowdLook(i + 23)}
          phase={i * 2.7 + 1.3}
          bubble={bubbleFor(c.key)}
          onTap={() => tap(c.key, c.role)}
        />
      ))}
    </group>
  );
};
