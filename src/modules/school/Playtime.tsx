// modules/school/Playtime.tsx
//
// The grounds in use, before and after school: a kickabout on the pitch — two
// small teams, a keeper in each goal, the ball passed about — and the
// playground busy with children on the swings, going down the slide, digging
// in the sandpit and chasing each other round.
//
// Where everybody is comes from playLayout.ts, as pure functions of the clock;
// this file only draws them there and moves their arms and legs. They are the
// school's own figures (modules/character), and they talk and hop when tapped
// like everybody indoors — People.tsx mounts this and hands it the bubbles.

import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Figure } from "../character/Figure";
import { BodyRefs, useBodyRefs } from "../character/bodyRefs";
import { CharacterLook, crowdLook } from "../character/look";
import { Bubble, HitBox } from "./personBits";
import { useHop } from "./hop";
import { Spot, walkerAt } from "./props";
import { GROUND_Y } from "./groundsLayout";
import { PersonRole } from "./bubbles";
import {
  BALL_R,
  Football,
  FootballFrame,
  PLAY_FLOOR,
  PlayCast,
  PlaygroundPlay,
  SLIDE,
  SWING_DROP,
  SWING_PIVOT_Y,
  TAG_SPEED,
  footballFrame,
  slideAt,
  swingAngle,
} from "./playLayout";

/** The pitch's painted surface. */
const PITCH_Y = GROUND_Y + 0.02;
/** A swing seat is an ordinary chair's height under whoever sits on it. */
const SWING_SEAT = 0.48;
/** Sitting on the chute: bottom on the plastic, knees only a little up. */
const SLIDE_SEAT = 0.07;

type Say = (key: string) => string | null;
type Tap = (key: string, role: PersonRole) => void;

// ── Looks ───────────────────────────────────────────────────────────────────

const TEAM_SHIRTS = ["#d64a4a", "#3f6fd6"];
const TEAM_SHORTS = ["#f1efe8", "#1f2a44"];

const footballerLook = (i: number, team: 0 | 1): CharacterLook => ({
  ...crowdLook(i * 3 + 50),
  top: "tee",
  topColor: TEAM_SHIRTS[team],
  bottom: "shorts",
  bottomColor: TEAM_SHORTS[team],
  glasses: "none",
  hat: "none",
});

/** Keepers in their own colours, as keepers are. */
const keeperLook = (end: -1 | 1): CharacterLook => ({
  ...crowdLook(end > 0 ? 71 : 74),
  top: "sweater",
  topColor: end > 0 ? "#e0b43d" : "#4a9d5c",
  bottom: "trousers",
  bottomColor: "#2b2d2f",
  glasses: "none",
  hat: "none",
});

const kidLook = (i: number): CharacterLook => ({ ...crowdLook(i * 5 + 90), hat: "none" });

// ── Moving limbs ────────────────────────────────────────────────────────────

