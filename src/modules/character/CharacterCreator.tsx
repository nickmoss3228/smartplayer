// modules/character/CharacterCreator.tsx
//
// Make yourself, on the dashboard. A figure turning on a little stage, and
// beside it the choices: skin, hair, clothes, glasses and a hat. Everything is
// free — this is who you are, not something you bought.
//
// The figure is the school's own (Figure.tsx over figureParts.ts), so what you
// make here is exactly who sits at the front desk of your first classroom, and
// the navbar's picture is a photograph of it (portrait.ts).
//
// Its own small three.js canvas, lazy-loaded with this file: the dashboard
// does not pay for 3D until it scrolls into this card.

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { IoArrowUndoOutline, IoCheckmark, IoDiceOutline, IoSchoolOutline } from "react-icons/io5";
import { useCharacter } from "../../context/CharacterContext";
import { buttonBase, buttonTone } from "../../components/ui/buttonStyles";
import { Figure } from "./Figure";
import { useBodyRefs } from "./bodyRefs";
import {
  BOTTOM_STYLES,
  CLOTHES_COLORS,
  CharacterLook,
  GLASSES_STYLES,
  HAIR_COLORS,
  HAIR_STYLES,
  HAT_STYLES,
  SKIN_TONES,
  TOP_STYLES,
  lookKey,
  randomLook,
  resolveLook,
} from "./look";

// ── The stage ───────────────────────────────────────────────────────────────

/** The figure, breathing, turning to where it was dragged, and hopping when
 *  something about it changes — so a tap on a swatch lands on SOMETHING. */
const Model = ({ look, yaw, wave }: { look: CharacterLook; yaw: React.RefObject<number>; wave: number }) => {
  const refs = useBodyRefs();
  const spin = useRef<THREE.Group>(null);
  const hopAt = useRef(-10);
  const waveAt = useRef(-10);
  const key = lookKey(look);

  useEffect(() => {
    hopAt.current = performance.now() / 1000;
  }, [key]);
  useEffect(() => {
    if (wave) waveAt.current = performance.now() / 1000;
  }, [wave]);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const now = performance.now() / 1000;
    if (spin.current) {
      spin.current.rotation.y += ((yaw.current ?? 0) - spin.current.rotation.y) * Math.min(1, dt * 8);
    }
    const hop = now - hopAt.current;
    if (refs.root.current) refs.root.current.position.y = hop < 0.35 ? Math.sin((hop / 0.35) * Math.PI) * 0.07 : 0;
    if (refs.torso.current) refs.torso.current.rotation.x = Math.sin(t * 1.7) * 0.015;
    if (refs.head.current) refs.head.current.rotation.y = Math.sin(t * 0.5) * 0.12;
    if (refs.armL.current) refs.armL.current.rotation.z = -0.07 - Math.sin(t * 1.7) * 0.02;
    const w = now - waveAt.current;
    if (refs.armR.current) {
      // A wave: arm up, hand going, arm down. Otherwise at the side.
      const up = w < 1.6 ? Math.min(1, w / 0.2, (1.6 - w) / 0.25) : 0;
      refs.armR.current.rotation.z = 0.07 + Math.sin(t * 1.7) * 0.02 + up * (2.5 + Math.sin(w * 16) * 0.25);
    }
  });

  return (
    <group ref={spin}>
      <Figure refs={refs} look={look} />
    </group>
  );
};

const Stage = ({ look, wave, hint }: { look: CharacterLook; wave: number; hint: string }) => {
  // Three-quarters on to start with, like the school's camera sees people.
  const yaw = useRef(-0.4);
  const drag = useRef<{ x: number; yaw: number } | null>(null);

  return (
    <div
      className="relative h-64 sm:h-80 rounded-tile bg-[#d8ebf6] overflow-hidden cursor-grab active:cursor-grabbing"
      style={{ touchAction: "pan-y" }}
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, yaw: yaw.current };
        (e.target as Element).setPointerCapture?.(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (drag.current) yaw.current = drag.current.yaw + (e.clientX - drag.current.x) * 0.012;
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
    >
      <Canvas
        flat
        dpr={[1, 2]}
        camera={{ position: [0, 1.2, 4.4], fov: 22 }}
        onCreated={({ camera }) => camera.lookAt(0, 0.7, 0)}
        gl={{ antialias: true, alpha: true }}
      >
        <hemisphereLight args={["#fff6e6", "#b0a695", 1.2]} />
        <directionalLight position={[2, 4, 3]} intensity={1.3} color="#fff6e6" />
        <directionalLight position={[-3, 2, -2]} intensity={0.45} color="#b7cadb" />
        {/* A round of classroom floor to stand on. */}
        <mesh position={[0, -0.03, 0]}>
          <cylinderGeometry args={[0.62, 0.62, 0.06, 32]} />
          <meshLambertMaterial color="#e6dccb" />
        </mesh>
        <Model look={look} yaw={yaw} wave={wave} />
      </Canvas>
      <p className="pointer-events-none absolute inset-x-0 bottom-2 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-dim">
        {hint}
      </p>
    </div>
  );
};

