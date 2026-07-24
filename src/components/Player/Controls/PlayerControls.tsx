import React from "react";
import {
  IoPlay,
  IoChevronBack,
  IoChevronForward,
  IoPause,
  IoHelpCircle, // ← add this
} from "react-icons/io5";

import { ToggleSwitch } from "../../../modules/toggle/ToggleSwitch";
import { PLAYBACK_RATES } from "../hooks/constants";
import { ComicsDisplay } from "../../Player/Comics/ComicsDisplay";
import { useTranslation } from "react-i18next";

interface PlayerControlsProps {
  isPlaying: boolean;
  isControlledMode: boolean;
  onPlayPause: () => void;
  onToggleControlledMode: () => void;
  onRepeatCountChange: (count: number) => void;
  repeatCount: number;
  playbackRate: number;
  onSpeedChange: (rate: number) => void;
  isEnhancedMode: boolean;
  onToggleEnhancedMode: () => void;
  layout?: "mobile" | "desktop";
  onPrev?: () => void;
  onNext?: () => void;
  canGoPrev?: boolean;
  canGoNext?: boolean;
  storyIndex?: number;
  comicsTitle?: string;
  difficulty?: string;
  isUserPaused?: boolean;
  isEnhancedSessionActive?: boolean;
  onOpenHelp?: () => void;
  onOpenFeedback?: () => void;
}

