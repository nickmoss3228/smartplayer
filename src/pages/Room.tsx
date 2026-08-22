// pages/Room.tsx — the Dream School.
//
// The route and filename stay "Room" so the navbar icon, App.tsx's lazy import
// and every existing link keep working; only what it renders changed.
//
// One fullscreen view on every breakpoint. There is no desktop sidebar and no
// mobile sheet-per-room, because there is nothing to put in them: the game is
// the room, and the entire control surface is one button plus a drawer of
// swatches. Everything else — panning, zooming, poking a student — happens in
// the scene itself.
//
// See docs/room-game-concept.md.

import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  IoColorPaletteOutline,
  IoClose,
  IoLockClosed,
  IoSparkles,
  IoBusinessOutline,
  IoLayersOutline,
} from "react-icons/io5";
import { CURRENCIES } from "../config/currencies";
import {
  MAX_STAGE,
  SCHOOL_FLOORS,
  SCHOOL_LAYOUTS,
  SCHOOL_WALLPAPERS,
  SchoolSurface,
  StageCost,
  getNextStage,
  getStage,
} from "../config/schoolCatalog";
import { useSchoolState } from "../modules/school/useSchoolState";
import { useCharacter } from "../context/CharacterContext";
import { WalletBalances } from "../services/schoolServices";

// three.js and the whole scene are ~500kB that only this page needs, and even
// here only after the school itself has loaded.
const SchoolCanvas = lazy(() =>
  import("../modules/school/SchoolCanvas").then((m) => ({ default: m.SchoolCanvas })),
);

const canAfford = (wallet: WalletBalances, cost: StageCost) =>
  wallet.bitAward >= cost.bitAward &&
  wallet.bitWord >= cost.bitWord &&
  wallet.bitPhrase >= cost.bitPhrase;

// ── Price row ───────────────────────────────────────────────────────────────
// All three currencies, with the ones you are short of marked. Reading a
// deficit off the button is the difference between "save up" and "why is this
// greyed out".

const PriceRow = ({ cost, wallet }: { cost: StageCost; wallet: WalletBalances }) => (
  <span className="flex items-center gap-2.5">
    {CURRENCIES.map(({ key, icon: Icon }) => {
      const short = wallet[key] < cost[key];
      return (
        <span
          key={key}
          className={`inline-flex items-center gap-1 text-[13px] font-bold tabular-nums ${
            short ? "text-rose-300" : "text-white/90"
          }`}
        >
          <Icon size={13} />
          {cost[key]}
        </span>
      );
    })}
  </span>
);

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

// ── Page ────────────────────────────────────────────────────────────────────

const Room = () => {
  const { t } = useTranslation();
  const { character, characterLoading } = useCharacter();
  const { school, wallet, learnedWords, loading, error, upgrade, setLook } = useSchoolState();

  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Cutaway (see inside) vs the whole building from outside.
  const [exterior, setExterior] = useState(false);
  // Set when the stage actually advances, so the reveal fires off the server's
  // answer rather than off the click.
  const [celebrating, setCelebrating] = useState<number | null>(null);
  const lastStage = useRef<number | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!school) return;
    if (lastStage.current !== null && school.stage > lastStage.current) {
      setCelebrating(school.stage);
      const id = window.setTimeout(() => setCelebrating(null), 3400);
      lastStage.current = school.stage;
      return () => window.clearTimeout(id);
    }
    lastStage.current = school.stage;
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

  const stage = getStage(school.stage);
  const next = getNextStage(school.stage);
  const affordable = next ? canAfford(wallet, next.cost) : false;

  // Stage names live in the catalog in English because the server needs them
  // too; the UI reads the translated copy and falls back to the catalog, so a
  // stage added without a translation still renders something sensible.
  const stageName = (s: { id: string; name: string }) =>
    t(`school.stages.${s.id}.name`, s.name);
  const stageBlurb = (s: { id: string; blurb: string }) =>
    t(`school.stages.${s.id}.blurb`, s.blurb);

  const run = async (fn: () => Promise<{ ok: boolean; message?: string }>) => {
    if (busy) return;
    setBusy(true);
    const result = await fn();
    if (!result.ok && result.message) setToast(result.message);
    setBusy(false);
  };

  const handleUpgrade = () => {
    if (!next) return;
    if (!affordable) {
      setToast(t("school.notEnough"));
      return;
    }
    run(upgrade);
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
        />
      </Suspense>

      {/* ── Stage badge ──────────────────────────────────────────────── */}
      <div className="absolute left-3 top-3 pointer-events-none">
        <div className="bg-white/90 backdrop-blur rounded-full pl-3 pr-3.5 py-1.5 shadow-sm">
          <div className="text-[13px] font-bold text-black/80 leading-tight">{stageName(stage)}</div>
          <div className="text-[10px] font-semibold text-black/40 leading-tight">
            {t("school.stageOf", { current: stage.index + 1, total: MAX_STAGE + 1 })}
          </div>
        </div>
      </div>

      {/* ── View toggle + look drawer trigger ────────────────────────── */}
      <div className="absolute right-3 top-3 flex flex-col gap-2">
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
          className="h-11 w-11 rounded-full bg-white/90 backdrop-blur shadow-sm flex items-center justify-center text-black/60 active:scale-95 transition-transform"
        >
          <IoColorPaletteOutline size={21} />
        </button>
      </div>

      {/* ── The one button ───────────────────────────────────────────── */}
      <div className="absolute inset-x-0 bottom-5 flex justify-center px-4 pointer-events-none">
        {next ? (
          <button
            type="button"
            onClick={handleUpgrade}
            disabled={busy}
            className={`pointer-events-auto flex flex-col items-center gap-1 rounded-2xl px-6 py-3 shadow-xl transition-transform active:scale-95 disabled:opacity-60 ${
              affordable
                ? "bg-violet-600 shadow-violet-900/30"
                : "bg-black/55 backdrop-blur shadow-black/20"
            }`}
          >
            <span className="text-[15px] font-bold text-white leading-tight">
              {t("school.build", { name: stageName(next) })}
            </span>
            <PriceRow cost={next.cost} wallet={wallet} />
          </button>
        ) : (
          <div className="pointer-events-none flex items-center gap-2 rounded-2xl bg-white/90 backdrop-blur px-5 py-3 shadow-lg">
            <IoSparkles size={18} className="text-amber-500" />
            <span className="text-sm font-bold text-black/70">{t("school.complete")}</span>
          </div>
        )}
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
              <div className="text-lg font-bold text-black/85">{stageName(getStage(celebrating))}</div>
              <div className="text-xs text-black/50 mt-1">{stageBlurb(getStage(celebrating))}</div>
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
                  stage={school.stage}
                  lockedLabel={(s) => t("school.look.lockedUntil", { stage: s + 1 })}
                  onPick={(id) => run(() => setLook({ wallpaperId: id }))}
                />
                <Swatches
                  title={t("school.look.floor")}
                  items={SCHOOL_FLOORS}
                  currentId={school.floorId}
                  stage={school.stage}
                  lockedLabel={(s) => t("school.look.lockedUntil", { stage: s + 1 })}
                  onPick={(id) => run(() => setLook({ floorId: id }))}
                />

                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-wide text-black/40 mb-2">
                    {t("school.look.layout")}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {SCHOOL_LAYOUTS.map((layout) => {
                      const locked = layout.unlocksAtStage > school.stage;
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
