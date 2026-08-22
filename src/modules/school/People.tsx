// modules/school/People.tsx
//
// Everyone in the school. Bodies are boxes on refs, driven every frame — see
// docs/room-game-concept.md §6 for how this becomes useAnimations + named glTF
// clips without touching the state machine above it.
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
import { PatrolPerson, PeoplePlan, SeatedPerson, Spot } from "./props";
import { BlobShadow } from "./Building";
import { BubblePool, pickLine, Speaker } from "./bubbles";

export interface PersonLook {
  skin: string;
  hair: string;
  shirt: string;
  trousers: string;
  hat?: string | null;
}

// Stable palettes for background students. Indexed, never random, so a student
// does not change shirt colour when the layout preset is swapped.
const SKINS = ["#f2c48d", "#e0a870", "#c98c5b", "#a9714a", "#8a5a3b", "#f7d7b5"];
const HAIRS = ["#3b2a1e", "#6b4423", "#2b2d2f", "#a83232", "#e8c873", "#5a5a5a"];
const SHIRTS = ["#4a7fd6", "#d64a4a", "#4a9d5c", "#c9a227", "#7b4fa3", "#3f9aa8", "#d97a4a"];
const TROUSERS = ["#3d4557", "#5a4636", "#454b3f", "#4a3f57"];

export const lookForIndex = (i: number): PersonLook => ({
  skin: SKINS[i % SKINS.length],
  hair: HAIRS[(i * 3 + 1) % HAIRS.length],
  shirt: SHIRTS[(i * 5 + 2) % SHIRTS.length],
  trousers: TROUSERS[(i * 7) % TROUSERS.length],
  hat: null,
});

const TEACHER_LOOK: PersonLook = {
  skin: "#e8b98a",
  hair: "#4a3b2f",
  shirt: "#5c6b8a",
  trousers: "#3a4152",
  hat: null,
};

// ── Body ────────────────────────────────────────────────────────────────────

interface BodyRefs {
  root: React.RefObject<THREE.Group | null>;
  torso: React.RefObject<THREE.Group | null>;
  head: React.RefObject<THREE.Group | null>;
  armL: React.RefObject<THREE.Group | null>;
  armR: React.RefObject<THREE.Group | null>;
  legL: React.RefObject<THREE.Group | null>;
  legR: React.RefObject<THREE.Group | null>;
}

function useBodyRefs(): BodyRefs {
  return {
    root: useRef<THREE.Group>(null),
    torso: useRef<THREE.Group>(null),
    head: useRef<THREE.Group>(null),
    armL: useRef<THREE.Group>(null),
    armR: useRef<THREE.Group>(null),
    legL: useRef<THREE.Group>(null),
    legR: useRef<THREE.Group>(null),
  };
}

const Limb = ({ len, w, color }: { len: number; w: number; color: string }) => (
  // Offset down by half its length so the group's origin is the joint — that is
  // what lets a rotation on the group read as a shoulder or a hip.
  <mesh position={[0, -len / 2, 0]}>
    <boxGeometry args={[w, len, w]} />
    <meshLambertMaterial color={color} />
  </mesh>
);

const HIP_Y = 0.42;
const SHOULDER_Y = 0.9;
const SIT_LIFT = 0.06;