export const PlayerControls: React.FC<PlayerControlsProps> = React.memo(
  ({
    isPlaying,
    // isControlledMode,
    onPlayPause,
    // isUserPaused = false,
    // onToggleControlledMode,
    onToggleEnhancedMode,
    // onOpenFeedback,
    repeatCount,
    isEnhancedSessionActive = false,
    onRepeatCountChange,
    onSpeedChange,
    playbackRate,
    isEnhancedMode,
    layout = "desktop",
    onOpenHelp,
    onPrev,
    onNext,
    canGoPrev = false,
    canGoNext = false,
    storyIndex,
    comicsTitle,
    difficulty,
  }) => {
    const { t } = useTranslation();

    const labelClass =
      "text-black/50 text-[9px] uppercase tracking-widest font-semibold font-['Montserrat'] whitespace-nowrap";

    const disabledClass = !isEnhancedMode
      ? "opacity-40 pointer-events-none cursor-not-allowed"
      : "";

    // ── Two derived values used by both layouts ───────────────────────────
    // Green glow: only when Enhanced session is actively running
    const buttonIsGreen = isEnhancedMode && isEnhancedSessionActive;
    // Show pause icon: Enhanced → follow session state; Free → follow isPlaying
    const showPauseIcon = isEnhancedMode ? isEnhancedSessionActive : isPlaying;

    // true  → show Pause icon  (user manually paused, or non-enhanced playing)
    // false → show Play icon
    // const showPauseIcon = isUserPaused || (isPlaying && !isEnhancedMode);

    // green pulsing state: engine is auto-cycling in Enhanced mode
    // const highlightGreen = isPlaying && isEnhancedMode && !isUserPaused;

    //   const repeatsDisabledClass = !isEnhancedMode
    // ? "opacity-40 pointer-events-none cursor-not-allowed"
    // : "";

    // ═══════════════════════════════════════════════════════════
    // MOBILE LAYOUT
    // ═══════════════════════════════════════════════════════════
    if (layout === "mobile") {
      const repeatBtnBase =
        "rounded-full flex items-center justify-center cursor-pointer font-medium font-['Montserrat'] transition-all active:scale-95 w-[clamp(38px,11vw,52px)] h-[clamp(38px,11vw,52px)] text-[clamp(11px,3.2vw,14px)]";
      const speedBtnBase =
        "rounded-full flex items-center justify-center cursor-pointer font-medium font-['Montserrat'] transition-all active:scale-95 h-[clamp(38px,11vw,52px)] px-[clamp(8px,3vw,14px)] min-w-[clamp(38px,11vw,52px)] text-[clamp(11px,3.2vw,14px)]";
      const activeBtn = "bg-[#05df3bff] text-black border-green-500";
      const idleBtn = "bg-black/20 text-white/90 ";

      return (
        <div className="relative flex flex-col w-full h-full justify-start gap-10">
          {/* Row A — Help · Prev · Play/Pause · Next · Mode toggle */}
          <div className="flex items-center justify-between gap-[clamp(0.6rem,3vw,1.5rem)]">
            <button
              onClick={onOpenHelp}
              aria-label={t("controls.help", "Help")}
              className="shrink-0 flex items-center justify-center rounded-full
     w-[clamp(38px,11vw,52px)] h-[clamp(38px,11vw,52px)]
     bg-black/20 hover:bg-red-600 text-white
     transition-all duration-200 active:scale-95 cursor-pointer shadow-sm"
            >
              <IoHelpCircle className="w-[clamp(22px,6.5vw,30px)] h-[clamp(22px,6.5vw,30px)]" />
            </button>

            {/* transport group: justify-evenly instead of a capped gap → spreads with width */}
            <div className="flex flex-1 items-center justify-evenly px-[clamp(0.5rem,4vw,3rem)]">
              <button
                onClick={onPrev}
                disabled={!canGoPrev}
                className="rounded-full bg-black/20 text-white
                 flex items-center justify-center shadow
                 w-[clamp(44px,13vw,64px)] h-[clamp(44px,13vw,64px)]
                 disabled:opacity-30 disabled:pointer-events-none
                 active:scale-95 transition"
                aria-label="Previous segment"
              >
                <IoChevronBack className="w-[clamp(22px,6vw,32px)] h-[clamp(22px,6vw,32px)]" />
              </button>

              <button
                className={`border-none rounded-full cursor-pointer
        transition-all active:scale-95
        flex items-center justify-center shadow-lg
        p-[clamp(12px,4vw,24px)]
        ${
          buttonIsGreen
            ? "bg-[#05df3bff] hover:bg-green-400"
            : "bg-black/20 hover:bg-black/30"
        } text-white`}
                onClick={onPlayPause}
                aria-label={showPauseIcon ? "Pause" : "Play"}
              >
                {showPauseIcon ? (
                  <IoPause className="text-white w-[clamp(36px,11vw,56px)] h-[clamp(36px,11vw,56px)]" />
                ) : (
                  <IoPlay className="text-white w-[clamp(36px,11vw,56px)] h-[clamp(36px,11vw,56px)]" />
                )}
              </button>

              <button
                onClick={onNext}
                disabled={!canGoNext}
                className="rounded-full bg-black/20 text-white
                 flex items-center justify-center shadow
                 w-[clamp(44px,13vw,64px)] h-[clamp(44px,13vw,64px)]
                 disabled:opacity-30 disabled:pointer-events-none
                 active:scale-95 transition"
                aria-label="Next segment"
              >
                <IoChevronForward className="w-[clamp(22px,6vw,32px)] h-[clamp(22px,6vw,32px)]" />
              </button>
            </div>

            <div className="shrink-0 scale-90 origin-right">
              <ToggleSwitch
                checked={isEnhancedMode}
                onChange={onToggleEnhancedMode}
              />
            </div>
          </div>

          {/* Row B — Repeat + Speed */}
          <div className="grid grid-cols-2 gap-[clamp(0.75rem,4vw,2.5rem)]">
            <div
              className={`flex flex-col items-center ${disabledClass}`}
              data-tour="tour-repeat"
            >
              {/* w-full + justify-between → pills spread across their column */}
              <div className="flex items-center justify-between w-full max-w-[220px]">
                {[3, 2, 1].map((count) => (
                  <button
                    key={count}
                    className={`${repeatBtnBase} ${repeatCount === count ? activeBtn : idleBtn}`}
                    onClick={() => onRepeatCountChange(count)}
                    title={`Repeat each segment ${count} time${count > 1 ? "s" : ""}`}
                  >
                    x{count}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center" data-tour="tour-speed">
              <div className="flex items-center justify-between w-full max-w-[220px]">
                {PLAYBACK_RATES.map((speed) => (
                  <button
                    key={speed}
                    className={`${speedBtnBase} ${playbackRate === speed ? activeBtn : idleBtn}`}
                    onClick={() => onSpeedChange(speed)}
                  >
                    {speed}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ═══════════════════════════════════════════════════════════
    // DESKTOP LAYOUT
    // ═══════════════════════════════════════════════════════════
    const showComics =
      storyIndex != null && difficulty != null && difficulty !== "";

    return (
      <div className="flex flex-col items-center w-full gap-2">
        <div className="flex items-end justify-between w-full">
          {/* ── LEFT SLOT: circular comics button ── */}
          <div
            className="flex flex-col items-center gap-1 min-w-[80px]"
            data-tour="tour-comics"
          >
            {showComics ? (
              <>
                <ComicsDisplay
                  storyIndex={storyIndex!}
                  title={comicsTitle}
                  difficulty={difficulty!}
                  variant="circular" // ← circular shape
                />
                <span className={labelClass}>{t("controls.comics")}</span>
              </>
            ) : null}
          </div>

          {/* ── REPEAT ── */}
          <div
            className={`flex flex-col items-center gap-1 ${disabledClass}`}
            data-tour="tour-repeat"
          >
            <div className="flex items-center gap-2">
              {[3, 2, 1].map((count) => (
                <button
                  key={count}
                  className={`border-2 rounded-full w-10 h-10 flex items-center justify-center
                    cursor-pointer text-xs font-medium font-['Montserrat']
                    transition-all duration-200 active:scale-95
                    ${
                      repeatCount === count
                        ? "bg-[#05df3bff] text-black border-green-500"
                        : "bg-black/90 text-white/90 border-[#ddd] hover:bg-[#05df3bff] hover:text-white hover:border-green-500"
                    }`}
                  onClick={() => onRepeatCountChange(count)}
                  title={`Repeat each segment ${count} time${count > 1 ? "s" : ""}`}
                >
                  x{count}
                </button>
              ))}
            </div>
            <span className={labelClass}>{t("controls.repeat")}</span>
          </div>

          {/* ── PLAY / STEP ── */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-1">
                <button
                  className={`p-2 border-none rounded-full cursor-pointer
                  transition-all duration-200 active:scale-95
                  flex items-center justify-center
                  ${
                    buttonIsGreen
                      ? "bg-[#05df3bff] hover:bg-green-400"
                      : "bg-black/90 hover:bg-black/50"
                  } text-white`}
                  onClick={onPlayPause}
                  title={showPauseIcon ? "Pause" : "Play"}
                >
                  {showPauseIcon ? (
                    <IoPause className="text-white w-[45px] h-[45px]" />
                  ) : (
                    <IoPlay className="text-white w-[45px] h-[45px]" />
                  )}
                </button>
                <span className={labelClass}>
                  {showPauseIcon ? t("controls.pause") : t("controls.play")}
                </span>
              </div>
              {/* here was controlled mode code */}
            </div>
          </div>

          {/* ── SPEED ── */}
          <div
            className={`flex flex-col items-center gap-1 ${disabledClass}`}
            data-tour="tour-speed"
          >
            <div className="flex items-center gap-2">
              {PLAYBACK_RATES.map((speed) => (
                <button
                  key={speed}
                  disabled={!isEnhancedMode}
                  className={`border-2 rounded-full w-10 h-10 flex items-center justify-center
      cursor-pointer text-xs font-medium font-['Montserrat']
      transition-all duration-200 active:scale-95
      disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed
      ${
        playbackRate === speed
          ? "bg-[#05df3bff] text-black border-green-500"
          : "bg-black/90 text-white/90 border-[#ddd] hover:bg-[#05df3bff] hover:text-white hover:border-green-500"
      }`}
                  onClick={() => onSpeedChange(speed)}
                >
                  x{speed}
                </button>
              ))}
            </div>
            <span className={labelClass}>{t("controls.speed")}</span>
          </div>

          {/* ── RIGHT SLOT: Enhanced toggle ── */}
          <div className="flex flex-col items-center gap-1 min-w-[80px]">
            <ToggleSwitch
              checked={isEnhancedMode}
              onChange={onToggleEnhancedMode}
              label={
                isEnhancedMode
                  ? t("controls.drillmode")
                  : t("controls.freemode")
              }
            />
          </div>
        </div>
      </div>
    );
  },
);

PlayerControls.displayName = "PlayerControls";

// import { MdReplay } from "react-icons/md";

{
  /* <div className={`flex flex-col items-center gap-1 ${disabledClass}`}>
              <button
                className={`p-2 border-2 rounded-full cursor-pointer transition-all active:scale-95 flex items-center justify-center
                  ${
                    isControlledMode
                      ? "bg-[#05df3bff] border-green-500"
                      : "bg-black/90 border-[#ddd]"
                  }`}
                onClick={onToggleControlledMode}
                title={
                  isControlledMode
                    ? "Controlled mode ON — stops after each segment"
                    : "Controlled mode OFF — plays continuously"
                }
                aria-label="Toggle step mode"
              >
                <MdReplay className="text-white w-6 h-6" />
              </button>
              <span className={labelClass}>Step</span>
            </div> */
}

{
  /* <div className={`flex flex-col items-center gap-1 ${disabledClass}`}>
                <button
                  className={`p-2 border-2 rounded-full cursor-pointer
                    transition-all duration-200 active:scale-95 flex items-center justify-center
                    ${isControlledMode
                      ? "bg-[#05df3bff] border-green-500 hover:bg-[#04c934]"
                      : "bg-black/90 border-[#ddd] hover:bg-black/50"
                    }`}
                  onClick={onToggleControlledMode}
                  title={isControlledMode
                    ? "Controlled mode ON — stops after each segment"
                    : "Controlled mode OFF — plays continuously"}
                > */
}
{
  /* <MdReplay className="text-white w-[30px] h-[30px]" /> */
}
{
  /* </button> */
}
{
  /* <span className={labelClass}>Step</span> */
}
{
  /* </div> */
}