/** The shortest turn from `from` to `to`, eased. */
function turn(from: number, to: number, k: number): number {
  let d = ((to - from + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return from + d * Math.min(1, k);
}

/** Running, harder the faster they go; a kick swings the right leg through. */
function run(refs: BodyRefs, t: number, speed: number, phase: number, kick = 0): number {
  const stride = Math.min(1, speed / 2.2);
  const swing = Math.sin(t * (5 + speed * 2.5) + phase) * (0.12 + 0.6 * stride);
  if (refs.legL.current) refs.legL.current.rotation.x = swing;
  if (refs.legR.current) refs.legR.current.rotation.x = -swing - kick * 1.1;
  if (refs.armL.current) {
    refs.armL.current.rotation.x = -swing * 0.8 - 0.3 * stride;
    refs.armL.current.rotation.z = -0.12;
  }
  if (refs.armR.current) {
    refs.armR.current.rotation.x = swing * 0.8 - 0.3 * stride;
    refs.armR.current.rotation.z = 0.12;
  }
  if (refs.torso.current) refs.torso.current.rotation.x = 0.12 * stride;
  // Bob on the stride; returned so a hop can be added to it.
  return Math.abs(Math.sin(t * (5 + speed * 2.5) + phase)) * 0.06 * stride;
}

// ── The kickabout ───────────────────────────────────────────────────────────

/** One frame of the game, worked out once per frame for everybody in it. */
function useGameFrame(game: Football): (t: number) => FootballFrame {
  const cache = useMemo(() => ({ t: Number.NaN, frame: null as FootballFrame | null }), []);
  return (t: number) => {
    if (cache.t !== t || !cache.frame) {
      cache.frame = footballFrame(game, t);
      cache.t = t;
    }
    return cache.frame;
  };
}

const Kicker = ({
  who,
  index,
  keeper,
  look,
  frameAt,
  say,
  tap,
}: {
  who: { key: string; role: PersonRole };
  index: number;
  keeper: boolean;
  look: CharacterLook;
  frameAt: (t: number) => FootballFrame;
  say: Say;
  tap: Tap;
}) => {
  const refs = useBodyRefs();
  const group = useRef<THREE.Group>(null);
  const hop = useHop();

  useFrame(({ clock }, dt) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    const f = frameAt(t);
    const r = keeper ? f.keepers[index] : f.players[index];
    g.position.set(r.x, PITCH_Y, r.z);
    g.rotation.y = turn(g.rotation.y, r.ry, dt * 8);
    const bob = run(refs, t, r.speed, index * 1.7, r.kick);
    if (keeper && r.speed < 0.3) {
      // Ready: knees in, arms out.
      if (refs.armL.current) refs.armL.current.rotation.z = -0.6;
      if (refs.armR.current) refs.armR.current.rotation.z = 0.6;
    }
    if (refs.root.current) refs.root.current.position.y = bob + hop.advance(dt);
  });

  const bubble = say(who.key);
  return (
    <group ref={group}>
      <Figure refs={refs} look={look} />
      <HitBox
        onTap={() => {
          hop.trigger();
          tap(who.key, who.role);
        }}
      />
      {bubble && <Bubble text={bubble} />}
    </group>
  );
};

const Ball = ({ frameAt }: { frameAt: (t: number) => FootballFrame }) => {
  const ball = useRef<THREE.Mesh>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const last = useRef<{ x: number; z: number } | null>(null);

  useFrame(({ clock }) => {
    const b = frameAt(clock.elapsedTime).ball;
    if (ball.current) {
      ball.current.position.set(b.x, PITCH_Y + b.y, b.z);
      // Rolled along the ground by however far it went.
      const prev = last.current;
      if (prev) {
        const dx = b.x - prev.x;
        const dz = b.z - prev.z;
        ball.current.rotation.x += dz / BALL_R;
        ball.current.rotation.z -= dx / BALL_R;
      }
      last.current = { x: b.x, z: b.z };
    }
    if (shadow.current) {
      shadow.current.position.set(b.x, PITCH_Y + 0.012, b.z);
      const s = 1 / (1 + (b.y - BALL_R) * 1.5);
      shadow.current.scale.set(s, s, 1);
    }
  });

  return (
    <group>
      <mesh ref={ball}>
        <icosahedronGeometry args={[BALL_R, 1]} />
        <meshLambertMaterial color="#f4f4f0" flatShading />
      </mesh>
      <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[BALL_R, 10]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.2} depthWrite={false} />
      </mesh>
    </group>
  );
};

const Kickabout = ({ game, say, tap }: { game: Football; say: Say; tap: Tap }) => {
  const frameAt = useGameFrame(game);
  return (
    <group>
      {game.players.map((p, i) => (
        <Kicker
          key={p.key}
          who={p}
          index={i}
          keeper={false}
          look={footballerLook(i, p.team)}
          frameAt={frameAt}
          say={say}
          tap={tap}
        />
      ))}
      {game.keepers.map((k, i) => (
        <Kicker
          key={k.key}
          who={k}
          index={i}
          keeper
          look={keeperLook(k.end)}
          frameAt={frameAt}
          say={say}
          tap={tap}
        />
      ))}
      <Ball frameAt={frameAt} />
    </group>
  );
};

// ── The playground ──────────────────────────────────────────────────────────

/** A child on a swing: the seat, its ropes and whoever is on it swing about
 *  the top bar together. They lean back on the way up, like everybody does. */