// ── Choices ─────────────────────────────────────────────────────────────────

const Label = ({ children }: { children: React.ReactNode }) => (
  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-dim mb-2">{children}</p>
);

const Chips = <T extends string>({
  options,
  value,
  onPick,
  name,
}: {
  options: readonly T[];
  value: T;
  onPick: (v: T) => void;
  name: (v: T) => string;
}) => (
  <div className="flex flex-wrap gap-1.5">
    {options.map((o) => (
      <button
        key={o}
        type="button"
        aria-pressed={o === value}
        onClick={() => onPick(o)}
        className={`h-9 px-3 rounded-[3px] text-[13px] font-semibold transition-colors ${
          o === value ? "bg-ink text-white" : "bg-black/[0.04] text-black/70 hover:bg-black/[0.08]"
        }`}
      >
        {name(o)}
      </button>
    ))}
  </div>
);

const Swatches = ({
  colours,
  value,
  onPick,
  label,
}: {
  colours: readonly string[];
  value: string;
  onPick: (c: string) => void;
  label: (n: number) => string;
}) => (
  <div className="flex flex-wrap gap-2">
    {colours.map((c, i) => {
      const on = c.toLowerCase() === value.toLowerCase();
      return (
        <button
          key={c}
          type="button"
          aria-pressed={on}
          aria-label={label(i + 1)}
          onClick={() => onPick(c)}
          className={`h-8 w-8 rounded-full ring-offset-2 transition-shadow ${
            on ? "ring-2 ring-ink" : "ring-1 ring-black/10 hover:ring-black/30"
          }`}
          style={{ background: c }}
        />
      );
    })}
  </div>
);

type Tab = "skin" | "hair" | "clothes" | "extras";
const TABS: Tab[] = ["skin", "hair", "clothes", "extras"];

// ── The card ────────────────────────────────────────────────────────────────

