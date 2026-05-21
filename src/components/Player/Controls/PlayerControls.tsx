import React from "react";
import { IoPause, IoPlay, IoChevronBack, IoChevronForward } from "react-icons/io5"; 
import { MdReplay } from "react-icons/md";
// import VoiceSwitcher from "../VoiceSwitcher/VoiceSwitcher";
import { ToggleSwitch } from "../../../modules/toggle/ToggleSwitch";
import { PLAYBACK_RATES } from "../hooks/constants";
import { ComicsDisplay } from "../../Player/Comics/ComicsDisplay"; 

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
  // ── Segment navigation (mobile only) ──
  onPrev?: () => void;
  onNext?: () => void;
  canGoPrev?: boolean;
  canGoNext?: boolean;
  // ── Comics (desktop circular button) ──  ← NEW
  storyIndex?: number;
  comicsTitle?: string;
  difficulty?: string;
}

export const PlayerControls: React.FC<PlayerControlsProps> = React.memo(
  ({
    isPlaying,
    isControlledMode,
    onPlayPause,
    onToggleControlledMode,
    onToggleEnhancedMode,
    repeatCount,
    onRepeatCountChange,
    onSpeedChange,
    playbackRate,
    isEnhancedMode,
    layout = "desktop",
    onPrev,
    onNext,
    canGoPrev = false,
    canGoNext = false,
    storyIndex,   
    comicsTitle,
    difficulty, 
  }) => {
    const labelClass =
      "text-black/50 text-[9px] uppercase tracking-widest font-semibold font-['Montserrat'] whitespace-nowrap";

    const disabledClass = !isEnhancedMode
      ? "opacity-40 pointer-events-none cursor-not-allowed"
      : "";
    
  //   const repeatsDisabledClass = !isEnhancedMode
  // ? "opacity-40 pointer-events-none cursor-not-allowed"
  // : "";

    // ═══════════════════════════════════════════════════════════
    // MOBILE LAYOUT
    // ═══════════════════════════════════════════════════════════
    if (layout === "mobile") {
      const repeatBtnBase =
        "border-2 rounded-full w-9 h-9 flex items-center justify-center cursor-pointer text-[11px] font-medium font-['Montserrat'] transition-all active:scale-95";
      const speedBtnBase =
        "border-2 rounded-full h-9 px-2 min-w-[36px] flex items-center justify-center cursor-pointer text-[11px] font-medium font-['Montserrat'] transition-all active:scale-95";
      const activeBtn = "bg-[#05df3bff] text-black border-green-500";
      const idleBtn = "bg-black/90 text-white/90 border-[#ddd]";

      return (
        <div className="flex flex-col w-full gap-4">

          {/* Row A — Prev  ·  Play/Pause  ·  Next */}
          <div className="flex items-center justify-center gap-6">

            {/* ← Previous segment */}
            <button
              onClick={onPrev}
              disabled={!canGoPrev}
              className="w-12 h-12 rounded-full bg-black/80 text-white
                         flex items-center justify-center shadow
                         disabled:opacity-30 disabled:pointer-events-none
                         active:scale-95 transition"
              aria-label="Previous segment"
            >
              <IoChevronBack className="w-6 h-6" />
            </button>

            {/* ▶ / ⏸ */}
            <button
              className="p-3 border-none bg-black/90 text-white rounded-full cursor-pointer
                         hover:bg-black/70 transition-all active:scale-95
                         flex items-center justify-center shadow-lg"
              onClick={onPlayPause}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <IoPause className="text-white w-14 h-14" />
              ) : (
                <IoPlay className="text-white w-14 h-14" />
              )}
            </button>

            {/* → Next segment */}
            <button
              onClick={onNext}
              disabled={!canGoNext}
              className="w-12 h-12 rounded-full bg-black/80 text-white
                         flex items-center justify-center shadow
                         disabled:opacity-30 disabled:pointer-events-none
                         active:scale-95 transition"
              aria-label="Next segment"
            >
              <IoChevronForward className="w-6 h-6" />
            </button>
          </div>

          {/* Row B — Repeat + Speed (2-column grid) */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`flex flex-col items-center gap-1.5 ${disabledClass}`}>
              <div className="flex items-center gap-1.5">
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
              <span className={labelClass}>Repeat</span>
            </div>

            <div className={`flex flex-col items-center gap-1.5 `}>
              <div className="flex items-center gap-1.5">
                {PLAYBACK_RATES.map((speed) => (
  <button
    key={speed}
    // disabled={!isEnhancedMode}   // ← add
    className={`${speedBtnBase}
     
      ${playbackRate === speed ? activeBtn : idleBtn}`}
    onClick={() => onSpeedChange(speed)}
  >
    x{speed}
  </button>
))}
              </div>
              <span className={labelClass}>Speed</span>
            </div>
          </div>

          {/* Row C — VoiceSwitcher + Enhanced toggle */}
          <div className="flex items-center justify-center gap-3 pt-1">
            {/* <VoiceSwitcher /> */}
            <ToggleSwitch
              checked={isEnhancedMode}
              onChange={onToggleEnhancedMode}
              label={isEnhancedMode ? "Enhanced Mode" : "Free Play"}
            />
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
          <div className="flex flex-col items-center gap-1 min-w-[80px]">
            {showComics ? (
              <>
                <ComicsDisplay
                  storyIndex={storyIndex!}
                  title={comicsTitle}
                  difficulty={difficulty!}
                  variant="circular"   // ← circular shape
                />
                <span className={labelClass}>Comics</span>
              </>
            ) : null}
          </div>

          {/* ── REPEAT ── */}
          <div className={`flex flex-col items-center gap-1 ${disabledClass}`}>
            <div className="flex items-center gap-2">
              {[3, 2, 1].map((count) => (
                <button
                  key={count}
                  className={`border-2 rounded-full w-10 h-10 flex items-center justify-center
                    cursor-pointer text-xs font-medium font-['Montserrat']
                    transition-all duration-200 active:scale-95
                    ${repeatCount === count
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
            <span className={labelClass}>Repeat</span>
          </div>

          {/* ── PLAY / STEP ── */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-1">
                <button
                  className="p-2 border-none bg-black/90 text-white rounded-full cursor-pointer
                             hover:bg-black/50 transition-all duration-200 active:scale-95
                             flex items-center justify-center"
                  onClick={onPlayPause}
                  title="Play / Pause"
                >
                  {isPlaying
                    ? <IoPause className="text-white w-[50px] h-[50px]" />
                    : <IoPlay  className="text-white w-[50px] h-[50px]" />}
                </button>
                <span className={labelClass}>{isPlaying ? "Pause" : "Play"}</span>
              </div>

              <div className={`flex flex-col items-center gap-1 ${disabledClass}`}>
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
                >
                  <MdReplay className="text-white w-[30px] h-[30px]" />
                </button>
                <span className={labelClass}>Step</span>
              </div>
            </div>
          </div>

          {/* ── SPEED ── */}
          <div className={`flex flex-col items-center gap-1 ${disabledClass}`}>
            <div className="flex items-center gap-2">
             {PLAYBACK_RATES.map((speed) => (
  <button
    key={speed}
    disabled={!isEnhancedMode}   // ← add
    className={`border-2 rounded-full w-10 h-10 flex items-center justify-center
      cursor-pointer text-xs font-medium font-['Montserrat']
      transition-all duration-200 active:scale-95
      disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed
      ${playbackRate === speed
        ? "bg-[#05df3bff] text-black border-green-500"
        : "bg-black/90 text-white/90 border-[#ddd] hover:bg-[#05df3bff] hover:text-white hover:border-green-500"
      }`}
    onClick={() => onSpeedChange(speed)}
  >
    x{speed}
  </button>
))}
            </div>
            <span className={labelClass}>Speed</span>
          </div>

          {/* ── RIGHT SLOT: Enhanced toggle ── */}
          <div className="flex flex-col items-center gap-1 min-w-[80px]">
            <ToggleSwitch
              checked={isEnhancedMode}
              onChange={onToggleEnhancedMode}
              label={isEnhancedMode ? "Enhanced Mode" : "Free Play"}
            />
          </div>

        </div>
      </div>
    );
  }
);

PlayerControls.displayName = "PlayerControls";




 {/* <div className={`flex flex-col items-center gap-1 ${disabledClass}`}>
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
            </div> */}