const Swinger = ({
  at,
  phase,
  look,
  who,
  say,
  tap,
}: {
  at: { x: number; z: number };
  phase: number;
  look: CharacterLook;
  who: { key: string; role: PersonRole };
  say: Say;
  tap: Tap;
}) => {
  const pivot = useRef<THREE.Group>(null);
  const refs = useBodyRefs();
  const hop = useHop();

  useFrame(({ clock }, dt) => {
    const a = swingAngle(clock.elapsedTime, phase);
    if (pivot.current) pivot.current.rotation.x = a;
    if (refs.torso.current) refs.torso.current.rotation.x = -a * 0.4;
    // Hands up on the ropes.
    if (refs.armL.current) refs.armL.current.rotation.x = -2.75;
    if (refs.armR.current) refs.armR.current.rotation.x = -2.75;
    if (refs.head.current) refs.head.current.rotation.x = a * 0.3;
    if (refs.root.current) refs.root.current.position.y = hop.advance(dt) * 0.4;
  });

  const bubble = say(who.key);
  return (
    <group position={[at.x, GROUND_Y + SWING_PIVOT_Y, at.z]}>
      <group ref={pivot}>
        {[-0.22, 0.22].map((x) => (
          <mesh key={x} position={[x, -SWING_DROP / 2, 0]}>
            <boxGeometry args={[0.02, SWING_DROP, 0.02]} />
            <meshLambertMaterial color="#5b6270" />
          </mesh>
        ))}
        <mesh position={[0, -SWING_DROP - 0.03, 0]}>
          <boxGeometry args={[0.5, 0.06, 0.25]} />
          <meshLambertMaterial color="#e0b43d" />
        </mesh>
        <group position={[0, -SWING_DROP - SWING_SEAT, 0]}>
          <Figure refs={refs} look={look} sitting seatTop={SWING_SEAT} shadow={false} />
          <HitBox
            onTap={() => {
              hop.trigger();
              tap(who.key, who.role);
            }}
          />
          {bubble && <Bubble text={bubble} />}
        </group>
      </group>
    </group>
  );
};

/** Down the slide, round the side, up the back, and down again. */
const Slider = ({
  origin,
  look,
  who,
  say,
  tap,
}: {
  origin: { x: number; z: number };
  look: CharacterLook;
  who: { key: string; role: PersonRole };
  say: Say;
  tap: Tap;
}) => {
  const group = useRef<THREE.Group>(null);
  const refs = useBodyRefs();
  const hop = useHop();
  // Sitting and standing are different geometry, so this one is state; it
  // flips twice a go, a few seconds apart.
  const [sitting, setSitting] = useState(false);
  const sat = useRef(false);

  useFrame(({ clock }, dt) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    const st = slideAt(t);
    const onChute = st.pose === "slide";
    if (onChute !== sat.current) {
      sat.current = onChute;
      setSitting(onChute);
    }
    if (onChute) {
      // Seated ON the chute: tilted with it, and backed off its surface by the
      // height the seated figure keeps under itself.
      g.position.set(
        st.x,
        st.y - Math.cos(SLIDE.angle) * SLIDE_SEAT,
        st.z - Math.sin(SLIDE.angle) * SLIDE_SEAT,
      );
      g.rotation.set(SLIDE.angle, 0, 0);
      // Arms up all the way down.
      if (refs.armL.current) refs.armL.current.rotation.x = -2.6;
      if (refs.armR.current) refs.armR.current.rotation.x = -2.6;
      return;
    }
    g.position.set(st.x, st.y + hop.advance(dt), st.z);
    g.rotation.set(0, turn(g.rotation.y, st.ry, dt * 8), 0);
    if (st.pose === "walk") {
      run(refs, t, 1.3, 0.7);
    } else if (st.pose === "climb") {
      // Hand over hand, a foot at a time.
      const c = Math.sin(st.k * Math.PI * 6);
      if (refs.armL.current) refs.armL.current.rotation.x = -2.4 + c * 0.45;
      if (refs.armR.current) refs.armR.current.rotation.x = -2.4 - c * 0.45;
      if (refs.legL.current) refs.legL.current.rotation.x = -0.5 * Math.max(0, c);
      if (refs.legR.current) refs.legR.current.rotation.x = -0.5 * Math.max(0, -c);
    } else {
      run(refs, t, 0, 0.7);
    }
  });

  const bubble = say(who.key);
  return (
    <group position={[origin.x, GROUND_Y, origin.z]}>
      <group ref={group}>
        <Figure refs={refs} look={look} sitting={sitting} seatTop={SLIDE_SEAT} shadow={!sitting} />
        <HitBox
          onTap={() => {
            hop.trigger();
            tap(who.key, who.role);
          }}
        />
        {bubble && <Bubble text={bubble} />}
      </group>
    </group>
  );
};

/** Tag: two children on one loop, the chaser a fixed distance behind — so
 *  they never quite catch each other, and never run into each other either. */
