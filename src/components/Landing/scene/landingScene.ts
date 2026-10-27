import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { createKit, damp, ease, clamp01, roundRect, INK, GREEN, RED, SANS, MONO } from './kit';
import { makeFigure, applyPose, pose, STAND, SIT, SEAT_TOP, HEAD_Y, FOREARM, UNIT, FIGURE_SCALE, type Figure, type Pose, type PersonLook, type Vec3 } from './figures';
import { applyDance, prepareDancer, keyBetween, keyOnCurve, REST, COUNT_PRINTS, type DanceKey } from './shuffle';
import { landingStore, landingActions, setSubs, setTilesStep } from '../landingStore';
import type { DifficultySlug } from '../../../types/storyGroups';

/**
 * The landing's 3D (option C of the landing guide): one WebGL canvas that
 * moves between the two pinned stages, one scene per chapter of the cards.
 *
 *   0  English where you meet it: a conversation, headphones, a lecture
 *   1  speed: a dancer learning a step at 0.65×, 0.8×, then 1.0×
 *   2  subtitles: a head whose visual area takes over when text appears
 *   3  spelling: AUTUMN read letter by letter, then as it sounds
 *   4  the comic page in eight panels, for «Найди сцену»
 *   5  the three milk glasses
 *   6  listen, repeat, hear yourself (the card right after the hero)
 *
 * The cards drive it through landingStore (and the scene writes back the
 * dancer's clock and its own automatic flips); taps here call the actions the
 * cards register, so this file never imports a card.
 */

export interface SceneCopy {
  /** The three hero places, under each stage. */
  scenes: string[];
  hear: string;
  see: string;
  eye: string;
  ear: string;
  ipa: string;
  silent: string;
  appNote: string;
  chip: string;
  /** The playback above the listener's head: the two voices' names. */
  narrator: string;
  you: string;
}

export interface SceneLeo {
  markers: number[];
  /** Which phrase the dancer counts to. */
  dancePhrase: number;
  comicUrl: string | null;
  panels: { x: number; y: number; w: number; h: number }[] | null;
}

export interface LandingSceneOptions {
  /** The pinned stage of each track, in page order. */
  stages: HTMLElement[];
  /** The tracks; `data-first` is each one's first chapter. */
  tracks: HTMLElement[];
  copy: SceneCopy;
  /** The ×3 ladder: SPEED_SEQUENCES[3]. */
  speeds: number[];
  /** The first frame is on screen. */
  onReady: () => void;
  /** WebGL would not start, or the context was lost: the page falls back to stills. */
  onFail: (reason: string) => void;
}

export interface LandingScene {
  /** Leo's part 1 arrived: the comic can be cut and the dancer timed to the real phrase. */
  setLeo: (leo: SceneLeo) => void;
  dispose: () => void;
}

const SHELF_FILL: Record<DifficultySlug, number> = { easy: 0.28, medium: 0.58, hard: 0.92 };

