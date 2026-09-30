// pages/Room.tsx — the Dream School.
//
// The route and filename stay "Room" so the navbar icon, App.tsx's lazy import
// and every existing link keep working; only what it renders changed.
//
// One fullscreen view on every breakpoint. There is no desktop sidebar and no
// mobile sheet-per-room: the game is the school, and the control surface is a
// build sheet plus a decorate sheet. Everything else — panning, zooming,
// poking a student — happens in the scene itself.
//
// Build mode puts the rooms you could buy INTO the scene, standing where they
// would stand, rather than in a list. "Where does that go, and what does it do
// to what I already have" is the question a list cannot answer — so the answer
// is geometry, and the only chrome is a confirm card for whichever ghost you
// tapped.
//
// None of the chrome floating over the scene uses backdrop-blur. The scene
// animates every frame (people, furniture), so each blurred card or button
// had to re-blur what was behind it on every frame, on top of the WebGL work —
// and at bg-white/90–95 the blur was all but invisible anyway.
//
// See docs/room-game-concept.md.

import { lazy, ReactNode, Suspense, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  IoBrushOutline,
  IoClose,
  IoHammerOutline,
  IoLockClosed,
  IoBusinessOutline,
  IoLayersOutline,
  IoLocateOutline,
  IoMusicalNotesOutline,
  IoShirtOutline,
  IoVolumeHighOutline,
  IoVolumeMuteOutline,
  IoWalkOutline,
} from "react-icons/io5";
import { SchoolMode } from "../modules/school/SchoolCanvas";
import { useAmbientMusic } from "../modules/school/ambient";
import { useSchoolSfx } from "../modules/school/sfx";
import { ClockBadge } from "../modules/school/ClockBadge";
import { WalletBadge } from "../modules/school/WalletBadge";
import { schoolNow, useDayPart } from "../modules/school/schoolClock";
import { TeacherNotes } from "../modules/school/TeacherNotes";
import { OutsidePanel } from "../modules/school/OutsidePanel";
import { seasonFor } from "../modules/school/atmosphere";
import { Advice, adviceFor } from "../modules/school/advisor";
import { usePhraseBook } from "../modules/school/phraseBook";
import { CURRENCIES } from "../config/currencies";
import {
  BuyBlocker,
  Currency,
  RoomLook,
  RoomSpec,
  SCHOOL_FLOORS,
  SCHOOL_LAYOUTS,
  SCHOOL_WALLPAPERS,
  SchoolRoomRect,
  SchoolSurface,
  buildableRooms,
  customisable,
  getVariant,
  lookFor,
  parentOf,
  roomLabel,
  roomsOwned,
  stageFor,
} from "../config/schoolCatalog";
import { useSchoolState } from "../modules/school/useSchoolState";
import { useCharacter } from "../context/CharacterContext";
import { useProfile } from "../context/ProfileContext";
import { SchoolLookPatch, WalletBalances } from "../services/schoolServices";

// three.js and the whole scene are ~500kB that only this page needs, and even
// here only after the school itself has loaded.
const SchoolCanvas = lazy(() =>
  import("../modules/school/SchoolCanvas").then((m) => ({ default: m.SchoolCanvas })),
);

// ── Price tag ───────────────────────────────────────────────────────────────
// One currency, because a room only ever costs one. Marked when you are short
// of it: reading the deficit off the row is the difference between "save up"
// and "why is this greyed out".

const currencyMeta = (key: Currency) => CURRENCIES.find((c) => c.key === key) ?? CURRENCIES[0];