const Tagger = ({
  loop,
  lag,
  look,
  who,
  phase,
  say,
  tap,
}: {
  loop: Spot[];
  lag: number;
  look: CharacterLook;
  who: { key: string; role: PersonRole };
  phase: number;
  say: Say;
  tap: Tap;
}) => {
  const group = useRef<THREE.Group>(null);
  const refs = useBodyRefs();
  const hop = useHop();

  useFrame(({ clock }, dt) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    const step = walkerAt(loop, t - lag, TAG_SPEED, 0);
    g.position.set(step.x, GROUND_Y + PLAY_FLOOR, step.z);
    g.rotation.y = turn(g.rotation.y, step.heading, dt * 10);
    const bob = run(refs, t, TAG_SPEED, phase);
    if (refs.root.current) refs.root.current.position.y = bob + hop.advance(dt);
  });

  const bubble = say(who.key);
  return (
    <group ref={group}>
      <Figure refs={refs} look={look} />
      <HitBox
        onTap={() => {
          hop.trigger();
          tap(who.key, who.role);
        }}
      />
      {bubble && <Bubble text={bubble} />}
    </group>
  );
};

/** Bent over in the sandpit with a spade, a bucket beside them. */
const Digger = ({
  at,
  look,
  who,
  say,
  tap,
}: {
  at: { x: number; y: number; z: number };
  look: CharacterLook;
  who: { key: string; role: PersonRole };
  say: Say;
  tap: Tap;
}) => {
  const refs = useBodyRefs();
  const hop = useHop();

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    if (refs.torso.current) refs.torso.current.rotation.x = 0.5 + Math.sin(t * 1.3) * 0.05;
    if (refs.head.current) refs.head.current.rotation.x = 0.3;
    if (refs.armR.current) refs.armR.current.rotation.x = -1.05 + Math.sin(t * 4) * 0.45;
    if (refs.armL.current) refs.armL.current.rotation.x = -0.7;
    if (refs.root.current) refs.root.current.position.y = hop.advance(dt);
  });

  const bubble = say(who.key);
  return (
    <group position={[at.x, at.y, at.z]}>
      <Figure refs={refs} look={look} />
      <mesh position={[0.45, 0.1, 0.25]}>
        <cylinderGeometry args={[0.09, 0.07, 0.18, 8]} />
        <meshLambertMaterial color="#d64a4a" />
      </mesh>
      <HitBox
        onTap={() => {
          hop.trigger();
          tap(who.key, who.role);
        }}
      />
      {bubble && <Bubble text={bubble} />}
    </group>
  );
};

const PlaygroundKids = ({ pg, say, tap }: { pg: PlaygroundPlay; say: Say; tap: Tap }) => {
  const { swings, slide, sandpit } = pg.kit;
  // How far round the loop the chaser is behind: close enough to be a chase.
  const lap = useMemo(() => {
    if (!pg.tag) return 0;
    let d = 0;
    const L = pg.tag.loop;
    for (let i = 0; i < L.length; i++) {
      const a = L[i];
      const b = L[(i + 1) % L.length];
      d += Math.hypot(b.x - a.x, b.z - a.z);
    }
    return d / TAG_SPEED;
  }, [pg.tag]);

  return (
    <group>
      {pg.swingers.map((s, i) => (
        <Swinger
          key={s.key}
          at={{ x: swings.x + swings.seats[s.seat], z: swings.z }}
          phase={s.phase}
          look={kidLook(i)}
          who={s}
          say={say}
          tap={tap}
        />
      ))}
      {pg.slider && <Slider origin={slide} look={kidLook(3)} who={pg.slider} say={say} tap={tap} />}
      {pg.tag &&
        pg.tag.keys.map((key, i) => (
          <Tagger
            key={key}
            loop={pg.tag!.loop}
            // The chaser a third of a lap behind.
            lag={i === 0 ? 0 : lap * 0.33}
            look={kidLook(5 + i)}
            who={{ key, role: pg.tag!.role }}
            phase={i * 1.9}
            say={say}
            tap={tap}
          />
        ))}
      {pg.digger && (
        <Digger
          at={{ x: sandpit.x - 0.5, y: GROUND_Y + 0.27, z: sandpit.z }}
          look={kidLook(8)}
          who={pg.digger}
          say={say}
          tap={tap}
        />
      )}
    </group>
  );
};

// ── All of it ───────────────────────────────────────────────────────────────

export const Playtime = ({ play, say, tap }: { play: PlayCast; say: Say; tap: Tap }) => (
  <group>
    {play.pitch && <Kickabout game={play.pitch} say={say} tap={tap} />}
    {play.playground && <PlaygroundKids pg={play.playground} say={say} tap={tap} />}
  </group>
);