export const CharacterCreator = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { character, saveLook } = useCharacter();
  const saved = useMemo(() => resolveLook(character), [character]);
  const made = Boolean(character?.look);
  const [draft, setDraft] = useState<CharacterLook>(saved);
  const [tab, setTab] = useState<Tab>("skin");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [wave, setWave] = useState(0);

  // When the saved character arrives (or changes elsewhere), start from it —
  // unless there are changes here that have not been saved yet.
  const savedKey = lookKey(saved);
  const dirty = lookKey(draft) !== savedKey;
  const lastSaved = useRef(savedKey);
  useEffect(() => {
    if (lastSaved.current === savedKey) return;
    lastSaved.current = savedKey;
    setDraft(saved);
  }, [savedKey, saved]);

  // Arriving from a link to this card (the navbar portrait, "#character"):
  // the card loads after the page does, so the browser's own jump missed it.
  const card = useRef<HTMLElement>(null);
  useEffect(() => {
    if (window.location.hash === "#character") card.current?.scrollIntoView({ block: "start" });
  }, []);

  useEffect(() => {
    if (status !== "saved") return;
    const id = window.setTimeout(() => setStatus("idle"), 2200);
    return () => window.clearTimeout(id);
  }, [status]);

  const set = <K extends keyof CharacterLook>(field: K, value: CharacterLook[K]) =>
    setDraft((d) => ({ ...d, [field]: value }));

  const save = async () => {
    setStatus("saving");
    const res = await saveLook(draft);
    setStatus(res.ok ? "saved" : "failed");
    if (res.ok) setWave((w) => w + 1);
  };

  const colour = (n: number) => t("character.colour", { n });

  return (
    <section
      ref={card}
      id="character"
      className="scroll-mt-20 bg-white rounded-card p-4 sm:p-6 mb-4 sm:mb-6 border border-line animate-fade-in"
    >
      <div className="mb-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-dim">{t("character.eyebrow")}</p>
        <h2 className="text-[15px] sm:text-lg font-bold text-ink">
          {made ? t("character.title") : t("character.titleNew")}
        </h2>
        <p className="text-sm text-dim mt-0.5">{made ? t("character.intro") : t("character.introNew")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,17rem)_1fr]">
        <Stage look={draft} wave={wave} hint={t("character.dragHint")} />

        <div className="min-w-0 flex flex-col">
          <div role="tablist" className="flex gap-1 mb-4 overflow-x-auto">
            {TABS.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`h-9 px-3 shrink-0 rounded-[3px] text-[13px] font-bold transition-colors ${
                  tab === id ? "bg-black/[0.07] text-ink" : "text-black/50 hover:text-black/80"
                }`}
              >
                {t(`character.tabs.${id}`)}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-4 flex-1">
            {tab === "skin" && (
              <div>
                <Label>{t("character.skin")}</Label>
                <Swatches colours={SKIN_TONES} value={draft.skin} onPick={(c) => set("skin", c)} label={colour} />
              </div>
            )}

            {tab === "hair" && (
              <>
                <div>
                  <Label>{t("character.style")}</Label>
                  <Chips
                    options={HAIR_STYLES}
                    value={draft.hair}
                    onPick={(v) => set("hair", v)}
                    name={(v) => t(`character.hair.${v}`)}
                  />
                </div>
                <div>
                  <Label>{t("character.colourLabel")}</Label>
                  <Swatches
                    colours={HAIR_COLORS}
                    value={draft.hairColor}
                    onPick={(c) => set("hairColor", c)}
                    label={colour}
                  />
                </div>
              </>
            )}

            {tab === "clothes" && (
              <>
                <div>
                  <Label>{t("character.top")}</Label>
                  <Chips
                    options={TOP_STYLES}
                    value={draft.top}
                    onPick={(v) => set("top", v)}
                    name={(v) => t(`character.tops.${v}`)}
                  />
                  <div className="mt-2.5">
                    <Swatches
                      colours={CLOTHES_COLORS}
                      value={draft.topColor}
                      onPick={(c) => set("topColor", c)}
                      label={colour}
                    />
                  </div>
                </div>
                <div>
                  <Label>{t("character.bottom")}</Label>
                  <Chips
                    options={BOTTOM_STYLES}
                    value={draft.bottom}
                    onPick={(v) => set("bottom", v)}
                    name={(v) => t(`character.bottoms.${v}`)}
                  />
                  <div className="mt-2.5">
                    <Swatches
                      colours={CLOTHES_COLORS}
                      value={draft.bottomColor}
                      onPick={(c) => set("bottomColor", c)}
                      label={colour}
                    />
                  </div>
                </div>
              </>
            )}

            {tab === "extras" && (
              <>
                <div>
                  <Label>{t("character.glassesLabel")}</Label>
                  <Chips
                    options={GLASSES_STYLES}
                    value={draft.glasses}
                    onPick={(v) => set("glasses", v)}
                    name={(v) => t(`character.glasses.${v}`)}
                  />
                </div>
                <div>
                  <Label>{t("character.hatLabel")}</Label>
                  <Chips
                    options={HAT_STYLES}
                    value={draft.hat === "chef" ? "none" : draft.hat}
                    onPick={(v) => set("hat", v)}
                    name={(v) => t(`character.hats.${v}`)}
                  />
                  {draft.hat !== "none" && (
                    <div className="mt-2.5">
                      <Swatches
                        colours={CLOTHES_COLORS}
                        value={draft.hatColor}
                        onPick={(c) => set("hatColor", c)}
                        label={colour}
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-line flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setDraft(randomLook())}
              className={`${buttonBase} h-10 px-3.5 text-[13px] ${buttonTone.secondary}`}
            >
              <IoDiceOutline size={17} />
              {t("character.random")}
            </button>
            {dirty && (
              <button
                type="button"
                onClick={() => setDraft(saved)}
                className={`${buttonBase} h-10 px-3.5 text-[13px] ${buttonTone.secondary}`}
              >
                <IoArrowUndoOutline size={16} />
                {t("character.undo")}
              </button>
            )}
            <div className="flex-1" />
            {!dirty && made && (
              <button
                type="button"
                onClick={() => navigate("/room?me=1")}
                className={`${buttonBase} h-10 px-3.5 text-[13px] ${buttonTone.secondary}`}
              >
                <IoSchoolOutline size={16} />
                {t("character.seeInSchool")}
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={status === "saving" || (!dirty && made)}
              className={`${buttonBase} h-10 px-5 text-[13px] ${buttonTone.primary}`}
            >
              {status === "saved" && !dirty ? <IoCheckmark size={16} /> : null}
              {status === "saving"
                ? t("character.saving")
                : status === "saved" && !dirty
                  ? t("character.saved")
                  : t("character.save")}
            </button>
          </div>
          {status === "failed" && (
            <p role="alert" className="mt-2 text-sm text-signal-ink">
              {t("character.saveFailed")}
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default CharacterCreator;