const PriceTag = ({
  currency,
  price,
  wallet,
}: {
  currency: Currency;
  price: number;
  wallet: WalletBalances;
}) => {
  const { icon: Icon, textClasses } = currencyMeta(currency);
  const short = wallet[currency] < price;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[13px] font-bold tabular-nums ${
        short ? "text-rose-500" : textClasses
      }`}
    >
      <Icon size={13} />
      {price}
    </span>
  );
};

// ── Build bar ───────────────────────────────────────────────────────────────
// The only chrome build mode has. Before you tap a ghost it is one line telling
// you to; after, it is the card for that room. Deliberately in the same place
// as the button that opened it, so the thing under your thumb never moves.

const BuildBar = ({
  chosen,
  wallet,
  busy,
  name,
  note,
  hint,
  done,
  closeLabel,
  onBuy,
  onClose,
}: {
  chosen: { spec: RoomSpec; blocker: BuyBlocker | null } | undefined;
  wallet: WalletBalances;
  busy: boolean;
  name: string;
  /** Why a locked room cannot be built yet — "build the gym first". It used to
   *  hang over every locked room in the scene at once; now it is said only
   *  about the one you tapped. */
  note: string | null;
  hint: string;
  done: string;
  closeLabel: string;
  onBuy: (spec: RoomSpec) => void;
  onClose: () => void;
}) => {
  const spec = chosen?.spec;
  const locked = chosen ? chosen.blocker !== null : false;
  const poor = spec ? wallet[spec.currency] < spec.price : false;

  // Name, price, one button. The blurb that used to sit under the name was a
  // second paragraph on top of a scene already full of labels, and the room
  // itself now stands in the scene to say what it is (the build preview).
  return (
    <div className="pointer-events-auto w-full max-w-sm rounded-[3px] bg-white/95 shadow-xl overflow-hidden">
      {spec ? (
        <div className="px-4 pt-3 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 text-[15px] font-bold text-black/85 leading-tight truncate">{name}</div>
            {!locked && <PriceTag currency={spec.currency} price={spec.price} wallet={wallet} />}
          </div>
          {locked ? (
            <div className="mt-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-black/50">
              <IoLockClosed size={12} className="shrink-0" />
              {note}
            </div>
          ) : (
            <button
              type="button"
              disabled={busy || poor}
              onClick={() => onBuy(spec)}
              className={`mt-2.5 w-full rounded-[3px] py-2.5 text-sm font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50 ${
                poor ? "bg-black/40" : "bg-gray-900"
              }`}
            >
              {done}
            </button>
          )}
        </div>
      ) : (
        <div className="px-4 py-3 text-[13px] font-semibold text-black/60 text-center">{hint}</div>
      )}
      <button
        type="button"
        onClick={onClose}
        className="flex w-full items-center justify-center gap-1 border-t border-black/10 py-2 text-[12px] font-bold text-black/45 active:bg-black/5"
      >
        <IoClose size={14} />
        {closeLabel}
      </button>
    </div>
  );
};

// ── Look drawer ─────────────────────────────────────────────────────────────

// A locked swatch says WHICH stage opens it, on the swatch itself. It used to
// be a hover tooltip, and a phone never hovers — so every locked swatch was a
// grey square with no explanation.
const Swatches = ({
  title,
  items,
  currentId,
  stage,
  busy,
  onPick,
  lockedLabel,
  stageLabel,
}: {
  title: string;
  items: SchoolSurface[];
  currentId: string | null;
  stage: number;
  busy: boolean;
  onPick: (id: string) => void;
  lockedLabel: (s: number) => string;
  stageLabel: (s: number) => string;
}) => (
  <div className="mb-4">
    <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-black/40 mb-2">{title}</h3>
    <div className="grid grid-cols-6 gap-1.5">
      {items.map((item) => {
        const locked = item.unlocksAtStage > stage;
        return (
          <button
            key={item.id}
            type="button"
            disabled={locked || busy}
            onClick={() => onPick(item.id)}
            title={locked ? lockedLabel(item.unlocksAtStage) : item.name}
            aria-label={locked ? lockedLabel(item.unlocksAtStage) : item.name}
            className={`relative aspect-square rounded-[3px] border-2 transition-transform ${
              currentId === item.id
                ? "border-gray-900 scale-105"
                : "border-black/10 active:scale-95"
            }`}
            style={{
              background: item.alt
                ? `linear-gradient(135deg, ${item.color} 50%, ${item.alt} 50%)`
                : item.color,
            }}
          >
            {locked && (
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-white/55">
                <IoLockClosed size={11} className="text-black/60" />
                <span className="text-[8px] font-bold leading-none text-black/65">
                  {stageLabel(item.unlocksAtStage)}
                </span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  </div>
);

const LayoutPicker = ({
  title,
  currentId,
  stage,
  busy,
  onPick,
  nameOf,
}: {
  title: string;
  currentId: string | null;
  stage: number;
  busy: boolean;
  onPick: (id: string) => void;
  nameOf: (id: string, fallback: string) => string;
}) => (
  <div className="mb-4">
    <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-black/40 mb-2">{title}</h3>
    <div className="grid grid-cols-2 gap-2">
      {SCHOOL_LAYOUTS.map((layout) => {
        const locked = layout.unlocksAtStage > stage;
        return (
          <button
            key={layout.id}
            type="button"
            disabled={locked || busy}
            onClick={() => onPick(layout.id)}
            className={`flex items-center justify-center gap-1.5 rounded-[3px] border-2 py-2 text-xs font-bold transition-transform active:scale-95 ${
              currentId === layout.id
                ? "border-gray-900 bg-gray-100 text-gray-900"
                : "border-black/10 text-black/60"
            } ${locked ? "opacity-40" : ""}`}
          >
            {locked && <IoLockClosed size={12} />}
            {nameOf(layout.id, layout.name)}
          </button>
        );
      })}
    </div>
  </div>
);

// ── Advisor ─────────────────────────────────────────────────────────────────
// The deputy head, bottom right. The only thing in the game that speaks TO the
// player rather than to the room — so it gets a face, and a button when there
// is something to press.
//
// Dismissable, and it stays dismissed until what it is saying changes. An
// advisor you cannot get rid of is a nag; one that never comes back is a
// feature nobody finds.

const AdvisorFace = () => (
  // Built from the same box vocabulary as the people in the scene, so the
  // person in the corner reads as somebody who works here.
  <span className="relative block h-9 w-9 shrink-0 rounded-[3px] bg-[#dfe4ec] overflow-hidden">
    <span className="absolute inset-x-1.5 top-1 h-3.5 rounded-[2px] bg-[#3b2a1e]" />
    <span className="absolute inset-x-2 top-2.5 h-3 rounded-[2px] bg-[#f2c48d]" />
    <span className="absolute inset-x-1 bottom-0 h-3.5 rounded-t-[3px] bg-[#4a6ea9]" />
  </span>
);

const AdvisorCard = ({
  advice,
  text,
  busy,
  payLabel,
  buildLabel,
  dismissLabel,
  onPay,
  onBuild,
  onDismiss,
}: {
  advice: Advice;
  /** What the advice says, in the player's language. */
  text: string;
  busy: boolean;
  payLabel: string;
  buildLabel: string;
  dismissLabel: string;
  onPay: () => void;
  onBuild: () => void;
  onDismiss: () => void;
}) => {
  const urgent = advice.kind === "payroll-due" || advice.kind === "payroll-heavy";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className="pointer-events-auto w-[min(17rem,72vw)] rounded-[3px] bg-white/95 shadow-xl overflow-hidden"
    >
      <div className="flex items-start gap-2.5 px-3 pt-3 pb-2">
        <AdvisorFace />
        <p className="text-[12px] leading-snug text-black/75 font-medium flex-1">{text}</p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="shrink-0 -mr-1 -mt-1 p-1 text-black/30 active:text-black/60"
        >
          <IoClose size={15} />
        </button>
      </div>
      {advice.action && (
        <button
          type="button"
          disabled={busy}
          onClick={advice.action === "pay" ? onPay : onBuild}
          className={`w-full py-2 text-[12px] font-bold text-white active:scale-[0.99] disabled:opacity-50 ${
            urgent ? "bg-rose-500" : "bg-gray-900"
          }`}
        >
          {advice.action === "pay" ? payLabel : buildLabel}
        </button>
      )}
    </motion.div>
  );
};

// ── Decorate sheet ──────────────────────────────────────────────────────────
// One place for every change of look, in three tabs, as a sheet along the
// bottom — so the school stays in view above it and a change can be SEEN as it
// is made. It replaces two things that had drifted apart: a palette drawer
// that covered most of the screen and only set the school's default (so any
// room with a look of its own ignored it, and tapping a swatch seemed to do
// nothing), and a separate brush mode for one room at a time.
//
//   • Whole school — every room outlined, and a pick reaches every one of
//     them, including rooms that had been given their own look.
//   • One room — tap a room, change just that one. A school of one room has
//     it picked already.
//   • Outside — the name on the sign, and the facade, roof and trim.

export type DecorTab = "school" | "room" | "outside";

const DecorateSheet = ({
  tab,
  onTab,
  base,
  room,
  look,
  stage,
  busy,
  roomName,
  overrides,
  labels,
  onSetSchool,
  onSetRoom,
  onMatch,
  onClose,
  outside,
}: {
  tab: DecorTab;
  onTab: (tab: DecorTab) => void;
  /** The school's own look, which every room without one of its own wears. */
  base: { wallpaperId: string; floorId: string; layoutId: string };
  room: SchoolRoomRect | null;
  look: RoomLook | null;
  stage: number;
  busy: boolean;
  roomName: string;
  /** How many rooms have a look of their own. */
  overrides: number;
  labels: {
    tabs: Record<DecorTab, string>;
    wallpaper: string;
    floor: string;
    layout: string;
    schoolHint: string;
    overridesLine: string;
    pickRoom: string;
    ownLook: string;
    sameLook: string;
    match: string;
    close: string;
    lockedLabel: (s: number) => string;
    stageLabel: (s: number) => string;
    layoutName: (id: string, fallback: string) => string;
  };
  onSetSchool: (patch: SchoolLookPatch) => void;
  onSetRoom: (patch: SchoolLookPatch) => void;
  onMatch: () => void;
  onClose: () => void;
  outside: ReactNode;
}) => {
  const fields = room ? customisable(room.kind, Boolean(room.outdoor)) : [];
  const swatchProps = {
    stage,
    busy,
    lockedLabel: labels.lockedLabel,
    stageLabel: labels.stageLabel,
  };

  return (
    <div className="pointer-events-auto w-full max-w-sm rounded-[3px] bg-white/95 shadow-xl overflow-hidden flex flex-col max-h-[52vh]">
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div role="tablist" className="flex rounded-[3px] bg-gray-100 p-0.5">
          {(["school", "room", "outside"] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => onTab(id)}
              className={`flex-1 rounded-[3px] px-2 py-1.5 text-xs font-bold transition-colors ${
                tab === id ? "bg-white text-gray-900 shadow-sm" : "text-black/45"
              }`}
            >
              {labels.tabs[id]}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-y-auto px-4 pb-1">
        {tab === "outside" ? (
          outside
        ) : tab === "school" ? (
          <>
            <p className="mb-3 text-[12px] leading-snug text-black/55">
              {labels.schoolHint}
              {overrides > 0 && (
                <span className="block mt-0.5 font-semibold text-black/70">{labels.overridesLine}</span>
              )}
            </p>
            <Swatches
              title={labels.wallpaper}
              items={SCHOOL_WALLPAPERS}
              currentId={base.wallpaperId}
              onPick={(id) => onSetSchool({ wallpaperId: id, everywhere: true })}
              {...swatchProps}
            />
            <Swatches
              title={labels.floor}
              items={SCHOOL_FLOORS}
              currentId={base.floorId}
              onPick={(id) => onSetSchool({ floorId: id, everywhere: true })}
              {...swatchProps}
            />
            <LayoutPicker
              title={labels.layout}
              currentId={base.layoutId}
              stage={stage}
              busy={busy}
              nameOf={labels.layoutName}
              onPick={(id) => onSetSchool({ layoutId: id, everywhere: true })}
            />
          </>
        ) : room && look ? (
          <>
            <div className="mb-3 flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-[15px] font-bold leading-tight text-black/85">{roomName}</span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  look.custom ? "bg-[#7c5cd6]/15 text-[#5b3fb0]" : "bg-gray-100 text-black/45"
                }`}
              >
                {look.custom ? labels.ownLook : labels.sameLook}
              </span>
            </div>
            {fields.includes("wallpaperId") && (
              <Swatches
                title={labels.wallpaper}
                items={SCHOOL_WALLPAPERS}
                currentId={look.wallpaper.id}
                onPick={(id) => onSetRoom({ roomId: room.id, wallpaperId: id })}
                {...swatchProps}
              />
            )}
            {fields.includes("floorId") && (
              <Swatches
                title={labels.floor}
                items={SCHOOL_FLOORS}
                currentId={look.floor.id}
                onPick={(id) => onSetRoom({ roomId: room.id, floorId: id })}
                {...swatchProps}
              />
            )}
            {fields.includes("layoutId") && (
              <LayoutPicker
                title={labels.layout}
                currentId={look.layoutId}
                stage={stage}
                busy={busy}
                nameOf={labels.layoutName}
                onPick={(id) => onSetRoom({ roomId: room.id, layoutId: id })}
              />
            )}
            {look.custom && (
              <button
                type="button"
                disabled={busy}
                onClick={onMatch}
                className="mb-3 w-full rounded-[3px] bg-gray-100 py-2 text-[12px] font-bold text-gray-900 active:scale-[0.99] disabled:opacity-50"
              >
                {labels.match}
              </button>
            )}
          </>
        ) : (
          <p className="py-3 text-center text-[13px] font-semibold text-black/60">{labels.pickRoom}</p>
        )}
      </div>

      <button
        type="button"
        onClick={onClose}
        className="flex w-full shrink-0 items-center justify-center gap-1 border-t border-black/10 py-2 text-[12px] font-bold text-black/45 active:bg-black/5"
      >
        <IoClose size={14} />
        {labels.close}
      </button>
    </div>
  );
};

