// pages/Room.tsx — the Dream School.
//
// The route and filename stay "Room" so the navbar icon, App.tsx's lazy import
// and every existing link keep working; only what it renders changed.
//
// One fullscreen view on every breakpoint. There is no desktop sidebar and no
// mobile sheet-per-room: the game is the school, and the control surface is a
// build sheet plus a drawer of swatches. Everything else — panning, zooming,
// poking a student — happens in the scene itself.
//
// Build mode puts the rooms you could buy INTO the scene, standing where they
// would stand, rather than in a list. "Where does that go, and what does it do
// to what I already have" is the question a list cannot answer — so the answer
// is geometry, and the only chrome is a confirm card for whichever ghost you
// tapped.
//
// See docs/room-game-concept.md.

import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  IoBrushOutline,
  IoColorPaletteOutline,
  IoClose,
  IoHammerOutline,
  IoLockClosed,
  IoSparkles,
  IoBusinessOutline,
  IoLayersOutline,
} from "react-icons/io5";
import { SchoolMode } from "../modules/school/SchoolCanvas";
import { Advice, adviceFor } from "../modules/school/advisor";
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
  lookFor,
  parentOf,
  roomLabel,
  roomsOwned,
  stageFor,
} from "../config/schoolCatalog";
import { useSchoolState } from "../modules/school/useSchoolState";
import { useCharacter } from "../context/CharacterContext";
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
  blurb,
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
  blurb: string;
  hint: string;
  done: string;
  closeLabel: string;
  onBuy: (spec: RoomSpec) => void;
  onClose: () => void;
}) => {
  const spec = chosen?.spec;
  const poor = spec ? wallet[spec.currency] < spec.price : false;

  return (
    <div className="pointer-events-auto w-full max-w-sm rounded-2xl bg-white/95 backdrop-blur shadow-2xl overflow-hidden">
      {spec ? (
        <div className="px-4 pt-3 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[15px] font-bold text-black/85 leading-tight">{name}</div>
              <div className="text-[11px] text-black/50 leading-snug mt-0.5">{blurb}</div>
            </div>
            <PriceTag currency={spec.currency} price={spec.price} wallet={wallet} />
          </div>
          <button
            type="button"
            disabled={busy || poor}
            onClick={() => onBuy(spec)}
            className={`mt-2.5 w-full rounded-xl py-2.5 text-sm font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50 ${
              poor ? "bg-black/40" : "bg-violet-600"
            }`}
          >
            {done}
          </button>
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

const Swatches = ({
  title,
  items,
  currentId,
  stage,
  onPick,
  lockedLabel,
}: {
  title: string;
  items: SchoolSurface[];
  currentId: string;
  stage: number;
  onPick: (id: string) => void;
  lockedLabel: (s: number) => string;
}) => (
  <div className="mb-5">
    <h3 className="text-[11px] font-bold uppercase tracking-wide text-black/40 mb-2">{title}</h3>
    <div className="grid grid-cols-4 gap-2">
      {items.map((item) => {
        const locked = item.unlocksAtStage > stage;
        return (
          <button
            key={item.id}
            type="button"
            disabled={locked}
            onClick={() => onPick(item.id)}
            title={locked ? lockedLabel(item.unlocksAtStage) : item.name}
            className={`relative aspect-square rounded-xl border-2 transition-transform ${
              currentId === item.id
                ? "border-violet-500 scale-105"
                : "border-black/10 active:scale-95"
            } ${locked ? "opacity-40" : ""}`}
            style={{
              background: item.alt
                ? `linear-gradient(135deg, ${item.color} 50%, ${item.alt} 50%)`
                : item.color,
            }}
          >
            {locked && (
              <IoLockClosed
                size={14}
                className="absolute inset-0 m-auto text-black/60 drop-shadow"
              />
            )}
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
  <span className="relative block h-9 w-9 shrink-0 rounded-lg bg-[#dfe4ec] overflow-hidden">
    <span className="absolute inset-x-1.5 top-1 h-3.5 rounded-sm bg-[#3b2a1e]" />
    <span className="absolute inset-x-2 top-2.5 h-3 rounded-sm bg-[#f2c48d]" />
    <span className="absolute inset-x-1 bottom-0 h-3.5 rounded-t-md bg-[#4a6ea9]" />
  </span>
);

const AdvisorCard = ({
  advice,
  busy,
  payLabel,
  buildLabel,
  dismissLabel,
  onPay,
  onBuild,
  onDismiss,
}: {
  advice: Advice;
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
      className="pointer-events-auto w-[min(17rem,72vw)] rounded-2xl bg-white/95 backdrop-blur shadow-xl overflow-hidden"
    >
      <div className="flex items-start gap-2.5 px-3 pt-3 pb-2">
        <AdvisorFace />
        <p className="text-[12px] leading-snug text-black/75 font-medium flex-1">{advice.text}</p>
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
            urgent ? "bg-rose-500" : "bg-violet-600"
          }`}
        >
          {advice.action === "pay" ? payLabel : buildLabel}
        </button>
      )}
    </motion.div>
  );
};

// ── Customize sheet ─────────────────────────────────────────────────────────
// The bottom sheet for whichever room you tapped. Only the swatches that room
// can actually use: a desk layout means nothing outside a classroom, and an
// outdoor room has grass rather than flooring. Offering a control that visibly
// does nothing is worse than not offering it.

const CustomizeSheet = ({
  room,
  look,
  level,
  busy,
  name,
  hint,
  closeLabel,
  resetLabel,
  lockedLabel,
  titles,
  onSet,
  onReset,
  onClose,
}: {
  room: SchoolRoomRect | null;
  look: RoomLook | null;
  level: number;
  busy: boolean;
  name: string;
  hint: string;
  closeLabel: string;
  resetLabel: string;
  lockedLabel: (s: number) => string;
  titles: { wallpaper: string; floor: string; layout: string };
  onSet: (patch: SchoolLookPatch) => void;
  onReset: () => void;
  onClose: () => void;
}) => {
  const fields = room ? customisable(room.kind, Boolean(room.outdoor)) : [];

  return (
    <div className="pointer-events-auto w-full max-w-sm rounded-2xl bg-white/95 backdrop-blur shadow-2xl overflow-hidden">
      {room && look ? (
        <div className="px-4 pt-3 pb-1 max-h-[46vh] overflow-y-auto">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[15px] font-bold text-black/85 leading-tight">{name}</span>
            {look.custom && (
              <button
                type="button"
                disabled={busy}
                onClick={onReset}
                className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold text-violet-700 bg-violet-50 active:scale-95 disabled:opacity-50"
              >
                {resetLabel}
              </button>
            )}
          </div>

          {fields.includes("wallpaperId") && (
            <Swatches
              title={titles.wallpaper}
              items={SCHOOL_WALLPAPERS}
              currentId={look.wallpaper.id}
              stage={level}
              lockedLabel={lockedLabel}
              onPick={(id) => onSet({ roomId: room.id, wallpaperId: id })}
            />
          )}
          {fields.includes("floorId") && (
            <Swatches
              title={titles.floor}
              items={SCHOOL_FLOORS}
              currentId={look.floor.id}
              stage={level}
              lockedLabel={lockedLabel}
              onPick={(id) => onSet({ roomId: room.id, floorId: id })}
            />
          )}
          {fields.includes("layoutId") && (
            <div className="mb-4">
              <h3 className="text-[11px] font-bold uppercase tracking-wide text-black/40 mb-2">
                {titles.layout}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {SCHOOL_LAYOUTS.map((layout) => {
                  const locked = layout.unlocksAtStage > level;
                  return (
                    <button
                      key={layout.id}
                      type="button"
                      disabled={locked || busy}
                      onClick={() => onSet({ roomId: room.id, layoutId: layout.id })}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border-2 py-2 text-xs font-bold transition-transform active:scale-95 ${
                        look.layoutId === layout.id
                          ? "border-violet-500 bg-violet-50 text-violet-700"
                          : "border-black/10 text-black/60"
                      } ${locked ? "opacity-40" : ""}`}
                    >
                      {locked && <IoLockClosed size={12} />}
                      {layout.name}
                    </button>
                  );
                })}
              </div>
            </div>
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

// ── Page ────────────────────────────────────────────────────────────────────

const Room = () => {
  const { t } = useTranslation();
  const { character, characterLoading } = useCharacter();
  const { school, wallet, learnedWords, loading, error, buyRoom, payPayroll, setLook } =
    useSchoolState();

  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mode, setMode] = useState<SchoolMode>("play");
  // Which ghost is tapped. Cleared on leaving build mode, so reopening it does
  // not resume a decision the player walked away from.
  const [picked, setPicked] = useState<string | null>(null);
  // Cutaway (see inside) vs the whole building from outside.
  const [exterior, setExterior] = useState(false);
  // Set when a room actually appears in the server's answer, so the reveal
  // fires off what was recorded rather than off the tap.
  const [celebrating, setCelebrating] = useState<string | null>(null);
  const lastOwned = useRef<string[] | null>(null);
  // What the advisor last said that the player waved away. Keyed on the message
  // rather than a boolean, so dismissing "wages are due" does not also silence
  // "wages are eight weeks behind".
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!school) return;
    const owned = school.ownedRoomIds;
    const before = lastOwned.current;
    lastOwned.current = owned;
    if (!before) return;
    // Whichever room is in the new list and was not in the old one. Comparing
    // the lists rather than their lengths means the card can name the room,
    // which is the only thing worth celebrating about a purchase.
    const added = owned.find((id) => !before.includes(id));
    if (!added) return;
    setCelebrating(added);
    const id = window.setTimeout(() => setCelebrating(null), 3400);
    return () => window.clearTimeout(id);
  }, [school]);

  if (loading || characterLoading) {
    return (
      <div className="flex justify-center items-center min-h-dvh pt-14">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-violet-500" />
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
  // The idle line has nothing to act on and no deadline, so it does not get to
  // occupy a corner of the screen; the advisor appears when there is something
  // to say. It also stays out of the way while you are building or decorating.
  const showAdvisor =
    mode === "play" && advice.kind !== "idle" && dismissed !== advice.text && !celebrating;

  const roomNote = (id: string) => {
    const parent = parentOf(school.variantId, id);
    return parent ? t("school.needsFirst", { name: roomName(parent) }) : null;
  };
  const roomBlurb = (id: string) => t(`school.rooms.${id}.blurb`, roomLabel(id).blurb);

  const run = async (fn: () => Promise<{ ok: boolean; message?: string }>) => {
    if (busy) return;
    setBusy(true);
    const result = await fn();
    if (!result.ok && result.message) setToast(result.message);
    setBusy(false);
  };

  const chosen = picked ? offer.find(({ spec }) => spec.id === picked) : undefined;

  // Customize mode works on rooms you HAVE, so it reads the plan rather than
  // the offer. Resolved here rather than in the sheet so the sheet stays a
  // presentation component.
  const built = roomsOwned(school.variantId, school.ownedRoomIds);
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

  const leaveMode = () => {
    setMode("play");
    setPicked(null);
  };

  // Clearing every field this room kind could have set is what "reset" means:
  // the room falls back to the school's own look, and the preset disappears.
  const resetRoom = () => {
    if (!focused) return;
    const patch: SchoolLookPatch = { roomId: focused.id };
    for (const field of customisable(focused.kind, Boolean(focused.outdoor))) {
      patch[field] = null;
    }
    run(() => setLook(patch));
  };

  return (
    <div className="fixed inset-x-0 top-13 bottom-0 overflow-hidden bg-[#d8ebf6]">
      <Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500" />
          </div>
        }
      >
        <SchoolCanvas
          className="w-full h-full"
          school={school}
          character={character}
          learnedWords={learnedWords}
          interactive
          exterior={exterior}
          mode={mode}
          wallet={wallet}
          selectedRoomId={picked}
          onPickRoom={setPicked}
          roomName={roomName}
          roomNote={roomNote}
        />
      </Suspense>

      {/* ── Stage badge ──────────────────────────────────────────────── */}
      <div className="absolute left-3 top-3 pointer-events-none">
        <div className="bg-white/90 backdrop-blur rounded-full pl-3 pr-3.5 py-1.5 shadow-sm">
          <div className="text-[13px] font-bold text-black/80 leading-tight">{stageName(stage)}</div>
          <div className="text-[10px] font-semibold text-black/40 leading-tight">
            {t("school.roomsOf", {
              current: school.ownedRoomIds.length,
              total: school.ownedRoomIds.length + offer.length,
            })}
          </div>
        </div>
      </div>

      {/* ── View toggle + look drawer trigger ──────────────────────────
          Both hidden while building. The exterior view puts a roof over the
          ghosts, and redecorating is a different question from deciding what to
          build next — leaving them there just gives two ways to lose the thing
          you were looking at. */}
      <div
        className={`absolute right-3 top-3 flex flex-col gap-2 transition-opacity ${
          mode === "play" ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <button
          type="button"
          onClick={() => setExterior((v) => !v)}
          aria-label={t(exterior ? "school.view.inside" : "school.view.outside")}
          title={t(exterior ? "school.view.inside" : "school.view.outside")}
          className={`h-11 w-11 rounded-full backdrop-blur shadow-sm flex items-center justify-center active:scale-95 transition-transform ${
            exterior ? "bg-violet-600 text-white" : "bg-white/90 text-black/60"
          }`}
        >
          {exterior ? <IoLayersOutline size={21} /> : <IoBusinessOutline size={21} />}
        </button>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label={t("school.look.open")}
          title={t("school.look.open")}
          className="h-11 w-11 rounded-full bg-white/90 backdrop-blur shadow-sm flex items-center justify-center text-black/60 active:scale-95 transition-transform"
        >
          <IoColorPaletteOutline size={21} />
        </button>
        {/* Customize one room, as against the palette above, which sets the
            default every room falls back to. Two buttons because they are two
            different questions — "what does this school look like" and "what
            does THIS room look like" — and folding them together would mean
            picking a room before you could change anything at all. */}
        <button
          type="button"
          onClick={() => {
            setMode("customize");
            setPicked(null);
          }}
          aria-label={t("school.customizeOpen")}
          title={t("school.customizeOpen")}
          className="h-11 w-11 rounded-full bg-white/90 backdrop-blur shadow-sm flex items-center justify-center text-black/60 active:scale-95 transition-transform"
        >
          <IoBrushOutline size={21} />
        </button>
      </div>

      {/* ── Build ────────────────────────────────────────────────────── */}
      <div className="absolute inset-x-0 bottom-5 flex justify-center px-4 pointer-events-none">
        {!offer.length ? (
          <div className="pointer-events-none flex items-center gap-2 rounded-2xl bg-white/90 backdrop-blur px-5 py-3 shadow-lg">
            <IoSparkles size={18} className="text-amber-500" />
            <span className="text-sm font-bold text-black/70">{t("school.complete")}</span>
          </div>
        ) : mode === "customize" ? (
          <CustomizeSheet
            room={focused}
            look={focusedLook}
            level={stage.index}
            busy={busy}
            name={picked ? roomName(picked) : ""}
            hint={t("school.customizePick")}
            closeLabel={t("school.buildClose")}
            resetLabel={t("school.customizeReset")}
            lockedLabel={(s) => t("school.look.lockedUntil", { stage: s + 1 })}
            titles={{
              wallpaper: t("school.look.wallpaper"),
              floor: t("school.look.floor"),
              layout: t("school.look.layout"),
            }}
            onSet={(patch) => run(() => setLook(patch))}
            onReset={resetRoom}
            onClose={leaveMode}
          />
        ) : mode === "build" ? (
          <BuildBar
            chosen={chosen}
            wallet={wallet}
            busy={busy}
            name={picked ? roomName(picked) : ""}
            blurb={picked ? roomBlurb(picked) : ""}
            hint={t("school.buildPick")}
            done={t("school.buildDone")}
            closeLabel={t("school.buildClose")}
            onBuy={handleBuy}
            onClose={leaveMode}
          />
        ) : (
          <button
            type="button"
            onClick={() => setMode("build")}
            disabled={busy}
            className={`pointer-events-auto relative flex items-center gap-2 rounded-2xl px-6 py-3.5 shadow-xl transition-transform active:scale-95 disabled:opacity-60 ${
              canBuildSomething
                ? "bg-violet-600 shadow-violet-900/30"
                : "bg-black/55 backdrop-blur shadow-black/20"
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

      {/* ── Advisor ──────────────────────────────────────────────────── */}
      <div className="absolute right-3 bottom-24 flex justify-end pointer-events-none">
        <AnimatePresence>
          {showAdvisor && (
            <AdvisorCard
              advice={advice}
              busy={busy}
              payLabel={t("school.payroll.pay", { amount: school.payroll?.due ?? 0 })}
              buildLabel={t("school.buildOpen")}
              dismissLabel={t("school.look.close")}
              onPay={() => run(payPayroll)}
              onBuild={() => setMode("build")}
              onDismiss={() => setDismissed(advice.text)}
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
            <div className="bg-white/95 backdrop-blur rounded-2xl px-6 py-4 shadow-2xl text-center max-w-xs">
              <div className="text-[11px] font-bold uppercase tracking-wide text-violet-500 mb-1">
                {t("school.unlocked")}
              </div>
              <div className="text-lg font-bold text-black/85">{roomName(celebrating)}</div>
              <div className="text-xs text-black/50 mt-1">{roomBlurb(celebrating)}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Look drawer ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.button
              type="button"
              aria-label={t("school.look.close")}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-black/30 z-30"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="absolute right-0 top-0 bottom-0 w-[min(20rem,85vw)] bg-white shadow-2xl z-40 flex flex-col"
            >
              <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
                <h2 className="text-sm font-bold text-black/80">{t("school.look.title")}</h2>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label={t("school.look.close")}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <IoClose size={22} />
                </button>
              </div>

              <div className="overflow-y-auto px-4 pb-6">
                <Swatches
                  title={t("school.look.wallpaper")}
                  items={SCHOOL_WALLPAPERS}
                  currentId={school.wallpaperId}
                  stage={stage.index}
                  lockedLabel={(s) => t("school.look.lockedUntil", { stage: s + 1 })}
                  onPick={(id) => run(() => setLook({ wallpaperId: id }))}
                />
                <Swatches
                  title={t("school.look.floor")}
                  items={SCHOOL_FLOORS}
                  currentId={school.floorId}
                  stage={stage.index}
                  lockedLabel={(s) => t("school.look.lockedUntil", { stage: s + 1 })}
                  onPick={(id) => run(() => setLook({ floorId: id }))}
                />

                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-wide text-black/40 mb-2">
                    {t("school.look.layout")}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {SCHOOL_LAYOUTS.map((layout) => {
                      const locked = layout.unlocksAtStage > stage.index;
                      return (
                        <button
                          key={layout.id}
                          type="button"
                          disabled={locked}
                          onClick={() => run(() => setLook({ layoutId: layout.id }))}
                          className={`flex items-center justify-center gap-1.5 rounded-xl border-2 py-2.5 text-xs font-bold transition-transform active:scale-95 ${
                            school.layoutId === layout.id
                              ? "border-violet-500 bg-violet-50 text-violet-700"
                              : "border-black/10 text-black/60"
                          } ${locked ? "opacity-40" : ""}`}
                        >
                          {locked && <IoLockClosed size={12} />}
                          {t(`school.layouts.${layout.id}`, layout.name)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <p className="text-[11px] text-black/35 mt-5 leading-relaxed">
                  {t("school.look.hint")}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {toast && (
        <div className="absolute bottom-28 inset-x-0 flex justify-center px-4 pointer-events-none z-50">
          <div className="bg-black/85 text-white text-sm rounded-full px-4 py-2 shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
};

export default Room;