const Body = ({ refs, look, sitting }: { refs: BodyRefs; look: PersonLook; sitting: boolean }) => (
  <group ref={refs.root}>
    <BlobShadow radius={0.3} />

    {sitting ? (
      // Seated: thighs forward along local +z, shins straight down. Not a rig,
      // just enough of one that a chair looks occupied rather than clipped.
      <>
        <mesh position={[-0.11, HIP_Y, 0.16]}>
          <boxGeometry args={[0.16, 0.15, 0.42]} />
          <meshLambertMaterial color={look.trousers} />
        </mesh>
        <mesh position={[0.11, HIP_Y, 0.16]}>
          <boxGeometry args={[0.16, 0.15, 0.42]} />
          <meshLambertMaterial color={look.trousers} />
        </mesh>
        <mesh position={[-0.11, HIP_Y / 2, 0.34]}>
          <boxGeometry args={[0.15, HIP_Y, 0.15]} />
          <meshLambertMaterial color={look.trousers} />
        </mesh>
        <mesh position={[0.11, HIP_Y / 2, 0.34]}>
          <boxGeometry args={[0.15, HIP_Y, 0.15]} />
          <meshLambertMaterial color={look.trousers} />
        </mesh>
      </>
    ) : (
      <>
        <group ref={refs.legL} position={[-0.11, HIP_Y, 0]}>
          <Limb len={HIP_Y} w={0.16} color={look.trousers} />
        </group>
        <group ref={refs.legR} position={[0.11, HIP_Y, 0]}>
          <Limb len={HIP_Y} w={0.16} color={look.trousers} />
        </group>
      </>
    )}

    <group ref={refs.torso} position={[0, HIP_Y + (sitting ? SIT_LIFT : 0), 0]}>
      <mesh position={[0, 0.26, 0]}>
        <boxGeometry args={[0.42, 0.52, 0.26]} />
        <meshLambertMaterial color={look.shirt} />
      </mesh>

      <group ref={refs.armL} position={[-0.27, SHOULDER_Y - HIP_Y, 0]}>
        <Limb len={0.4} w={0.12} color={look.shirt} />
        <mesh position={[0, -0.44, 0]}>
          <boxGeometry args={[0.12, 0.12, 0.12]} />
          <meshLambertMaterial color={look.skin} />
        </mesh>
      </group>
      <group ref={refs.armR} position={[0.27, SHOULDER_Y - HIP_Y, 0]}>
        <Limb len={0.4} w={0.12} color={look.shirt} />
        <mesh position={[0, -0.44, 0]}>
          <boxGeometry args={[0.12, 0.12, 0.12]} />
          <meshLambertMaterial color={look.skin} />
        </mesh>
      </group>

      <group ref={refs.head} position={[0, 0.56, 0]}>
        <mesh position={[0, 0.16, 0]}>
          <boxGeometry args={[0.3, 0.32, 0.3]} />
          <meshLambertMaterial color={look.skin} />
        </mesh>
        <mesh position={[0, 0.3, -0.02]}>
          <boxGeometry args={[0.33, 0.14, 0.33]} />
          <meshLambertMaterial color={look.hair} />
        </mesh>
        {/* Eyes on the +z face, so which way someone faces is legible even when
            the whole figure is twelve pixels tall. */}
        <mesh position={[-0.07, 0.18, 0.152]}>
          <boxGeometry args={[0.05, 0.05, 0.01]} />
          <meshBasicMaterial color="#2b2b2b" />
        </mesh>
        <mesh position={[0.07, 0.18, 0.152]}>
          <boxGeometry args={[0.05, 0.05, 0.01]} />
          <meshBasicMaterial color="#2b2b2b" />
        </mesh>
        {look.hat && (
          <mesh position={[0, 0.4, 0]}>
            <boxGeometry args={[0.36, 0.14, 0.36]} />
            <meshLambertMaterial color={look.hat} />
          </mesh>
        )}
      </group>
    </group>
  </group>
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
        whiteSpace: "nowrap",
        boxShadow: "0 2px 0 rgba(43,48,64,0.35)",
        transform: "translateY(-6px)",
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
} as const;

const Seated = ({
  spot,
  pose,
  look,
  phase,
  bubble,
  onTap,
  ring,
}: {
  spot: Spot;
  pose: SeatedPerson["pose"];
  look: PersonLook;
  phase: number;
  bubble: string | null;
  onTap: () => void;
  /** The player's own avatar gets a marker so they can find themselves. */
  ring?: boolean;
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
      {bubble && <Bubble text={bubble} />}
    </group>
  );
};

// ── Walker (teacher and wanderers) ──────────────────────────────────────────

const WALK_SPEED = 1.15;