// ── Page ────────────────────────────────────────────────────────────────────

const Room = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { character, characterLoading } = useCharacter();
  const { profile } = useProfile();
  const {
    school,
    wallet,
    learnedWords,
    loading,
    error,
    buyRoom,
    payPayroll,
    setLook,
    buyExterior,
    setName,
  } = useSchoolState();
  // The school clock's part of the day: night music at night, and the bell
  // when lessons start and end. Only the PART re-renders the page — the clock
  // face ticks inside its own component.
  const part = useDayPart();
  const music = useAmbientMusic(part === "night" ? "night" : "day");
  const sfx = useSchoolSfx();
  const playSfx = sfx.play;
  // What the people in the school say, in the language the page is in.
  const phrases = usePhraseBook();

  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // Which tab of the decorate sheet is open. Outside flips the scene to the
  // exterior view, so what you are changing is what you are looking at.
  const [decorTab, setDecorTab] = useState<DecorTab>("school");
  const [mode, setMode] = useState<SchoolMode>("play");
  // Which ghost is tapped. Cleared on leaving build mode, so reopening it does
  // not resume a decision the player walked away from.
  const [picked, setPicked] = useState<string | null>(null);
  // Cutaway (see inside) vs the whole building from outside.
  const [exterior, setExterior] = useState(false);
  // Set when a room actually appears in the server's answer, so the reveal
  // fires off what was recorded rather than off the tap.
  const [celebrating, setCelebrating] = useState<string | null>(null);
  // Every room the last purchase added — reception brings its forecourt —
  // so the scene can raise them all, not just the one the card names.
  const [justBuilt, setJustBuilt] = useState<string[]>([]);
  // A note from the staff that the player asked to see: the camera glides to
  // that room and whoever sent it says it again there.
  const [announce, setAnnounce] = useState<{ roomId: string; text: string; nonce: number } | null>(null);
  const lastOwned = useRef<string[] | null>(null);
  // What the advisor last said that the player waved away. Keyed on the message
  // rather than a boolean, so dismissing "wages are due" does not also silence
  // "wages are eight weeks behind".
  const [dismissed, setDismissed] = useState<string | null>(null);
  // "Find me": a new number glides the camera to the player's own desk.
  const [seekMe, setSeekMe] = useState(0);
  // The player up from their desk and walking round the school. A first try
  // at the character being yours to move, rather than a figure at a desk.
  const [walking, setWalking] = useState(false);
  // The nudge to go and make a character, for anybody who has not — until
  // they do, or wave it away.
  const [hintGone, setHintGone] = useState(() => {
    try {
      return localStorage.getItem("school.characterHint") === "gone";
    } catch {
      return false;
    }
  });

  // The bell, when lessons start and when they end.
  const lastPart = useRef(part);
  useEffect(() => {
    if (lastPart.current === part) return;
    lastPart.current = part;
    if (part === "lessons" || part === "afterSchool") playSfx("bell");
  }, [part, playSfx]);

  const wantsMe = params.get("me") === "1";
  useEffect(() => {
    if (!wantsMe || !school) return;
    setSeekMe(Date.now());
    setParams({}, { replace: true });
  }, [wantsMe, school, setParams]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(id);
  }, [toast]);

  // Buying the last room empties the offer, which used to take the build bar —
  // and with it the only way back to play mode — off the screen while the
  // top-right controls were still hidden. Leave the mode instead.
  useEffect(() => {
    if (mode !== "build" || !school) return;
    if (buildableRooms(school.variantId, school.ownedRoomIds).length) return;
    setMode("play");
    setPicked(null);
  }, [mode, school]);

  useEffect(() => {
    if (!school) return;
    const owned = school.ownedRoomIds;
    const before = lastOwned.current;
    lastOwned.current = owned;
    if (!before) return;
    // Whichever room is in the new list and was not in the old one. Comparing
    // the lists rather than their lengths means the card can name the room,
    // which is the only thing worth celebrating about a purchase.
    const added = owned.filter((id) => !before.includes(id));
    if (!added.length) return;
    setCelebrating(added[0]);
    setJustBuilt(added);
    playSfx("build");
    const id = window.setTimeout(() => {
      setCelebrating(null);
      setJustBuilt([]);
    }, 3400);
    return () => window.clearTimeout(id);
  }, [school, playSfx]);

  if (loading || characterLoading) {
    return (
      <div className="flex justify-center items-center min-h-dvh pt-14">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error || !school) {
    return (
      <div className="flex justify-center items-center min-h-dvh pt-14 px-6 text-center text-black/50">
        {error ?? t("school.loadFailed")}
      </div>
    );
  }

  const stage = stageFor(school.ownedRoomIds, school.levelFloor);
  const offer = buildableRooms(school.variantId, school.ownedRoomIds);
  // Buyable now and paid for out of a balance you actually have. Drives the
  // dot on the build button, so a player who has earned enough while they were
  // away is told so rather than having to go looking.
  const canBuildSomething = offer.some(
    ({ spec, blocker }) => blocker === null && wallet[spec.currency] >= spec.price,
  );

  // Names live in the catalog in English; the UI reads the translated copy and
  // falls back to it, so a stage or room added without a translation still
  // renders something sensible.
  const stageName = (s: { id: string; name: string }) =>
    t(`school.stages.${s.id}.name`, s.name);
  const roomName = (id: string) => t(`school.rooms.${id}.name`, roomLabel(id).name);
  const advice: Advice = adviceFor({
    weeksOwed: school.payroll?.weeksOwed ?? 0,
    due: school.payroll?.due ?? 0,
    morale: school.payroll?.morale ?? 100,
    canBuild: canBuildSomething,
    rooms: school.ownedRoomIds.length,
  });
  const adviceText = t(`school.advisor.${advice.line}`, advice.params);
  // The idle line has nothing to act on and no deadline, so it does not get to
  // occupy a corner of the screen; the advisor appears when there is something
  // to say. It also stays out of the way while you are building or decorating.
  const showAdvisor =
    mode === "play" && advice.kind !== "idle" && dismissed !== adviceText && !celebrating;

  const roomNote = (id: string) => {
    const parent = parentOf(school.variantId, id);
    return parent ? t("school.needsFirst", { name: roomName(parent) }) : null;
  };
  const roomBlurb = (id: string) => t(`school.rooms.${id}.blurb`, roomLabel(id).blurb);

  const run = async (fn: () => Promise<{ ok: boolean; message?: string }>): Promise<boolean> => {
    if (busy) return false;
    setBusy(true);
    const result = await fn();
    if (!result.ok && result.message) setToast(result.message);
    setBusy(false);
    return result.ok;
  };
  // A change of look, with the sound that says it took.
  const restyle = (fn: () => Promise<{ ok: boolean; message?: string }>, sound: "paint" | "style") =>
    run(fn).then((ok) => {
      if (ok) playSfx(sound);
    });

  const chosen = picked ? offer.find(({ spec }) => spec.id === picked) : undefined;

  // Customize mode works on rooms you HAVE, so it reads the plan rather than
  // the offer. Resolved here rather than in the sheet so the sheet stays a
  // presentation component.
  const built = roomsOwned(school.variantId, school.ownedRoomIds);
  const overrides = built.filter((r) => lookFor(r.id, school.presets ?? {}, school).custom).length;
  const focused: SchoolRoomRect | null =
    (picked ? built.find((r) => r.id === picked) : undefined) ?? null;
  const focusedLook: RoomLook | null = focused
    ? lookFor(focused.id, school.presets ?? {}, school)
    : null;

  const handleBuy = (spec: RoomSpec) => {
    if (wallet[spec.currency] < spec.price) {
      setToast(t("school.notEnough"));
      return;
    }
    setPicked(null);
    run(() => buyRoom(spec.id));
  };

  // Both build and customize are played from above with the roof off: the
  // exterior view puts it back over the very ghosts and room picks you are
  // being asked to tap.
  const enterMode = (next: SchoolMode) => {
    setExterior(false);
    setWalking(false);
    setPicked(null);
    setDecorTab("school");
    setMode(next);
  };

  const openTab = (tab: DecorTab) => {
    setDecorTab(tab);
    setExterior(tab === "outside");
    // A school of one room has nothing to choose between.
    setPicked(tab === "room" && built.length === 1 ? built[0].id : null);
  };

  // In the decorate sheet, tapping a room while "whole school" is open is
  // plainly a wish to change THAT room.
  const pickRoom = (roomId: string) => {
    if (mode === "customize" && decorTab !== "room") setDecorTab("room");
    setPicked(roomId);
  };

  const leaveMode = () => {
    setMode("play");
    setPicked(null);
  };

  // After dark the player has gone home with everybody else (castFor), so
  // there is nobody to find — say so rather than glide to an empty desk.
  const findMe = () => {
    // Out walking, the player is wherever they walked to, at any hour.
    if (walking) {
      setSeekMe(Date.now());
      return;
    }
    if (part === "evening" || part === "night") {
      setToast(t("school.findMe.home"));
      return;
    }
    setExterior(false);
    setSeekMe(Date.now());
  };

  const toggleWalk = () => {
    const next = !walking;
    setWalking(next);
    if (next) {
      setExterior(false);
      setToast(t("school.walk.hint"));
    }
  };

  const dropHint = () => {
    setHintGone(true);
    try {
      localStorage.setItem("school.characterHint", "gone");
    } catch {
      // Gone for this visit, then.
    }
  };

  // Clearing every field this room kind could have set is what "reset" means:
  // the room falls back to the school's own look, and the preset disappears.
  const resetRoom = () => {
    if (!focused) return;
    const patch: SchoolLookPatch = { roomId: focused.id };
    for (const field of customisable(focused.kind, Boolean(focused.outdoor))) {
      patch[field] = null;
    }
    restyle(() => setLook(patch), "paint");
  };

  return (
    <div className="fixed inset-x-0 top-13 bottom-0 overflow-hidden bg-[#d8ebf6]">
      <Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
          </div>
        }
      >
        <SchoolCanvas
          className="w-full h-full"
          school={school}
          character={character}
          learnedWords={learnedWords}
          phrases={phrases}
          interactive
          exterior={exterior}
          mode={mode}
          wallet={wallet}
          selectedRoomId={picked}
          onPickRoom={pickRoom}
          pickScope={decorTab === "school" ? "all" : decorTab === "room" ? "one" : "none"}
          onPersonTap={sfx.voice}
          roomName={roomName}
          justBuilt={justBuilt}
          announce={announce}
          schoolName={school.name ?? t("school.exterior.defaultName")}
          playerName={profile?.nickname || t("school.findMe.you")}
          seekMe={seekMe}
          walking={walking}
        />
      </Suspense>

      {/* ── Stage badge, and the school clock under it ─────────────────── */}
      <div className="absolute left-3 top-3 z-30 pointer-events-none flex flex-col items-start gap-2">
        <div className="bg-white/90 rounded-full pl-3 pr-3.5 py-1.5 shadow-sm">
          <div className="text-[13px] font-bold text-black/80 leading-tight">{stageName(stage)}</div>
          <div className="text-[10px] font-semibold text-black/40 leading-tight">
            {t("school.roomsOf", {
              current: school.ownedRoomIds.length,
              // The whole campus, not owned-plus-offered: a room that comes
              // bundled with another is never offered on its own, and would
              // go missing from the total until its host was bought.
              total: getVariant(school.variantId).rooms.length,
            })}
          </div>
        </div>
        <ClockBadge />
        <WalletBadge wallet={wallet} />
        {/* Never made a character: the one at the front desk is a stranger
            wearing the default. Point at where to change that. */}
        {character && !character.look && !hintGone && mode === "play" && (
          <div className="pointer-events-auto flex items-stretch rounded-[3px] bg-white/95 shadow-xl overflow-hidden max-w-[15rem]">
            <button
              type="button"
              onClick={() => navigate("/dashboard#character")}
              className="flex items-center gap-2 pl-3 pr-2 py-2 text-left active:bg-black/5"
            >
              <IoShirtOutline size={18} className="shrink-0 text-black/70" />
              <span className="text-[12px] font-semibold leading-snug text-black/75">
                {t("school.findMe.makeCharacter")}
              </span>
            </button>
            <button
              type="button"
              onClick={dropHint}
              aria-label={t("school.look.close")}
              className="px-2 text-black/30 active:text-black/60"
            >
              <IoClose size={15} />
            </button>
          </div>
        )}
      </div>

      {/* ── View toggle + look drawer trigger ──────────────────────────
          Both hidden while building. The exterior view puts a roof over the
          ghosts, and redecorating is a different question from deciding what to
          build next — leaving them there just gives two ways to lose the thing
          you were looking at. */}
      <div className="absolute right-3 top-3 z-30 flex flex-col gap-2">
        {/* Music first and outside the fading group: it is the one control
            that means the same thing in every mode, and hunting for it while
            the build bar is open would be silly. */}
        <button
          type="button"
          data-music-toggle
          onClick={music.toggle}
          aria-pressed={music.playing}
          aria-label={t(music.playing ? "school.music.off" : "school.music.on")}
          title={t(music.playing ? "school.music.off" : "school.music.on")}
          className={`h-11 w-11 rounded-full shadow-sm flex items-center justify-center active:scale-95 transition-transform ${
            music.playing ? "bg-gray-900 text-white" : "bg-white/90 text-black/60"
          }`}
        >
          <IoMusicalNotesOutline size={21} />
        </button>
        {/* Sound effects: their own switch, so the music can be off and the
            knocks and voices still on, or the other way round. */}
        <button
          type="button"
          onClick={sfx.toggle}
          aria-pressed={sfx.enabled}
          aria-label={t(sfx.enabled ? "school.sfx.off" : "school.sfx.on")}
          title={t(sfx.enabled ? "school.sfx.off" : "school.sfx.on")}
          className={`h-11 w-11 rounded-full shadow-sm flex items-center justify-center active:scale-95 transition-transform ${
            sfx.enabled ? "bg-gray-900 text-white" : "bg-white/90 text-black/60"
          }`}
        >
          {sfx.enabled ? <IoVolumeHighOutline size={21} /> : <IoVolumeMuteOutline size={21} />}
        </button>
        <div
          className={`flex flex-col gap-2 transition-opacity ${
            mode === "play" ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          {/* Walk: the player's character gets up and goes where you tap. */}
          <button
            type="button"
            onClick={toggleWalk}
            aria-pressed={walking}
            aria-label={t(walking ? "school.walk.stop" : "school.walk.start")}
            title={t(walking ? "school.walk.stop" : "school.walk.start")}
            className={`h-11 w-11 rounded-full shadow-sm flex items-center justify-center active:scale-95 transition-transform ${
              walking ? "bg-gray-900 text-white" : "bg-white/90 text-black/60"
            }`}
          >
            <IoWalkOutline size={21} />
          </button>
          <button
            type="button"
            onClick={findMe}
            aria-label={t("school.findMe.button")}
            title={t("school.findMe.button")}
            className="h-11 w-11 rounded-full bg-white/90 shadow-sm flex items-center justify-center text-black/60 active:scale-95 transition-transform"
          >
            <IoLocateOutline size={21} />
          </button>
          <button
            type="button"
            onClick={() => {
              // From outside there is no floor to walk on.
              if (!exterior) setWalking(false);
              setExterior((v) => !v);
            }}
            aria-label={t(exterior ? "school.view.inside" : "school.view.outside")}
            title={t(exterior ? "school.view.inside" : "school.view.outside")}
            className={`h-11 w-11 rounded-full shadow-sm flex items-center justify-center active:scale-95 transition-transform ${
              exterior ? "bg-gray-900 text-white" : "bg-white/90 text-black/60"
            }`}
          >
            {exterior ? <IoLayersOutline size={21} /> : <IoBusinessOutline size={21} />}
          </button>
          {/* Decorate: the whole school, one room, or the outside, as three
              tabs of one sheet. Whole school is the tab it opens on, so the
              first swatch you tap changes everything — you do not have to
              pick a room before you can change anything at all. */}
          <button
            type="button"
            onClick={() => enterMode("customize")}
            aria-label={t("school.decorate.open")}
            title={t("school.decorate.open")}
            className="h-11 w-11 rounded-full bg-white/90 shadow-sm flex items-center justify-center text-black/60 active:scale-95 transition-transform"
          >
            <IoBrushOutline size={21} />
          </button>
        </div>
      </div>

      {/* ── Build ────────────────────────────────────────────────────── */}
      <div className="absolute inset-x-0 bottom-5 z-30 flex justify-center px-4 pointer-events-none">
        {/* Mode first, then the state of the offer. The other way round, a
            finished school ate the customize sheet — the one screen that is
            MORE useful once there is nothing left to build. */}
        {mode === "customize" ? (
          <DecorateSheet
            tab={decorTab}
            onTab={openTab}
            base={school}
            room={focused}
            look={focusedLook}
            stage={stage.index}
            busy={busy}
            roomName={picked ? roomName(picked) : ""}
            overrides={overrides}
            labels={{
              tabs: {
                school: t("school.decorate.tabs.school"),
                room: t("school.decorate.tabs.room"),
                outside: t("school.decorate.tabs.outside"),
              },
              wallpaper: t("school.look.wallpaper"),
              floor: t("school.look.floor"),
              layout: t("school.look.layout"),
              schoolHint: t("school.decorate.schoolHint"),
              overridesLine: t("school.decorate.overrides", { count: overrides }),
              pickRoom: t("school.decorate.pickRoom"),
              ownLook: t("school.decorate.ownLook"),
              sameLook: t("school.decorate.sameLook"),
              match: t("school.decorate.match"),
              close: t("school.buildClose"),
              lockedLabel: (s) => t("school.look.lockedUntil", { stage: s + 1 }),
              stageLabel: (s) => t("school.decorate.stage", { n: s + 1 }),
              layoutName: (id, fallback) => t(`school.layouts.${id}`, fallback),
            }}
            onSetSchool={(patch) => restyle(() => setLook(patch), "paint")}
            onSetRoom={(patch) => restyle(() => setLook(patch), "paint")}
            onMatch={resetRoom}
            onClose={leaveMode}
            outside={
              <OutsidePanel
                exterior={school.exterior}
                name={school.name}
                wallet={wallet}
                busy={busy}
                onWear={(slot, id) => restyle(() => setLook({ [`${slot}Id`]: id }), "style")}
                onBuy={(id) => restyle(() => buyExterior(id), "style")}
                onName={(name) => run(() => setName(name))}
              />
            }
          />
        ) : mode === "build" ? (
          <BuildBar
            chosen={chosen}
            wallet={wallet}
            busy={busy}
            name={picked ? roomName(picked) : ""}
            note={picked ? roomNote(picked) : null}
            hint={t("school.buildPick")}
            done={t("school.buildDone")}
            closeLabel={t("school.buildClose")}
            onBuy={handleBuy}
            onClose={leaveMode}
          />
        ) : !offer.length ? // A finished school says nothing down here. The pill that used to
          // announce it sat over the scene for good once the last room was
          // bought, covering the part of the campus nearest the camera.
          null : (
          <button
            type="button"
            onClick={() => enterMode("build")}
            disabled={busy}
            className={`pointer-events-auto relative flex items-center gap-2 rounded-[3px] px-6 py-3.5 shadow-xl transition-transform active:scale-95 disabled:opacity-60 ${
              canBuildSomething
                ? "bg-gray-900 shadow-gray-900/30"
                : "bg-black/65 shadow-black/20"
            }`}
          >
            <IoHammerOutline size={19} className="text-white" />
            <span className="text-[15px] font-bold text-white leading-tight">
              {t("school.buildOpen")}
            </span>
            {/* Something is affordable right now. The only unprompted nudge in
                the game, and it costs no words in any language. */}
            {canBuildSomething && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-amber-400 ring-2 ring-white/80" />
            )}
          </button>
        )}
      </div>

      {/* ── Advisor, and notes from the rest of the staff ─────────────── */}
      <div className="absolute right-3 bottom-24 z-30 flex justify-end pointer-events-none">
        <TeacherNotes
          // Never over the advisor, a decision in progress or a new room.
          blocked={mode !== "play" || showAdvisor || celebrating !== null}
          context={{
            owned: school.ownedRoomIds,
            learnedWords,
            hour: schoolNow().hour,
            season: seasonFor(new Date()),
            canBuild: canBuildSomething,
          }}
          roomName={roomName}
          onShow={(roomId, text) => {
            // Bubbles are hidden from outside, so seeing who said it means
            // going back in.
            setExterior(false);
            setAnnounce({ roomId, text, nonce: Date.now() });
          }}
        />
        <AnimatePresence>
          {showAdvisor && (
            <AdvisorCard
              advice={advice}
              text={adviceText}
              busy={busy}
              payLabel={t("school.payroll.pay", { amount: school.payroll?.due ?? 0 })}
              buildLabel={t("school.buildOpen")}
              dismissLabel={t("school.look.close")}
              onPay={() => run(payPayroll)}
              onBuild={() => enterMode("build")}
              onDismiss={() => setDismissed(adviceText)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ── Stage-up reveal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {celebrating !== null && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            className="absolute inset-x-0 top-1/3 flex justify-center px-6 pointer-events-none"
          >
            <div className="bg-white/95 rounded-[3px] px-6 py-4 shadow-xl text-center max-w-xs">
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-gray-500 mb-1">
                {t("school.built")}
              </div>
              <div className="text-lg font-bold text-black/85">{roomName(celebrating)}</div>
              <div className="text-xs text-black/50 mt-1">{roomBlurb(celebrating)}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {toast && (
        <div className="absolute bottom-28 inset-x-0 flex justify-center px-4 pointer-events-none z-50">
          <div className="bg-black/85 text-white text-sm rounded-[3px] px-4 py-2 shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
};

export default Room;