export function createLandingScene(opts: LandingSceneOptions): LandingScene | null {
  const { copy } = opts;
  const canvas = document.createElement('canvas');
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    opts.onFail('webgl');
    return null;
  }
  if (!renderer.getContext()) {
    opts.onFail('no context');
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envTarget = pmrem.fromScene(room, 0.04);
  scene.environment = envTarget.texture;
  room.dispose();
  pmrem.dispose();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 1, 10);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xc8d3dc, 0.55));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
  keyLight.position.set(3, 6, 6);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xdfeef5, 0.5);
  fillLight.position.set(-5, 2, 3);
  scene.add(fillLight);

  const C_GREEN = new THREE.Color(GREEN);
  const C_RED = new THREE.Color(RED);
  const C_IDLE = new THREE.Color(0xd9e1e8);

  const kit = createKit();
  const { clay, inkMat, outline, fatLine, canvasTex, label, shadow, own, setOpacity } = kit;

  // Everybody's one material (figures.ts): colour from the vertices, softly lit like the rest of the scene.
  const figMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0, envMapIntensity: 0.55 });
  const look = (l: PersonLook) => l;

  /* ════ 1 · the dancer ═══════════════════════════════════════════════ */
  const gDance = new THREE.Group();
  scene.add(gDance);
  const dancer = makeFigure(look({ skin: '#d9a77c', hair: 'short', hairColor: '#2b1d14', top: 'tee', topColor: '#2f6f5e', bottom: 'trousers', bottomColor: '#262b33', shoeColor: '#f4f4f2', soleColor: '#dcdcd8' }), figMat);
  prepareDancer(dancer);
  // Turned towards profile: knee lifts and kicks read sideways instead of straight at the lens.
  dancer.root.rotation.y = 0.6;
  gDance.add(dancer.root);
  {
    const floor = new THREE.Mesh(new THREE.CircleGeometry(1.25, 72), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, envMapIntensity: 0.6 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.002;
    gDance.add(floor);
    const rim = fatLine(new THREE.EllipseCurve(0, 0, 1.25, 1.25).getPoints(96), INK, 2, 0, true);
    rim.rotation.x = -Math.PI / 2;
    gDance.add(rim);
  }
  const dShadow = shadow(0.9, 0.6);
  dShadow.position.y = 0.002;
  dancer.root.add(dShadow);
  // Footprints: where the foot that lands on each count stands, turned the way it points.
  const footTex = (on: boolean) =>
    canvasTex(128, 256, (c, w, h) => {
      c.fillStyle = on ? '#0f151c' : '#c8d3dc';
      c.beginPath();
      c.ellipse(w / 2, h * 0.36, w * 0.3, h * 0.26, 0, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.ellipse(w / 2, h * 0.8, w * 0.22, h * 0.14, 0, 0, Math.PI * 2);
      c.fill();
    });
  const FOOT = [footTex(false), footTex(true)];
  const prints: { m: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>; n: THREE.Sprite; nOn: THREE.Sprite }[] = [];
  COUNT_PRINTS.forEach((f, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.22), new THREE.MeshBasicMaterial({ map: FOOT[0], transparent: true, depthWrite: false, toneMapped: false }));
    m.rotation.order = 'YXZ';
    m.rotation.set(-Math.PI / 2, f.yaw, 0);
    m.position.set(f.x, 0.004, f.z + 0.02);
    dancer.root.add(m);
    // The counts stand in a row in front of the dancer, like a metronome: shuffle footwork is
    // too compact for a number beside every print.
    const n = label(String(k + 1), { h: 0.14, mono: true, font: 500, fg: '#5b6b7a' });
    n.position.set((k - 1.5) * 0.3, 0.06, 0.95);
    gDance.add(n);
    const nOn = label(String(k + 1), { h: 0.14, mono: true, font: 500, fg: '#ffffff', bg: '#0f151c', border: '#0f151c' });
    nOn.position.copy(n.position);
    nOn.visible = false;
    gDance.add(nOn);
    prints.push({ m, n, nOn });
  });
  applyDance(dancer, REST);
  // The ladder clock: one pass = the phrase at that rate, four counts of two half-counts each.
  const RATES = opts.speeds;
  const HALVES = 8;
  const GAP = 0.38;
  const END_GAP = 0.6;
  let phraseLen = 1.9;
  const passDur = (r: number) => phraseLen / r;
  const cycle = () => RATES.reduce((s, r) => s + passDur(r) + GAP, 0) - GAP + END_GAP;
  /** `beat` is the count (0-3, -1 between passes); `j` the half-count within the pass, `u` how far into it. */
  interface Clock { pass: number; rate: number; beat: number; j: number; u: number }
  const halfOf = (pass: number, rate: number, e: number): Clock => {
    const h = passDur(rate) / HALVES;
    const j = Math.min(HALVES - 1, Math.floor(e / h));
    // Slow passes hold each position (every move visible); the full-speed pass never stops.
    const hold = rate < 0.7 ? 0.45 : rate < 0.9 ? 0.2 : 0;
    return { pass, rate, beat: Math.floor(j / 2), j, u: clamp01((e - j * h) / (h * (1 - hold))) };
  };
  const between = (pass: number, rate: number): Clock => ({ pass, rate, beat: -1, j: 0, u: 0 });
  const ladderAt = (time: number): Clock => {
    const al = landingStore.get().ladder;
    if (al.on) {
      const pass = Math.min(al.pass, RATES.length - 1);
      const r = RATES[pass];
      if (al.gap) return between(pass, r);
      const e = (performance.now() - al.start) / 1000;
      return halfOf(pass, r, Math.min(e, passDur(r) - 0.001));
    }
    let x = time % cycle();
    for (let i = 0; i < RATES.length; i++) {
      const d = passDur(RATES[i]);
      if (x < d) return halfOf(i, RATES[i], x);
      x -= d;
      const gap = i < RATES.length - 1 ? GAP : END_GAP;
      if (x < gap) return between(i, RATES[i]);
      x -= gap;
    }
    return between(RATES.length - 1, 1);
  };
  const easeSine = (u: number) => 0.5 - 0.5 * Math.cos(Math.PI * u);
  /** Dev only: hold the dancer at one rate / half-count / progress, for the scripted checks. */
  let pinned: { rate: number; j: number; u: number } | null = null;
  const danceAt = (time: number): { key: DanceKey; L: Clock } => {
    const L = pinned ? { pass: RATES.indexOf(pinned.rate), rate: pinned.rate, beat: Math.floor(pinned.j / 2), j: pinned.j, u: pinned.u } : ladderAt(time);
    if (L.beat < 0) return { key: REST, L };
    // 1.0×: one continuous movement through every half-count, like the real thing.
    if (L.rate >= 0.99) return { key: keyOnCurve(L.j, L.u), L };
    // 0.8×: linked, each position still lands; 0.65×: every position held.
    return { key: keyBetween(L.j, L.rate >= 0.79 ? easeSine(L.u) : ease(L.u)), L };
  };

  /* ════ 0 · English where you meet it ════════════════════════════════ */
  const gPeople = new THREE.Group();
  scene.add(gPeople);
  // A speech bubble whose tail points down at the speaker: tail on the left
  // (the bubble grows to the right) or on the right (it grows to the left).
  const bubble = (text: string, x: number, y: number, right = false) => {
    const fs = 60;
    const meas = document.createElement('canvas').getContext('2d');
    if (meas) meas.font = `700 ${fs}px ${SANS}`;
    const W = Math.ceil(meas ? meas.measureText(text).width : text.length * 32) + 80;
    const H = 150;
    const t = canvasTex(W, H, (c, w, h) => {
      roundRect(c, 4, 4, w - 8, h - 40, 30);
      c.fillStyle = '#ffffff';
      c.fill();
      c.lineWidth = 6;
      c.strokeStyle = '#0f151c';
      c.stroke();
      const x0 = right ? w - 84 : 46;
      const x1 = right ? w - 40 : 40;
      const x2 = right ? w - 46 : 84;
      c.beginPath();
      c.moveTo(x0, h - 39);
      c.lineTo(x1, h - 6);
      c.lineTo(x2, h - 39);
      c.closePath();
      c.fillStyle = '#ffffff';
      c.fill();
      c.beginPath();
      c.moveTo(x0, h - 37);
      c.lineTo(x1, h - 6);
      c.lineTo(x2, h - 37);
      c.stroke();
      c.fillStyle = '#0f151c';
      c.font = `700 ${fs}px ${SANS}`;
      c.textBaseline = 'middle';
      c.fillText(text, 40, (h - 36) / 2 + 4);
    });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false, opacity: 0 }));
    const bh = 0.27;
    sp.scale.set((bh * W) / H, bh, 1);
    sp.center.set(right ? 0.94 : 0.06, 0);
    sp.position.set(x, y, 0.2);
    sp.renderOrder = 20;
    return sp;
  };
  const stageFloor = (group: THREE.Group, name = '') => {
    const floor = new THREE.Mesh(new THREE.CircleGeometry(1.3, 72), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, envMapIntensity: 0.6 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.002;
    group.add(floor);
    const rim = fatLine(new THREE.EllipseCurve(0, 0, 1.3, 1.3).getPoints(96), INK, 2, 0, true);
    rim.rotation.x = -Math.PI / 2;
    group.add(rim);
    // Below the rim's front edge, so the name never sits on the line.
    if (!name) return;
    const l = label(name, { h: 0.19, fg: '#0f151c' });
    l.position.set(0, -0.2, 1.42);
    group.add(l);
  };
  // The listener: on the hero's «В наушниках» stage and again in the listen-and-repeat card.
  const LISTENER: PersonLook = { skin: '#8d5a3c', hair: 'curly', hairColor: '#17130f', top: 'hoodie', topColor: '#6f7a4e', bottom: 'trousers', bottomColor: '#3c4a63', shoeColor: '#f2f2ef', soleColor: '#d9d9d4' };
  /** Over-ear headphones: a band over the hair, a cushioned cup on each ear. */
  const giveHeadphones = (d: Figure) => {
    const hp = new THREE.Group();
    hp.position.y = HEAD_Y;
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.128, 0.011, 8, 32, Math.PI), inkMat);
    band.position.y = 0.004;
    hp.add(band);
    for (const s of [-1, 1]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.034, 20), inkMat);
      c.rotation.z = Math.PI / 2;
      c.position.set(0.112 * s, -0.004, 0);
      hp.add(c);
    }
    d.P.neck.add(hp);
    return hp;
  };
  /** A phone in the right hand. */
  const givePhone = (d: Figure) => {
    const phone = new THREE.Mesh(new RoundedBoxGeometry(0.072, 0.148, 0.01, 2, 0.004), inkMat);
    phone.position.set(0, -FOREARM - 0.02, 0.05);
    phone.rotation.x = -0.4;
    d.P.elR.add(phone);
    return phone;
  };
  const person = (group: THREE.Group, x: number, z: number, ry: number, p: Pose, who: PersonLook): Figure => {
    const d = makeFigure(who, figMat);
    d.root.position.set(x, 0, z);
    d.root.rotation.y = ry;
    applyPose(d.P, p);
    group.add(d.root);
    const sh = shadow(0.7, 0.45);
    sh.position.set(x, 0.003, z);
    group.add(sh);
    return d;
  };
  interface Bubble { sprite: THREE.Sprite; want: number }
  interface Vignette { g: THREE.Group; bubbles: Bubble[]; rings: Line2[]; update: (t: number, local: number) => void }
  const VIGN: Vignette[] = [];
  const mkBubble = (sprite: THREE.Sprite): Bubble => ({ sprite, want: 0 });
  {
    // a conversation
    const g = new THREE.Group();
    stageFloor(g, copy.scenes[0] ?? '');
    const a = person(g, -0.5, 0.05, 0.75, STAND, look({ skin: '#b98260', hair: 'short', hairColor: '#1e1a17', beard: true, top: 'jacket', topColor: '#2f3e57', innerColor: '#eef1f3', bottom: 'trousers', bottomColor: '#6b6f75', shoeColor: '#5a3d2b' }));
    const b = person(g, 0.5, 0.05, -0.75, STAND, look({ skin: '#dfa985', hair: 'long', hairColor: '#4a2e1f', glasses: true, top: 'sweater', topColor: '#c2754f', bottom: 'trousers', bottomColor: '#2d3340', shoeColor: '#1f2125' }));
    const ba = mkBubble(bubble('So, what do you do?', -0.62, 1.98));
    const bb = mkBubble(bubble("I'm a designer, actually.", 0.62, 1.98, true));
    g.add(ba.sprite, bb.sprite);
    VIGN.push({
      g,
      bubbles: [ba, bb],
      rings: [],
      update(t, local) {
        const turn = Math.floor(local / 1.9) % 2;
        const into = local % 1.9;
        [a, b].forEach((d, i) => {
          const talk = i === turn;
          const w = Math.sin(t * 6 + i);
          // The speaker gestures with the outer arm (a's left, b's right), so the
          // hand stays in front of their own body instead of reaching into the listener.
          const armX = -0.45 - 0.15 * w;
          const armEl = -1.25 - 0.2 * w;
          const speaking: Partial<Pose> = { nk: [0.04 * Math.sin(t * 5), 0.1 * Math.sin(t * 1.7), 0], sp: [0.03, 0.05 * w, 0] };
          const gesture: Partial<Pose> = i === 0 ? { shL: [armX, 0, -0.35], elL: armEl } : { shR: [armX, 0, 0.35], elR: armEl };
          const listening: Partial<Pose> = { nk: [0.1 * Math.max(0, Math.sin(t * 3.2)), 0, i === 0 ? -0.06 : 0.06], elL: -0.3, elR: -0.3 };
          applyPose(d.P, pose(talk ? { ...speaking, ...gesture } : listening));
        });
        // One line at a time: both bubbles sit over the pair, so the reply waits until the last line has gone.
        const on = into > 0.3 && into < 1.6;
        ba.want = turn === 0 && on && bb.sprite.material.opacity < 0.05 ? 1 : 0;
        bb.want = turn === 1 && on && ba.sprite.material.opacity < 0.05 ? 1 : 0;
      },
    });
  }
  {
    // headphones
    const g = new THREE.Group();
    stageFloor(g, copy.scenes[1] ?? '');
    const d = person(g, 0, 0.1, 0.3, STAND, look(LISTENER));
    const hp = giveHeadphones(d);
    givePhone(d);
    const rings = [0, 1, 2].map(() => {
      const r = fatLine(new THREE.EllipseCurve(0, 0, 1, 1).getPoints(48), GREEN, 2, 0, true);
      g.add(r);
      return r;
    });
    const hw = new THREE.Vector3();
    VIGN.push({
      g,
      bubbles: [],
      rings,
      update(t) {
        const beat = Math.sin(t * Math.PI * 2 * 1.9);
        applyPose(d.P, pose({
          nk: [0.11 * beat, 0.08 * Math.sin(t * 0.9), 0], hy: -0.015 * Math.abs(beat), hrz: 0.025 * Math.sin(t * Math.PI * 1.9),
          shR: [-0.95, 0, -0.05], elR: -1.15, shL: [0.05, 0, -0.12 - 0.05 * beat], knL: 0.05 + 0.06 * Math.max(0, beat), anL: -0.05 * Math.max(0, beat),
        }));
        hp.getWorldPosition(hw);
        g.worldToLocal(hw);
        rings.forEach((r, k) => {
          const ph = (t * 0.8 + k / 3) % 1;
          r.position.set(hw.x, hw.y, hw.z + 0.05);
          r.scale.setScalar(0.18 + ph * 0.45);
          r.material.opacity = Math.sin(ph * Math.PI) * 0.8;
        });
      },
    });
  }
  {
    // a lecture
    const g = new THREE.Group();
    stageFloor(g, copy.scenes[2] ?? '');
    const boardTex = canvasTex(900, 540, (c, w, h) => {
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#5b6b7a';
      c.font = `500 34px ${MONO}`;
      c.fillText('LECTURE 3', 50, 80);
      c.fillStyle = '#0f151c';
      c.font = `800 70px ${SANS}`;
      c.fillText('Present Simple', 50, 175);
      c.font = `600 46px ${SANS}`;
      c.fillText('I live  →  he lives', 50, 280);
      c.fillText('I work  →  she works', 50, 350);
      c.strokeStyle = '#e5484d';
      c.lineWidth = 6;
      c.beginPath();
      c.moveTo(325, 292);
      c.lineTo(372, 292);
      c.stroke();
      c.beginPath();
      c.moveTo(376, 362);
      c.lineTo(420, 362);
      c.stroke();
    });
    const board = new THREE.Group();
    board.position.set(0.45, 0, -0.55);
    board.rotation.y = -0.15;
    g.add(board);
    const panel = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.9, 0.05, 3, 0.02), clay);
    panel.position.y = 1.86;
    board.add(panel);
    outline(panel, 0.012);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.42, 0.82), new THREE.MeshBasicMaterial({ map: boardTex, toneMapped: false }));
    face.position.set(0, 1.86, 0.027);
    board.add(face);
    for (const x of [-0.6, 0.6]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.42, 8), inkMat);
      leg.position.set(x, 0.71, -0.02);
      board.add(leg);
    }
    const lect = person(g, -0.72, -0.15, 0.55, STAND, look({ skin: '#e3b48f', hair: 'receding', hairColor: '#a7a39c', beard: true, glasses: true, top: 'jacket', topColor: '#6e5a45', innerColor: '#cfe0ee', bottom: 'trousers', bottomColor: '#3a3d42', shoeColor: '#3b2a20' }));
    // A seated person's thighs rest on the stool (figures.ts SEAT_TOP).
    const seatTop = SEAT_TOP * FIGURE_SCALE;
    const pupils: [number, number, PersonLook][] = [
      [-0.12, 0.72, look({ skin: '#f3d2b8', hair: 'bun', hairColor: '#c99a5b', top: 'sweater', topColor: '#4f7a6a', bottom: 'trousers', bottomColor: '#2d3340', shoeColor: '#e9e6df' })],
      [0.78, 0.62, look({ skin: '#a8714e', hair: 'side', hairColor: '#24180f', top: 'shirt', topColor: '#d8b25a', innerColor: '#d8b25a', bottom: 'trousers', bottomColor: '#3e4655', shoeColor: '#2a2420' })],
    ];
    const studs = pupils.map(([x, z, who]) => {
      const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, seatTop, 18), clay);
      stool.position.set(x, seatTop / 2, z + 0.02);
      g.add(stool);
      outline(stool, 0.012);
      return person(g, x, z, Math.PI - 0.15, SIT, who);
    });
    const say = mkBubble(bubble("Let's start with the basics.", -0.95, 2.02));
    g.add(say.sprite);
    VIGN.push({
      g,
      bubbles: [say],
      rings: [],
      update(t) {
        const w = Math.sin(t * 2.2);
        applyPose(lect.P, pose({ shR: [-0.45, 0, 1.7 + 0.1 * w], elR: -0.2, nk: [0, -0.35 + 0.35 * Math.max(0, Math.sin(t * 0.9)), 0], sp: [0, 0.1, 0], shL: [-0.5, 0, -0.2], elL: -0.9 }));
        studs.forEach((s, i) => applyPose(s.P, { ...SIT, nk: [0.06 * Math.sin(t * 1.3 + i), 0.08 * Math.sin(t * 0.7 + i * 2), 0] }));
        say.want = 1;
      },
    });
  }
  const carousel = new THREE.Group();
  gPeople.add(carousel);
  const RING = 3.1;
  VIGN.forEach((v, i) => {
    const a = (i * 2 * Math.PI) / 3;
    v.g.position.set(Math.sin(a) * RING, 0, Math.cos(a) * RING);
    v.g.rotation.y = a;
    carousel.add(v.g);
  });
  carousel.position.z = -RING;
  const HOLD = 3.8;
  const MOVE = 1.1;
  const SLOT = HOLD + MOVE;

  /* ════ 6 · listen, repeat, hear yourself ═══════════════════════════ */
  // The listen-and-repeat card, in three beats on one clock (RP_CYCLE, the card's three steps
  // follow it through landingStore.repeatUI): the listener from «В наушниках» listens, raises the
  // phone and says the phrase into it, then hears both voices played back above their head —
  // the narrator's, then their own, as in «Послушай себя» — and smiles. Nothing written: no words
  // in the bubbles, only the shape of the sound.
  const gRepeat = new THREE.Group();
  scene.add(gRepeat);
  stageFloor(gRepeat);
  const rpFig = makeFigure(look(LISTENER), figMat);
  rpFig.root.rotation.y = 0.25;
  gRepeat.add(rpFig.root);
  {
    const sh = shadow(0.7, 0.45);
    sh.position.y = 0.003;
    gRepeat.add(sh);
  }
  const rpHp = giveHeadphones(rpFig);
  givePhone(rpFig);
  const RP_CYCLE = 11;
  const GREEN_CSS = '#00c951';
  // 1 · listening: rings from the headphones
  const rpRings = [0, 1, 2].map(() => {
    const r = fatLine(new THREE.EllipseCurve(0, 0, 1, 1).getPoints(48), GREEN, 2, 0, true);
    gRepeat.add(r);
    return r;
  });
  // 2 · saying it: a bubble from the mouth with the sound of their voice, green, and rings at the phone
  const bars = (c: CanvasRenderingContext2D, x0: number, mid: number, hs: number[], step: number, width: number, color: string) => {
    c.strokeStyle = color;
    c.lineWidth = width;
    c.lineCap = 'round';
    hs.forEach((h, i) => {
      c.beginPath();
      c.moveTo(x0 + i * step, mid - h / 2);
      c.lineTo(x0 + i * step, mid + h / 2);
      c.stroke();
    });
  };
  const VOICE = [10, 26, 44, 22, 58, 34, 50, 16, 38, 54, 28, 12, 44, 32, 58, 20, 36, 14];
  const sayTex = canvasTex(560, 190, (c, w, h) => {
    roundRect(c, 4, 4, w - 8, h - 44, 34);
    c.fillStyle = '#ffffff';
    c.fill();
    c.lineWidth = 6;
    c.strokeStyle = GREEN_CSS;
    c.stroke();
    c.beginPath();
    c.moveTo(46, h - 43);
    c.lineTo(36, h - 6);
    c.lineTo(88, h - 43);
    c.closePath();
    c.fillStyle = '#ffffff';
    c.fill();
    c.beginPath();
    c.moveTo(46, h - 41);
    c.lineTo(36, h - 6);
    c.lineTo(88, h - 41);
    c.stroke();
    bars(c, 60, (h - 40) / 2 + 2, VOICE, 25, 11, GREEN_CSS);
  });
  const rpSay = new THREE.Sprite(new THREE.SpriteMaterial({ map: sayTex, transparent: true, depthWrite: false, toneMapped: false, opacity: 0 }));
  rpSay.scale.set(0.56 * (560 / 190) * 0.62, 0.56 * 0.62, 1);
  rpSay.center.set(0.04, 0);
  rpSay.position.set(0.12, 1.66, 0.25);
  rpSay.renderOrder = 20;
  gRepeat.add(rpSay);
  const rpRec = [0, 1].map(() => {
    const r = fatLine(new THREE.EllipseCurve(0, 0, 1, 1).getPoints(40), GREEN, 2, 0, true);
    gRepeat.add(r);
    return r;
  });
  // 3 · hearing yourself: the two voices above the head, the narrator's and yours, a playhead
  // crossing them, a few lines of joy around the head, and a smile
  const NARRATOR = [14, 30, 48, 26, 62, 38, 54, 18, 42, 58, 30, 14, 48, 36, 62, 24, 40, 16, 28, 44, 20, 12, 30, 18];
  const YOURS = [12, 26, 44, 30, 56, 34, 48, 16, 40, 52, 28, 12, 42, 34, 56, 22, 38, 14, 24, 40, 18, 10];
  const PW = 1.5;
  const PH = 0.62;
  const replayTex = canvasTex(900, 372, (c, w, h) => {
    roundRect(c, 0, 0, w, h, 36);
    c.fillStyle = '#0f151c';
    c.fill();
    c.font = `500 30px ${MONO}`;
    c.fillStyle = '#9aa8b5';
    c.fillText(copy.narrator.toUpperCase(), 44, 82);
    c.fillStyle = GREEN_CSS;
    c.fillText(copy.you.toUpperCase(), 44, 250);
    bars(c, 250, 112, NARRATOR, 26, 11, '#eef4f8');
    bars(c, 250, 280, YOURS, 26, 11, GREEN_CSS);
  });
  const rpReplay = new THREE.Group();
  rpReplay.position.set(0, 2.42, 0);
  gRepeat.add(rpReplay);
  const rpPanel = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.MeshBasicMaterial({ map: replayTex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  rpPanel.renderOrder = 21;
  rpReplay.add(rpPanel);
  const rpHead = new THREE.Mesh(new THREE.PlaneGeometry(0.012, PH * 0.78), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  rpHead.position.z = 0.002;
  rpHead.renderOrder = 22;
  rpReplay.add(rpHead);
  const rpJoy = [
    [-0.24, 1.86, -0.31, 1.95],
    [-0.19, 1.95, -0.22, 2.05],
    [0.24, 1.86, 0.31, 1.95],
    [0.19, 1.95, 0.22, 2.05],
  ].map(([x0, y0, x1, y1]) => {
    const l = fatLine([{ x: x0, y: y0 }, { x: x1, y: y1 }], GREEN, 3, 0.05);
    gRepeat.add(l);
    return l;
  });
  const rpSmile = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.0042, 6, 18, Math.PI), new THREE.MeshBasicMaterial({ color: 0x6b3a26, transparent: true, opacity: 0, toneMapped: false }));
  rpSmile.rotation.z = Math.PI;
  rpSmile.position.set(0, HEAD_Y - 0.052, 0.101);
  rpFig.P.neck.add(rpSmile);
  own(rpSay.material, rpPanel.material, rpHead.material, rpSmile.material);
  rpRings.forEach((r) => own(r.material));
  rpRec.forEach((r) => own(r.material));
  rpJoy.forEach((l) => own(l.material));
  /** How much of each beat is showing, eased: listening, saying, hearing yourself. */
  const rpW = [1, 0, 0];
  let rpPinned: number | null = null;
  let rpStepSeen = -1;
  const rpWorld = new THREE.Vector3();
  const mixV = (a: Vec3, b: Vec3, u: number): Vec3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];

  /* ════ 2 · the head: ears vs eyes ═══════════════════════════════════ */
  const gHead = new THREE.Group();
  scene.add(gHead);
  const HEAD_D = 0.36;
  const FRONT = HEAD_D / 2 + 0.04;
  const headShape = new THREE.Shape();
  headShape.moveTo(-0.55, -1.45);
  headShape.lineTo(-0.55, -0.85);
  headShape.bezierCurveTo(-0.55, -0.62, -0.88, -0.45, -0.94, -0.1);
  headShape.bezierCurveTo(-1.04, 0.45, -0.75, 1.07, -0.1, 1.13);
  headShape.bezierCurveTo(0.45, 1.18, 0.83, 0.86, 0.87, 0.45);
  headShape.bezierCurveTo(0.89, 0.32, 0.9, 0.25, 0.94, 0.17);
  headShape.quadraticCurveTo(0.9, 0.1, 0.93, 0.04);
  headShape.bezierCurveTo(1.0, -0.08, 1.1, -0.2, 1.12, -0.28);
  headShape.quadraticCurveTo(1.09, -0.36, 0.98, -0.36);
  headShape.quadraticCurveTo(1.01, -0.42, 1.01, -0.47);
  headShape.quadraticCurveTo(0.97, -0.5, 1.0, -0.54);
  headShape.quadraticCurveTo(1.0, -0.6, 0.95, -0.64);
  headShape.bezierCurveTo(0.98, -0.72, 0.96, -0.84, 0.84, -0.88);
  headShape.bezierCurveTo(0.7, -0.92, 0.45, -0.88, 0.35, -0.95);
  headShape.lineTo(0.32, -1.45);
  headShape.lineTo(-0.55, -1.45);
  const headGeo = new THREE.ExtrudeGeometry(headShape, { depth: HEAD_D, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 4, curveSegments: 24 });
  headGeo.translate(0, 0, -HEAD_D / 2);
  gHead.add(new THREE.Mesh(headGeo, clay));
  gHead.add(fatLine(headShape.getPoints(24), INK, 2.4, FRONT + 0.004));
  const brainShape = new THREE.Shape();
  brainShape.moveTo(-0.78, 0.25);
  brainShape.bezierCurveTo(-0.82, 0.64, -0.45, 0.96, -0.05, 0.96);
  brainShape.bezierCurveTo(0.36, 0.96, 0.67, 0.72, 0.65, 0.38);
  brainShape.bezierCurveTo(0.64, 0.15, 0.46, 0.05, 0.3, 0.05);
  brainShape.bezierCurveTo(0.2, -0.13, -0.12, -0.19, -0.29, -0.05);
  brainShape.bezierCurveTo(-0.46, -0.02, -0.73, -0.05, -0.78, 0.25);
  const brainMesh = new THREE.Mesh(new THREE.ShapeGeometry(brainShape, 32), new THREE.MeshStandardMaterial({ color: 0xf1f4f7, roughness: 0.8 }));
  brainMesh.position.z = FRONT + 0.006;
  gHead.add(brainMesh);
  gHead.add(fatLine(brainShape.getPoints(32), INK, 1.8, FRONT + 0.012));
  // a few folds, so it reads as a brain
  const FOLDS = [
    [[-0.6, 0.55], [-0.4, 0.7], [-0.2, 0.6], [0.0, 0.78]],
    [[-0.1, 0.35], [0.1, 0.5], [0.3, 0.42], [0.5, 0.6]],
    [[-0.55, 0.2], [-0.35, 0.35], [-0.2, 0.25]],
    [[0.15, 0.82], [0.3, 0.68], [0.5, 0.75]],
  ];
  FOLDS.forEach((arr) => {
    const curve = new THREE.CatmullRomCurve3(arr.map(([x, y]) => new THREE.Vector3(x, y, 0)));
    gHead.add(fatLine(curve.getPoints(24), 0xb8c4cf, 1.4, FRONT + 0.011));
  });
  const region = (cx: number, cy: number, rx: number, ry: number, rot: number) => {
    const s = new THREE.Shape();
    s.absellipse(0, 0, rx, ry, 0, Math.PI * 2, false, 0);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(s, 32), new THREE.MeshStandardMaterial({ color: C_IDLE.clone(), roughness: 0.5, emissive: 0x000000 }));
    m.position.set(cx, cy, FRONT + 0.016);
    m.rotation.z = rot;
    gHead.add(m);
    const l = fatLine(s.getPoints(48), INK, 1.4, 0.002);
    l.position.copy(m.position);
    l.rotation.z = rot;
    gHead.add(l);
    return m;
  };
  const AUD = { x: -0.04, y: 0.12 };
  const VIS = { x: -0.6, y: 0.33 };
  const audR = region(AUD.x, AUD.y, 0.27, 0.1, 0.12);
  const visR = region(VIS.x, VIS.y, 0.15, 0.22, -0.2);
  const EAR = { x: -0.14, y: -0.22 };
  {
    const ear = new THREE.Shape();
    ear.moveTo(0.04, 0.16);
    ear.bezierCurveTo(-0.1, 0.2, -0.16, 0.05, -0.12, -0.06);
    ear.bezierCurveTo(-0.09, -0.16, -0.02, -0.2, 0.04, -0.14);
    ear.bezierCurveTo(0.06, -0.06, 0.07, 0.08, 0.04, 0.16);
    const em = new THREE.Mesh(new THREE.ExtrudeGeometry(ear, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.012, bevelSegments: 3 }), clay);
    em.position.set(EAR.x, EAR.y, FRONT - 0.01);
    gHead.add(em);
    const el = fatLine(ear.getPoints(16), INK, 2, 0.08);
    el.position.set(EAR.x, EAR.y, FRONT - 0.01);
    gHead.add(el);
    const eye = new THREE.Mesh(new THREE.CircleGeometry(0.045, 24), new THREE.MeshBasicMaterial({ color: INK }));
    eye.scale.set(1.3, 0.8, 1);
    eye.position.set(0.8, 0.12, FRONT + 0.006);
    gHead.add(eye);
  }
  // sound converging on the ear
  const headRings = [0, 1, 2].map(() => {
    const r = fatLine(new THREE.EllipseCurve(0, 0, 1, 1).getPoints(64), GREEN, 2.2, 0, true);
    r.position.set(EAR.x - 0.04, EAR.y, FRONT + 0.1);
    gHead.add(r);
    return r;
  });
  // the caption, in front of the face
  const CAP = { x: 1.3, y: 0.82 };
  const capTex = canvasTex(1024, 224, (c, w, h) => {
    roundRect(c, 6, 6, w - 12, h - 12, 26);
    c.fillStyle = '#0f151c';
    c.fill();
    c.fillStyle = '#eef4f8';
    c.font = `700 64px ${SANS}`;
    c.textBaseline = 'middle';
    c.textAlign = 'center';
    c.fillText('I like the way you move', w / 2 + 40, h / 2 + 4);
    roundRect(c, 40, h / 2 - 30, 92, 60, 10);
    c.lineWidth = 6;
    c.strokeStyle = '#eef4f8';
    c.stroke();
    c.font = `500 34px ${MONO}`;
    c.fillText('CC', 86, h / 2 + 3);
  });
  const caption = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 0.38), new THREE.MeshBasicMaterial({ map: capTex, transparent: true, toneMapped: false, depthWrite: false }));
  caption.position.set(CAP.x, CAP.y, FRONT + 0.3);
  caption.renderOrder = 10;
  gHead.add(caption);
  // particle streams: ear → hearing area, caption → eye → visual area
  const dotGeo = new THREE.SphereGeometry(0.026, 10, 8);
  const earPath = new THREE.QuadraticBezierCurve3(new THREE.Vector3(EAR.x, EAR.y, FRONT + 0.06), new THREE.Vector3(-0.2, -0.02, FRONT + 0.1), new THREE.Vector3(AUD.x, AUD.y, FRONT + 0.05));
  const eyePath = new THREE.CubicBezierCurve3(new THREE.Vector3(CAP.x - 0.5, CAP.y - 0.2, FRONT + 0.28), new THREE.Vector3(0.95, 0.2, FRONT + 0.15), new THREE.Vector3(0.4, 0.5, FRONT + 0.08), new THREE.Vector3(VIS.x, VIS.y, FRONT + 0.05));
  const mkStream = (color: number, n: number) => {
    const m = new THREE.InstancedMesh(dotGeo, new THREE.MeshBasicMaterial({ color, transparent: true, toneMapped: false }), n);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    gHead.add(m);
    return m;
  };
  const earDots = mkStream(GREEN, 7);
  const eyeDots = mkStream(RED, 12);
  const audLbl = label(copy.hear, { h: 0.17, fg: '#0f151c' });
  audLbl.position.set(0.12, -0.62, FRONT + 0.2);
  gHead.add(audLbl);
  const visLbl = label(copy.see, { h: 0.17, fg: '#0f151c' });
  visLbl.position.set(-0.85, 1.2, FRONT + 0.2);
  gHead.add(visLbl);
  gHead.add(fatLine([new THREE.Vector2(AUD.x + 0.05, AUD.y - 0.08), new THREE.Vector2(0.1, -0.52)], INK, 1.2, FRONT + 0.03));
  gHead.add(fatLine([new THREE.Vector2(VIS.x - 0.05, VIS.y + 0.2), new THREE.Vector2(-0.8, 1.1)], INK, 1.2, FRONT + 0.03));
  let subsAmount = 0;
  const dm = new THREE.Matrix4();
  const dq = new THREE.Quaternion();
  const ds = new THREE.Vector3();
  const dp = new THREE.Vector3();

  /* ════ 3 · autumn ════════════════════════════════════════════════════ */
  const gTiles = new THREE.Group();
  scene.add(gTiles);
  const TW = 0.6;
  const TH = 0.76;
  const PITCH = 0.7;
  const faceTex = (txt: string, fg: string, bg: string) =>
    canvasTex(256, 320, (c, w, h) => {
      c.fillStyle = bg;
      c.fillRect(0, 0, w, h);
      c.fillStyle = fg;
      c.font = `800 200px ${SANS}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(txt, w / 2, h / 2 + 12);
    });
  const LAT = 'AUTUMN'.split('');
  const CYR = ['А', 'У', 'Т', 'У', 'М', 'Н'];
  const SND = ['о́', '', 'т', 'э', 'м', 'N'];
  type Face = 'lat' | 'cyr' | 'snd';
  interface Tile {
    g: THREE.Group;
    i: number;
    T: Record<Face, THREE.Texture>;
    face: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
    body: THREE.Mesh<RoundedBoxGeometry, THREE.MeshStandardMaterial>;
    cur: Face;
    want: Face;
    flip: number;
    x: number;
    y: number;
    s: number;
    o: number;
  }
  const tiles: Tile[] = LAT.map((ch, i) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new RoundedBoxGeometry(TW, TH, 0.16, 4, 0.05), clay.clone());
    outline(body, 0.012);
    g.add(body);
    const T: Record<Face, THREE.Texture> = {
      lat: faceTex(ch, '#0f151c', '#ffffff'),
      cyr: faceTex(CYR[i], '#c2262b', '#fff1f1'),
      snd: faceTex(SND[i] || ' ', i === 5 ? '#9aa8b5' : '#15803d', '#ecfdf3'),
    };
    const face = new THREE.Mesh(new THREE.PlaneGeometry(TW - 0.08, TH - 0.08), new THREE.MeshBasicMaterial({ map: T.lat, toneMapped: false, transparent: true }));
    face.position.z = 0.0815;
    g.add(face);
    g.position.x = (i - 2.5) * PITCH;
    gTiles.add(g);
    return { g, i, T, face, body, cur: 'lat', want: 'lat', flip: 1, x: g.position.x, y: 0, s: 1, o: 1 };
  });
  const chipTex = canvasTex(720, 220, (c, w, h) => {
    roundRect(c, 6, 6, w - 12, h - 12, 40);
    c.fillStyle = '#ffffff';
    c.fill();
    c.lineWidth = 8;
    c.strokeStyle = '#0f151c';
    c.stroke();
    c.fillStyle = '#0f151c';
    c.beginPath();
    c.arc(140, h / 2, 62, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.moveTo(112, h / 2 - 18);
    c.lineTo(130, h / 2 - 18);
    c.lineTo(156, h / 2 - 40);
    c.lineTo(156, h / 2 + 40);
    c.lineTo(130, h / 2 + 18);
    c.lineTo(112, h / 2 + 18);
    c.closePath();
    c.fill();
    c.fillStyle = '#0f151c';
    c.font = `800 112px ${SANS}`;
    c.textBaseline = 'middle';
    c.fillText(copy.chip, 240, h / 2 + 6);
  });
  const chip = new THREE.Mesh(new RoundedBoxGeometry(2.3, 0.7, 0.14, 4, 0.06), clay.clone());
  outline(chip, 0.012);
  const chipFace = new THREE.Mesh(new THREE.PlaneGeometry(2.26, 0.69), new THREE.MeshBasicMaterial({ map: chipTex, toneMapped: false, transparent: true }));
  chipFace.position.z = 0.072;
  chip.add(chipFace);
  chip.scale.setScalar(0.001);
  gTiles.add(chip);
  const tLbl = {
    written: label('autumn', { h: 0.26, mono: true, font: 500, fg: '#0f151c' }),
    eye: label(`${copy.eye}  ✕`, { h: 0.34, fg: '#ffffff', bg: '#e5484d', border: '#e5484d', font: 800 }),
    ear: label(`${copy.ear}  ${copy.ipa}`, { h: 0.34, fg: '#ffffff', bg: '#15803d', border: '#15803d', font: 800 }),
    silent: label(copy.silent, { h: 0.22, fg: '#5b6b7a' }),
    app: label(copy.appNote, { h: 0.27, fg: '#0f151c' }),
  };
  tLbl.written.position.set(0, 0.76, 0.1);
  tLbl.eye.position.set(0, -0.78, 0.1);
  tLbl.ear.position.set(-0.35, -0.78, 0.1);
  tLbl.silent.position.set(1.75, -1.24, 0.1);
  tLbl.app.position.set(0, -0.76, 0.1);
  Object.values(tLbl).forEach((l) => {
    l.material.opacity = 0;
    gTiles.add(l);
  });
  const STEP_MS = 3400;

  /* ════ 4 · the comic page in eight panels ═══════════════════════════ */
  const gComic = new THREE.Group();
  scene.add(gComic);
  const PHH = 3.4;
  const DEPTH = [0.55, -0.25, 0.2, 0.62, -0.05, 0.42, -0.35, 0.15];
  interface Panel {
    g: THREE.Group;
    i: number;
    mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
    frame: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
    home: THREE.Vector3;
  }
  let panels: Panel[] = [];
  const buildComic = (url: string, boxes: NonNullable<SceneLeo['panels']>) => {
    kit.texture(url, (tex) => {
      if (disposed) return;
      const img = tex.image as { width?: number; height?: number } | undefined;
      const aspect = img?.width && img?.height ? img.width / img.height : 1024 / 1536;
      const PWW = PHH * aspect;
      panels = boxes.map((b, i) => {
        const geo = new THREE.PlaneGeometry(b.w * PWW, b.h * PHH);
        const uv = geo.attributes.uv;
        for (let k = 0; k < uv.count; k++) uv.setXY(k, b.x + uv.getX(k) * b.w, 1 - b.y - b.h + uv.getY(k) * b.h);
        const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, envMapIntensity: 0.3 }));
        const frame = new THREE.Mesh(new THREE.PlaneGeometry(b.w * PWW + 0.08, b.h * PHH + 0.08), new THREE.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0, toneMapped: false, depthWrite: false }));
        frame.position.z = -0.01;
        own(frame.material);
        const g = new THREE.Group();
        g.add(frame, mesh);
        const home = new THREE.Vector3((b.x + b.w / 2 - 0.5) * PWW, (0.5 - b.y - b.h / 2) * PHH, 0);
        g.position.copy(home);
        gComic.add(g);
        return { g, i, mesh, frame, home };
      });
      const cShadow = shadow(2.8, 0.9);
      cShadow.position.set(0, -1.95, 0);
      gComic.add(cShadow);
    });
  };
  /* ════ 5 · the glasses ═══════════════════════════════════════════════ */
  const gGlass = new THREE.Group();
  scene.add(gGlass);
  const GH = 1.5;
  const RT = 0.4;
  const RB = 0.27;
  const profile = (fill: number, inset: boolean) => {
    const pts = [new THREE.Vector2(0, inset ? 0.05 : 0)];
    const top = inset ? Math.max(0.06, fill * (GH - 0.07)) : GH;
    pts.push(new THREE.Vector2(RB - 0.06 - (inset ? 0.025 : 0), inset ? 0.05 : 0));
    pts.push(new THREE.Vector2(RB - (inset ? 0.025 : 0), inset ? 0.1 : 0.06));
    for (let k = 1; k <= 12; k++) {
      const y = 0.06 + ((top - 0.06) * k) / 12;
      pts.push(new THREE.Vector2(RB + (RT - RB) * (y / GH) - (inset ? 0.025 : 0), y));
    }
    if (inset) pts.push(new THREE.Vector2(0, top));
    return pts;
  };
  const LEVELS: DifficultySlug[] = ['easy', 'medium', 'hard'];
  const ACCENT: Record<DifficultySlug, number> = { easy: 0x00c951, medium: 0xff6900, hard: 0xad46ff };
  interface Glass {
    g: THREE.Group;
    d: DifficultySlug;
    milk: THREE.Mesh<THREE.LatheGeometry, THREE.MeshStandardMaterial>;
    hit: THREE.Mesh;
    fill: number;
    target: number;
    lift: number;
    last: number;
  }
  const glasses: Glass[] = LEVELS.map((d, i) => {
    const g = new THREE.Group();
    const shell = new THREE.Mesh(
      new THREE.LatheGeometry(profile(1, false), 48),
      new THREE.MeshPhysicalMaterial({ color: ACCENT[d], transparent: true, opacity: 0.2, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.4, clearcoat: 1 }),
    );
    shell.renderOrder = 1;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(RT, 0.02, 8, 64), new THREE.MeshStandardMaterial({ color: ACCENT[d], roughness: 0.3 }));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = GH;
    // Milk is white and opaque: drawn after the glass so the tint never colours it.
    const milk = new THREE.Mesh(new THREE.LatheGeometry(profile(0.1, true), 48), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.32, envMapIntensity: 0.6, transparent: true, opacity: 1 }));
    milk.renderOrder = 3;
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(RT + 0.08, RB + 0.08, GH + 0.2, 12), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = GH / 2;
    hit.userData.level = d;
    const sh = shadow(1.0, 0.5);
    sh.position.y = 0.003;
    g.add(sh, milk, shell, rim, hit);
    g.position.x = (i - 1) * 1.1;
    g.position.y = -GH / 2;
    gGlass.add(g);
    return { g, d, milk, hit, fill: 0.04, target: SHELF_FILL[d], lift: 0, last: 0 };
  });

  /* ── chapters: which object, and how the camera frames it ────────── */
  const GROUPS = [gPeople, gDance, gHead, gTiles, gComic, gGlass, gRepeat];
  interface Frame { c: [number, number, number]; w: number; h: number; dw?: number; dh?: number; pw?: number; ph?: number; up?: number; my?: number }
  const FRAMES: Frame[] = [
    // dw/dh: a looser frame on desktop, where the scene has the right half; pw/ph: the frame in a
    // phone card's window (SceneSlot); up: camera height above the target; my: the target on phones
    { c: [0, 1.05, 0], w: 3.1, h: 2.7, dw: 3.5, dh: 3.7, pw: 2.85, ph: 2.85, up: 0.7, my: 0.86 },
    { c: [0, 0.85, 0], w: 2.6, h: 2.05 },
    { c: [0.5, 0.05, 0], w: 4.0, h: 3.0, pw: 4.6 },
    { c: [0, -0.15, 0], w: 4.6, h: 2.3 },
    { c: [0, 0, 0], w: 2.6, h: 3.6 },
    { c: [0, -0.05, 0], w: 3.4, h: 2.1, pw: 3.9, ph: 2.7, my: 0.08 },
    { c: [0, 1.38, 0], w: 2.3, h: 2.6, dw: 2.6, dh: 2.75, pw: 1.7, ph: 2.55, up: 0.3, my: 1.4 },
  ];
  /** How present each chapter's scene is, 0…1; it fades and slides on this. */
  const vis: number[] = GROUPS.map((_, i) => (i === 0 ? 1 : 0));
  let shown = 0;
  own(caption.material, audLbl.material, visLbl.material);
  VIGN.forEach((v) => {
    v.bubbles.forEach((b) => own(b.sprite.material));
    v.rings.forEach((r) => own(r.material));
  });
  headRings.forEach((r) => own(r.material));
  tiles.forEach((tl) => own(tl.face.material, tl.body.material));
  Object.values(tLbl).forEach((l) => own(l.material));
  GROUPS.forEach((g, i) => (g.visible = i === 0));

  const { stages, tracks } = opts;
  // Phones: every card has its own slot (SceneSlot.tsx) and the canvas moves into the one on screen.
  const slots = tracks.flatMap((tr) => [...tr.querySelectorAll<HTMLElement>('.slot')]);
  const phone = window.matchMedia('(max-width: 959px)');
  let host: HTMLElement = stages[0];
  let activeTrack = 0;
  let chapter = 0;
  let natural = 0;
  let visible = true;
  let W = 1;
  let H = 1;
  let desktop = false;
  const resize = () => {
    const w = host.clientWidth || window.innerWidth;
    const h = host.clientHeight || window.innerHeight;
    // A page opened in a hidden tab or a pane still opening measures 0×0: keep the last good size
    // (an aspect of 0 or Infinity would put the camera at infinity, and its easing would never come back).
    if (w < 2 || h < 2) return;
    W = w;
    H = h;
    desktop = W >= 960;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    if (desktop) camera.setViewOffset(W, H, -W * 0.22, 0, W, H);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    kit.setResolution(W, H);
  };
  const camFor = (i: number) => {
    const f = FRAMES[i];
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 2;
    const fh = desktop ? 0.7 : 0.84;
    const fw = desktop ? 0.5 : 0.9;
    const fwid = desktop ? (f.dw ?? f.w) : (f.pw ?? f.w);
    const fhgt = desktop ? (f.dh ?? f.h) : (f.ph ?? f.h);
    const d = Math.max(fhgt / (fh * tanH), fwid / (fw * tanH * camera.aspect));
    return { x: f.c[0], y: !desktop && f.my !== undefined ? f.my : f.c[1], z: d, up: f.up ?? 0.15 };
  };
  stages[0].appendChild(canvas);
  resize();
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => resize()) : null;
  stages.forEach((s) => ro?.observe(s));
  slots.forEach((s) => ro?.observe(s));
  window.addEventListener('resize', resize);
  const camNow = camFor(0);
  camera.position.set(camNow.x, camNow.y + camNow.up, camNow.z);
  const camLook = new THREE.Vector3(camNow.x, camNow.y, 0);

  /* ── phones: the slots ───────────────────────────────────────────── */
  // Each slot keeps a still of its scene, so a card scrolling in never shows an empty window:
  // drawn when the slot comes near the screen, and again from the live frame when the canvas leaves it.
  const stills = new Map<HTMLElement, HTMLCanvasElement>();
  const stillOf = (slot: HTMLElement) => {
    let c = stills.get(slot);
    if (!c) {
      c = document.createElement('canvas');
      c.className = 'still3d';
      slot.prepend(c);
      stills.set(slot, c);
    }
    return c;
  };
  const freezeInto = (slot: HTMLElement) => {
    const c = stillOf(slot);
    c.width = canvas.width;
    c.height = canvas.height;
    c.getContext('2d')?.drawImage(canvas, 0, 0);
  };
  const showGroups = () =>
    GROUPS.forEach((g, i) => {
      g.visible = vis[i] > 0.01;
      g.scale.setScalar(Math.max(0.001, 0.88 + 0.12 * vis[i]));
      g.position.y = (1 - vis[i]) * (i < chapter ? 0.5 : -0.5);
      if (g.visible) setOpacity(g, vis[i]);
    });
  /** The slot's chapter, settled and framed, drawn into its still; then the live picture is put back. */
  const preview = (slot: HTMLElement) => {
    const ch = Number(slot.dataset.slot);
    GROUPS.forEach((g, i) => {
      g.visible = i === ch;
      if (i === ch) {
        g.scale.setScalar(1);
        g.position.y = 0;
        setOpacity(g, 1);
      }
    });
    const keep = camera.position.clone();
    const cf = camFor(ch);
    camera.position.set(cf.x, cf.y + cf.up, cf.z);
    camera.lookAt(cf.x, cf.y, 0);
    renderer.render(scene, camera);
    freezeInto(slot);
    camera.position.copy(keep);
    camera.lookAt(camLook);
    showGroups();
    renderer.render(scene, camera);
  };
  const previewed = new Set<HTMLElement>();
  const near =
    typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(
          (entries) =>
            entries.forEach((e) => {
              const slot = e.target as HTMLElement;
              if (e.isIntersecting && slot !== host && !previewed.has(slot) && phone.matches) {
                previewed.add(slot);
                preview(slot);
              }
            }),
          { rootMargin: '60% 0px' },
        )
      : null;
  slots.forEach((s) => near?.observe(s));

  /** The canvas into another stage or slot; the slot it leaves keeps a still of the last frame. */
  const moveTo = (el: HTMLElement) => {
    if (host.classList.contains('slot')) {
      renderer.render(scene, camera);
      freezeInto(host);
      stillOf(host).style.visibility = '';
    }
    host = el;
    el.appendChild(canvas);
    if (el.classList.contains('slot')) stillOf(el).style.visibility = 'hidden';
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, phone.matches ? 2 : 1.75));
    resize();
  };
  /** Straight to a chapter, no fade or camera flight: its slot was showing it as a still already. */
  const jumpTo = (ch: number) => {
    vis.fill(0);
    vis[ch] = 1;
    shown = ch;
    chapter = ch;
    natural = ch;
    showGroups();
    const cf = camFor(ch);
    camera.position.set(cf.x, cf.y + cf.up, cf.z);
    camLook.set(cf.x, cf.y, 0);
    camera.lookAt(camLook);
  };

  // Which track is on screen, and which of its cards has passed the reading line (62% down).
  // On phones: which slot shows the most of itself.
  const pick = () => {
    const vh = window.innerHeight;
    if (phone.matches) {
      let best: HTMLElement | null = null;
      let most = 0;
      for (const s of slots) {
        const r = s.getBoundingClientRect();
        const seen = Math.min(r.bottom, vh) - Math.max(r.top, 0);
        if (seen > most) {
          most = seen;
          best = s;
        }
      }
      visible = !!best;
      if (!best) return;
      if (best !== host) {
        activeTrack = tracks.findIndex((tr) => tr.contains(best));
        moveTo(best);
        jumpTo(Number(best.dataset.slot));
      }
      return;
    }
    let t = -1;
    tracks.forEach((tr, i) => {
      const r = tr.getBoundingClientRect();
      if (t < 0 && r.bottom > 0 && r.top < vh) t = i;
    });
    visible = t >= 0;
    if (!visible) return;
    if (t !== activeTrack || host !== stages[t]) {
      activeTrack = t;
      moveTo(stages[t]);
    }
    // A card's scene is its data-scene, else its data-ch (a drawn card shows the scene before it).
    const cards = tracks[t].querySelectorAll<HTMLElement>('.ch > .card');
    const sceneOf = (card: HTMLElement) => Number(card.parentElement?.dataset.scene ?? card.parentElement?.dataset.ch ?? 0);
    let c = Number(tracks[t].dataset.first ?? 0);
    for (let i = 1; i < cards.length; i++) if (cards[i].getBoundingClientRect().top < vh * 0.62) c = sceneOf(cards[i]);
    natural = c;
  };
  pick();

  /* ── taps ─────────────────────────────────────────────────────────── */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let down: { x: number; y: number; t: number } | null = null;
  let pointerX = 0;
  let pointerY = 0;
  const hitTest = (cx: number, cy: number, list: THREE.Object3D[]) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const h = ray.intersectObjects(list, true);
    return h.length ? h[0].object : null;
  };
  const targetsFor = (): THREE.Object3D[] =>
    chapter === 5 ? glasses.map((g) => g.hit)
        : chapter === 3 ? [...tiles.map((tl) => tl.body), chip]
          : chapter === 2 ? [caption, audR, visR]
            : [];
  const onDown = (e: PointerEvent) => {
    down = { x: e.clientX, y: e.clientY, t: performance.now() };
  };
  const onMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    pointerX = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointerY = ((e.clientY - r.top) / r.height) * 2 - 1;
    if (e.pointerType === 'mouse') canvas.style.cursor = hitTest(e.clientX, e.clientY, targetsFor()) ? 'pointer' : '';
  };
  const onUp = (e: PointerEvent) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    const held = performance.now() - down.t;
    down = null;
    if (moved > 10 || held > 500) return;
    const o = hitTest(e.clientX, e.clientY, targetsFor());
    if (!o) return;
    const s = landingStore.get();
    if (chapter === 5) {
      if (o.userData.level) landingStore.set({ level: o.userData.level as DifficultySlug });
    } else if (chapter === 3) {
      landingActions.sayAutumn?.(s.tiles.step === 1 ? 'en' : 'ru');
    } else if (chapter === 2) {
      setSubs(!s.subs.on, true);
    }
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);

  /* ── the loop ─────────────────────────────────────────────────────── */
  let disposed = false;
  let raf = 0;
  let running = false;
  let first = true;
  let last = performance.now();
  const t0 = last;
  let lastSubsFlip = last;
  let lastStepAt = last;
  let lastPass = -2;
  let lastBeat = -2;

  const frame = (now: number) => {
    running = false;
    if (disposed || !visible || document.hidden) return;
    // A frame's timestamp can be earlier than the last performance.now() taken
    // outside the loop; a negative step would push every easing away from its target.
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = Math.max(last, now);
    const time = (now - t0) / 1000;
    const S = landingStore.get();
    chapter = !phone.matches && S.focus && now < S.focus.until && activeTrack === 0 ? S.focus.ch : natural;

    // one scene at a time: the shown one leaves before the next one arrives
    if (shown !== chapter && vis[shown] < 0.04) {
      vis[shown] = 0;
      shown = chapter;
    }
    GROUPS.forEach((g, i) => {
      vis[i] = damp(vis[i], i === shown && shown === chapter ? 1 : 0, 7, dt);
      g.visible = vis[i] > 0.01;
      g.scale.setScalar(Math.max(0.001, 0.88 + 0.12 * vis[i]));
      g.position.y = (1 - vis[i]) * (i < chapter ? 0.5 : -0.5);
      if (g.visible) setOpacity(g, vis[i]);
    });

    // the camera eases to the chapter's frame; the pointer nudges it
    const cf = camFor(chapter);
    // Never stay lost: a camera that ever reached a non-number jumps back to the frame.
    if (![camera.position.x, camera.position.y, camera.position.z, camLook.x, camLook.y].every(Number.isFinite)) {
      camera.position.set(cf.x, cf.y + cf.up, cf.z);
      camLook.set(cf.x, cf.y, 0);
    }
    camera.position.x = damp(camera.position.x, cf.x + pointerX * 0.25, 3, dt);
    camera.position.y = damp(camera.position.y, cf.y - pointerY * 0.15 + cf.up, 3, dt);
    camera.position.z = damp(camera.position.z, cf.z, 3, dt);
    camLook.x = damp(camLook.x, cf.x, 3, dt);
    camLook.y = damp(camLook.y, cf.y, 3, dt);
    camera.lookAt(camLook);

    // 0 · people: one place at a time, turning on a carousel
    if (gPeople.visible) {
      const n = Math.floor(time / SLOT);
      const local = time - n * SLOT;
      // The page opens on the conversation, already in place; the carousel turns only after that.
      const u = n === 0 || local >= MOVE ? 1 : ease(local / MOVE);
      carousel.rotation.y = -((n - 1 + u) * 2 * Math.PI) / 3;
      VIGN.forEach((v, i) => {
        const a = (i * 2 * Math.PI) / 3 + carousel.rotation.y;
        v.g.visible = Math.cos(a) > 0.25;
        const active = ((n % 3) + 3) % 3 === i;
        if (v.g.visible) v.update(time, active ? Math.max(0, local - (n === 0 ? 0 : MOVE)) : 0);
        v.bubbles.forEach((b) => {
          const shownNow = active && (n === 0 ? local > 0.6 : local > MOVE + 0.2);
          b.sprite.material.opacity = damp(b.sprite.material.opacity, (shownNow ? b.want : 0) * vis[0], 8, dt);
        });
      });
    }

    // 1 · the dancer. Its clock drives the card's ladder too, so it keeps time even while
    // another scene is showing (on a phone the card's button can be below the dancer's window).
    const { key, L } = danceAt(time);
    if (L.pass !== lastPass || L.beat !== lastBeat) {
      lastPass = L.pass;
      lastBeat = L.beat;
      landingStore.set({ ladderUI: { pass: L.pass, beat: L.beat } });
    }
    if (gDance.visible) {
      applyDance(dancer, key);
      dShadow.position.x = key.hx * UNIT;
      prints.forEach((pr, k) => {
        const on = L.beat === k || (L.beat < 0 && k === 3);
        pr.m.material.map = on ? FOOT[1] : FOOT[0];
        pr.n.visible = !on;
        pr.nOn.visible = on;
      });
      gDance.rotation.y = Math.sin(time * 0.3) * 0.12;
    }

    // 6 · listen, repeat, hear yourself
    if (gRepeat.visible) {
      const tt = rpPinned ?? time % RP_CYCLE;
      const step = tt < 3.4 ? 0 : tt < 7.2 ? 1 : 2;
      if (step !== rpStepSeen) {
        rpStepSeen = step;
        landingStore.set({ repeatUI: step });
      }
      rpW.forEach((w, k) => (rpW[k] = rpPinned !== null ? (k === step ? 1 : 0) : damp(w, k === step ? 1 : 0, 6, dt)));
      const beat = Math.sin(time * Math.PI * 2 * 1.9);
      const say = rpW[1];
      const hear = rpW[2];
      // listening: the phone at the chest, nodding to the beat; saying: the phone up at the mouth;
      // hearing yourself: looking up at the playback, the free hand coming up a little
      applyPose(rpFig.P, pose({
        nk: [0.11 * beat * rpW[0] + 0.12 * say - 0.22 * hear, 0.08 * Math.sin(time * 0.9) * rpW[0] - 0.12 * say, 0],
        hy: -0.015 * Math.abs(beat) * rpW[0],
        hrz: 0.025 * Math.sin(time * Math.PI * 1.9) * rpW[0],
        shR: mixV([-0.95, 0, -0.05], [-0.7, 0, -0.62], say),
        elR: -1.15 + (-2.05 + 1.15) * say,
        shL: mixV([0.05, 0, -0.12 - 0.05 * beat * rpW[0]], [-0.35, 0, -0.32], hear),
        elL: -0.15 - 0.9 * hear,
        knL: (0.05 + 0.06 * Math.max(0, beat)) * rpW[0],
        anL: -0.05 * Math.max(0, beat) * rpW[0],
      }));
      rpHp.getWorldPosition(rpWorld);
      gRepeat.worldToLocal(rpWorld);
      rpRings.forEach((r, k) => {
        const ph = (time * 0.8 + k / 3) % 1;
        r.position.set(rpWorld.x, rpWorld.y, rpWorld.z + 0.05);
        r.scale.setScalar(0.18 + ph * 0.45);
        r.material.opacity = Math.sin(ph * Math.PI) * 0.8 * rpW[0] * vis[6];
      });
      rpSay.material.opacity = say * vis[6];
      rpSay.scale.y = 0.56 * 0.62 * (0.85 + 0.15 * say);
      rpRec.forEach((r, k) => {
        const ph = (time * 1.4 + k / 2) % 1;
        r.position.set(0.02, 1.58, 0.24);
        r.scale.setScalar(0.05 + ph * 0.12);
        r.material.opacity = Math.sin(ph * Math.PI) * 0.7 * say * vis[6];
      });
      // the playback faces the camera, and its playhead crosses the two voices once per beat
      rpReplay.quaternion.copy(camera.quaternion);
      rpReplay.scale.setScalar(0.9 + 0.1 * hear);
      rpPanel.material.opacity = hear * vis[6];
      const u = step === 2 ? Math.min(1, (tt - 7.2) / 3.4) : 0;
      rpHead.position.x = -PW / 2 + PW * 0.26 + PW * 0.68 * u;
      rpHead.material.opacity = hear * vis[6];
      rpJoy.forEach((l, k) => (l.material.opacity = hear * vis[6] * (0.6 + 0.4 * Math.sin(time * 6 + k))));
      rpSmile.material.opacity = hear * vis[6];
    }

    // 2 · the head
    if (gHead.visible) {
      if (!S.subs.user && now - lastSubsFlip > 4600) {
        setSubs(!S.subs.on);
        lastSubsFlip = now;
      }
      subsAmount = damp(subsAmount, S.subs.on ? 1 : 0, 4, dt);
      const s = subsAmount;
      audR.material.color.copy(C_IDLE).lerp(C_GREEN, 1 - s * 0.85);
      audR.material.emissive.copy(C_GREEN).multiplyScalar((1 - s) * (0.35 + 0.15 * Math.sin(time * 5)));
      visR.material.color.copy(C_IDLE).lerp(C_RED, s);
      visR.material.emissive.copy(C_RED).multiplyScalar(s * (0.35 + 0.15 * Math.sin(time * 5)));
      headRings.forEach((r, k) => {
        const ph = (time * 0.7 + k / 3) % 1;
        r.scale.setScalar(0.75 - ph * 0.6);
        r.material.opacity = Math.sin(ph * Math.PI) * (1 - s * 0.75) * vis[2];
      });
      caption.material.opacity = s * vis[2];
      caption.scale.setScalar(0.85 + 0.15 * s);
      const stream = (mesh: THREE.InstancedMesh, path: THREE.Curve<THREE.Vector3>, n: number, amt: number, speed: number) => {
        for (let k = 0; k < n; k++) {
          const u = (time * speed + k / n) % 1;
          path.getPoint(u, dp);
          const sc = amt > 0.02 ? (0.6 + 0.6 * Math.sin(u * Math.PI)) * amt : 0.0001;
          dm.compose(dp, dq, ds.set(sc, sc, sc));
          mesh.setMatrixAt(k, dm);
        }
        mesh.instanceMatrix.needsUpdate = true;
      };
      stream(earDots, earPath, 7, 1 - s * 0.85, 0.55);
      stream(eyeDots, eyePath, 12, s, 0.45);
      audLbl.material.opacity = (0.45 + 0.55 * (1 - s)) * vis[2];
      visLbl.material.opacity = (0.45 + 0.55 * s) * vis[2];
      gHead.rotation.y = -0.22 + Math.sin(time * 0.4) * 0.06;
    }

    // 3 · autumn
    if (gTiles.visible) {
      const TS = S.tiles;
      if (now - lastStepAt > STEP_MS && now - TS.user > 12000) {
        setTilesStep((TS.step + 1) % 4);
        lastStepAt = now;
      }
      if (TS.user && now - TS.user < 200) lastStepAt = now;
      const st = TS.step;
      tiles.forEach((tl) => {
        const i = tl.i;
        let want: Face = 'lat';
        let x = (i - 2.5) * PITCH;
        let y = 0;
        let s = 1;
        let o = 1;
        if (st === 1) want = 'cyr';
        if (st === 2) {
          want = 'snd';
          const order: Record<number, number> = { 0: 0, 1: 0, 2: 1, 3: 2, 4: 3 };
          if (i <= 4) x = (order[i] - 1.5) * PITCH;
          if (i === 1) {
            s = 0.001;
            o = 0;
          }
          if (i === 3) s = 0.82;
          if (i === 5) {
            x = 1.75;
            y = -0.62;
            s = 0.7;
            o = 0.45;
          }
        }
        if (st === 3) {
          want = 'snd';
          x = 0;
          y = 0;
          s = 0.001;
          o = 0;
        }
        if (tl.want !== want) {
          tl.want = want;
          tl.flip = 0;
        }
        if (tl.flip < 1) {
          tl.flip = Math.min(1, tl.flip + dt * 2.6 * (1 - i * 0.04));
          if (tl.flip >= 0.5 && tl.cur !== tl.want) {
            tl.cur = tl.want;
            tl.face.material.map = tl.T[tl.cur];
            tl.face.material.needsUpdate = true;
          }
        }
        tl.x = damp(tl.x, x, 6, dt);
        tl.y = damp(tl.y, y, 6, dt);
        tl.s = damp(tl.s, s, 6, dt);
        tl.o = damp(tl.o, o, 6, dt);
        tl.g.position.set(tl.x, tl.y, 0);
        tl.g.rotation.y = (tl.flip < 0.5 ? tl.flip : tl.flip - 1) * Math.PI;
        tl.g.rotation.x = Math.sin(time * 1.2 + i) * 0.04;
        tl.g.scale.setScalar(Math.max(0.001, tl.s));
        tl.face.material.opacity = tl.o * vis[3];
        tl.body.material.opacity = tl.o * vis[3];
        tl.body.material.transparent = tl.o < 0.99;
      });
      const cs = st === 3 ? 1 : 0.001;
      chip.scale.setScalar(Math.max(0.001, damp(chip.scale.x, cs, 6, dt)));
      chip.rotation.y = Math.sin(time * 0.9) * 0.12;
      const fade = (l: THREE.Sprite, on: boolean) => {
        l.material.opacity = damp(l.material.opacity, on ? vis[3] : 0, 6, dt);
      };
      fade(tLbl.written, st === 0);
      fade(tLbl.eye, st === 1);
      fade(tLbl.ear, st === 2);
      fade(tLbl.silent, st === 2);
      fade(tLbl.app, st === 3);
    }

    // 4 · the comic
    if (gComic.visible) {
      gComic.rotation.y = Math.sin(time * 0.35) * 0.16 + pointerX * 0.22 - 0.1;
      gComic.rotation.x = 0.06 + pointerY * 0.06;
      panels.forEach((p, i) => {
        p.g.position.x = p.home.x * 1.08;
        p.g.position.y = p.home.y * 1.06;
        p.g.position.z = damp(p.g.position.z, (DEPTH[i % DEPTH.length] ?? 0) * 0.9, 7, dt);
        p.g.rotation.y = i % 2 ? 0.06 : -0.06;
        const fm = p.frame.material;
        fm.opacity = damp(fm.opacity, 0.15 * vis[4], 8, dt);
      });
    }

    // 5 · the glasses
    if (gGlass.visible) {
      gGlass.rotation.x = 0.16;
      glasses.forEach((gl, i) => {
        const sel = gl.d === S.level;
        gl.fill = damp(gl.fill, vis[5] > 0.5 ? gl.target : 0.04, 2.4, dt);
        if (Math.abs(gl.last - gl.fill) > 0.004) {
          gl.milk.geometry.dispose();
          gl.milk.geometry = new THREE.LatheGeometry(profile(gl.fill, true), 48);
          gl.last = gl.fill;
        }
        gl.lift = damp(gl.lift, sel ? 0.25 : 0, 6, dt);
        gl.g.position.y = -GH / 2 + gl.lift;
        gl.g.rotation.y = time * (sel ? 0.5 : 0.12) + i;
        gl.g.scale.setScalar(sel ? 1.08 : 0.94);
      });
    }

    renderer.render(scene, camera);
    if (first) {
      first = false;
      opts.onReady();
    }
    loop();
  };
  const loop = () => {
    if (running || disposed) return;
    running = true;
    raf = requestAnimationFrame(frame);
  };
  /** Where the canvas belongs now; the loop starts again if it had stopped off screen. */
  const wake = () => {
    pick();
    if (visible && !running) {
      last = performance.now();
      loop();
    }
  };
  const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(wake, { threshold: 0 }) : null;
  tracks.forEach((tr) => io?.observe(tr));
  window.addEventListener('scroll', wake, { passive: true });
  window.addEventListener('resize', wake);
  phone.addEventListener('change', wake);
  const onVisibility = () => {
    if (!document.hidden) {
      last = performance.now();
      loop();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);
  const onLost = (e: Event) => {
    e.preventDefault();
    opts.onFail('context lost');
  };
  canvas.addEventListener('webglcontextlost', onLost);
  loop();

  // For the scripted browser checks (dev only): where things are on screen, and the camera.
  if (import.meta.env.DEV) {
    (window as unknown as { __landing3d?: unknown }).__landing3d = {
      get chapter() {
        return chapter;
      },
      get track() {
        return activeTrack;
      },
      get cam() {
        return { pos: camera.position.toArray().map((v) => +v.toFixed(2)), look: camLook.toArray().map((v) => +v.toFixed(2)), vis: vis.map((v) => +v.toFixed(2)), shown, chapter };
      },
      get bubbles() {
        return VIGN.map((v) => v.bubbles.map((b) => +b.sprite.material.opacity.toFixed(2)));
      },
      /** Hold the listen-and-repeat scene at a moment of its cycle (seconds, 0-11); null lets it run. */
      pinRepeat(t: number | null) {
        rpPinned = t;
      },
      /** Freeze the dancer at a rate, half-count (0-7) and progress (0-1); null lets it dance again. */
      pinDance(p: { rate: number; j: number; u: number } | null) {
        pinned = p;
      },
      proj(x: number, y: number, z: number) {
        const v = new THREE.Vector3(x, y, z).project(camera);
        const r = canvas.getBoundingClientRect();
        return [Math.round(r.left + ((v.x + 1) / 2) * r.width), Math.round(r.top + ((1 - v.y) / 2) * r.height)];
      },
      at(kind: 'panel' | 'glass', i: number) {
        const obj = kind === 'panel' ? panels[i]?.mesh : glasses[i]?.hit;
        if (!obj) return null;
        const v = new THREE.Vector3();
        obj.getWorldPosition(v);
        v.project(camera);
        const r = canvas.getBoundingClientRect();
        return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
      },
    };
  }

  return {
    setLeo(leo) {
      const a = leo.markers[leo.dancePhrase];
      const b = leo.markers[leo.dancePhrase + 1];
      if (Number.isFinite(a) && Number.isFinite(b) && b > a) phraseLen = b - a;
      if (leo.comicUrl && leo.panels?.length && panels.length === 0) buildComic(leo.comicUrl, leo.panels);
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', wake);
      window.removeEventListener('resize', wake);
      phone.removeEventListener('change', wake);
      near?.disconnect();
      stills.forEach((c) => c.remove());
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('webglcontextlost', onLost);
      ro?.disconnect();
      io?.disconnect();
      const textures = new Set<THREE.Texture>();
      scene.traverse((n) => {
        const mesh = n as THREE.Mesh;
        mesh.geometry?.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((m) => {
          const map = (m as THREE.MeshBasicMaterial).map;
          if (map) textures.add(map);
          m.dispose();
        });
      });
      FOOT.forEach((t) => textures.add(t));
      tiles.forEach((tl) => Object.values(tl.T).forEach((t) => textures.add(t)));
      textures.forEach((t) => t.dispose());
      envTarget.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      if (import.meta.env.DEV) delete (window as unknown as { __landing3d?: unknown }).__landing3d;
    },
  };
}