const Walker = ({
  path,
  look,
  phase,
  bubble,
  onTap,
  facesClassWhenIdle,
}: {
  path: Spot[];
  look: PersonLook;
  phase: number;
  bubble: string | null;
  onTap: () => void;
  /** Teachers stop and turn to the room; wanderers just keep going. */
  facesClassWhenIdle?: boolean;
}) => {
  const refs = useBodyRefs();
  const hop = useHop();
  const group = useRef<THREE.Group>(null);
  // Start partway along the first leg, not at its head: two wanderers handed
  // the same loop would otherwise spawn inside one another and stay in step.
  const state = useRef({ i: 0, t: (phase * 0.37) % 1, pause: phase % 2 });

  useFrame(({ clock }, dt) => {
    if (!group.current || path.length < 2) return;
    const s = state.current;
    const from = path[s.i];
    const to = path[(s.i + 1) % path.length];
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const dist = Math.hypot(dx, dz) || 1;

    let walking = true;
    if (s.pause > 0) {
      s.pause -= dt;
      walking = false;
    } else {
      s.t += (dt * WALK_SPEED) / dist;
      if (s.t >= 1) {
        s.t = 0;
        s.i = (s.i + 1) % path.length;
        // Uneven pauses; an identical wait at every corner reads as a machine.
        s.pause = 0.9 + ((s.i * 7 + phase * 13) % 10) * 0.22;
      }
    }

    group.current.position.x = from.x + dx * s.t;
    group.current.position.z = from.z + dz * s.t;

    const heading = Math.atan2(dx, dz);
    // Face the class while stopped, the direction of travel while moving, and
    // ease between the two rather than snapping.
    const want = walking ? heading : facesClassWhenIdle ? Math.PI : heading;
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
  });

  return (
    <group ref={group} position={[path[0].x, 0, path[0].z]}>
      <Body refs={refs} look={look} sitting={false} />
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
}

export const People = ({ plan, pool, playerLook, interactive = true, mute = false }: PeopleProps) => {
  const [speaking, setSpeaking] = useState<{ key: string; text: string } | null>(null);
  const timer = useRef<number | null>(null);

  // Every actor that can hold a bubble, so the scheduler can pick one without
  // caring which kind it is.
  const cast = useMemo(() => {
    const entries: { key: string; speaker: Speaker }[] = [
      ...plan.students.map((s) => ({ key: s.key, speaker: "student" as Speaker })),
      ...plan.teachers.map((t) => ({ key: t.key, speaker: "teacher" as Speaker })),
      ...plan.wanderers.map((w) => ({ key: w.key, speaker: "student" as Speaker })),
      ...plan.commuters.map((c) => ({ key: c.key, speaker: "student" as Speaker })),
    ];
    if (plan.playerSeat) entries.push({ key: "me", speaker: "student" });
    return entries;
  }, [plan]);

  const say = useCallback(
    (key: string, speaker: Speaker) => {
      setSpeaking({ key, text: pickLine(speaker === "teacher" ? pool.teacher : pool.student) });
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
      say(pick.key, pick.speaker);
      timer.current = window.setTimeout(() => {
        if (cancelled) return;
        setSpeaking(null);
        timer.current = window.setTimeout(tick, 1400 + Math.random() * 2600);
      }, 2800);
    };

    timer.current = window.setTimeout(tick, 1200);
    return () => {
      cancelled = true;
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [cast, say]);

  const tap = useCallback(
    (key: string, speaker: Speaker) => {
      if (!interactive) return;
      // A poke jumps the queue: clear the pending hide so the bubble the player
      // asked for is not cut short by the scheduler's timer.
      if (timer.current) window.clearTimeout(timer.current);
      say(key, speaker);
      timer.current = window.setTimeout(() => setSpeaking(null), 2800);
    },
    [interactive, say],
  );

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
          bubble={bubbleFor("me")}
          onTap={() => tap("me", "student")}
        />
      )}

      {plan.students.map((s, i) => (
        <Seated
          key={s.key}
          spot={s.spot}
          pose={s.pose}
          look={lookForIndex(i)}
          phase={i * 1.37}
          bubble={bubbleFor(s.key)}
          onTap={() => tap(s.key, "student")}
        />
      ))}

      {plan.teachers.map((t: PatrolPerson, i) => (
        <Walker
          key={t.key}
          path={t.path}
          look={TEACHER_LOOK}
          phase={i * 2.1}
          facesClassWhenIdle
          bubble={bubbleFor(t.key)}
          onTap={() => tap(t.key, "teacher")}
        />
      ))}

      {plan.wanderers.map((w: PatrolPerson, i) => (
        <Walker
          key={w.key}
          path={w.path}
          look={lookForIndex(i + 11)}
          phase={i * 1.9 + 0.6}
          bubble={bubbleFor(w.key)}
          onTap={() => tap(w.key, "student")}
        />
      ))}

      {plan.commuters.map((c, i) => (
        <Commuter
          key={c.key}
          seats={c.seats}
          path={c.path}
          look={lookForIndex(i + 23)}
          phase={i * 2.7 + 1.3}
          bubble={bubbleFor(c.key)}
          onTap={() => tap(c.key, "student")}
        />
      ))}
    </group>
  );
};
