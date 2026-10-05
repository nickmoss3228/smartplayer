import React, { useId } from "react";
import {
  IoPlay,
  IoChevronBack,
  IoChevronForward,
  IoPause,
  IoHelpCircle, // ← add this
} from "react-icons/io5";

import { ToggleSwitch } from "../../../modules/toggle/ToggleSwitch";
import { PLAYBACK_RATES } from "../hooks/constants";
import { useTranslation } from "react-i18next";

// Both layouts draw straight on the level gradient, with no white panel
// behind them. The phone's round pills use these two tokens; desktop groups
// the same choices into segmented controls (segBtn below), and both share
// GHOST_BTN for the round transport buttons.
const ACTIVE_PILL = "bg-gray-700/30 text-white";
const IDLE_PILL = "text-white/90 hover:bg-white/10";
/** Round transport/utility button: no fill until hover. */
const GHOST_BTN =
  "flex items-center justify-center rounded-full text-white " +
  "hover:bg-white/10 transition-all duration-200 active:scale-95 cursor-pointer";

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
  /** Desktop: the volume control, set at the right end of the transport row. */
  volumeControl?: React.ReactNode;
  isUserPaused?: boolean;
  isEnhancedSessionActive?: boolean;
  onOpenHelp?: () => void;
  /**
   * Whether this track actually has help audio to play. Defaults to true so an
   * older caller that does not pass it keeps the button live rather than
   * silently disabling Help everywhere.
   */
  hasHelpAudio?: boolean;
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
    hasHelpAudio = true,
    onPrev,
    onNext,
    canGoPrev = false,
    canGoNext = false,
    volumeControl,
  }) => {
    const { t } = useTranslation();
    // Desktop's mode group is named by its visible label. Called before the
    // mobile early return so the hook order never depends on the layout.
    const modeLabelId = useId();

    const disabledClass = !isEnhancedMode
      ? "opacity-40 pointer-events-none cursor-not-allowed"
      : "";

    // A selection only means something while Enhanced mode drives playback.
    // Outside it the chosen speed/repeat pill used to keep its filled
    // background, reading as an active control under a disabled group.
    const pillFor = (selected: boolean) =>
      selected && isEnhancedMode ? ACTIVE_PILL : IDLE_PILL;

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
        "rounded-full flex items-center justify-center cursor-pointer font-medium transition-all active:scale-95 w-[clamp(38px,11vw,52px)] h-[clamp(38px,11vw,52px)] text-[clamp(11px,3.2vw,14px)]";
      const speedBtnBase =
        "rounded-full flex items-center justify-center cursor-pointer font-medium transition-all active:scale-95 w-[clamp(38px,11vw,52px)] h-[clamp(38px,11vw,52px)] text-[clamp(11px,3.2vw,14px)]";

      return (
        <div className="relative flex flex-col w-full h-full justify-start gap-6">
          {/* Row A — Help · Prev · Play/Pause · Next · Mode toggle */}
          <div className="flex items-center justify-between gap-0">
            <button
              onClick={onOpenHelp}
              disabled={!hasHelpAudio}
              aria-label={
                hasHelpAudio
                  ? t("controls.help", "Help")
                  : t("controls.helpUnavailable", "No help audio for this part")
              }
              title={
                hasHelpAudio
                  ? undefined
                  : t("controls.helpUnavailable", "No help audio for this part")
              }
              className="shrink-0 flex items-center justify-center rounded-full
     w-[clamp(38px,11vw,52px)] h-[clamp(38px,11vw,52px)]
     text-white
     transition-all duration-200 active:scale-95 cursor-pointer shadow-sm
     disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              <IoHelpCircle className="w-[clamp(22px,6.5vw,30px)] h-[clamp(22px,6.5vw,30px)]" />
            </button>

            {/* transport group: justify-evenly instead of a capped gap → spreads with width */}
            <div className="flex flex-1 items-center justify-evenly px-[clamp(0.5rem,4vw,3rem)]">
              <button
                onClick={onPrev}
                disabled={!canGoPrev}
                className="rounded-full text-white
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
            ? "bg-green-500 hover:bg-green-400"
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
                className="rounded-full text-white
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

          {/* Row B — Speed + Repeat (repeat sits right, under the mode toggle) */}
          <div className="grid grid-cols-2 gap-[clamp(0.75rem,4vw,2.5rem)]">
            <div className="flex flex-col items-center" data-tour="tour-speed">
              <div className="flex items-center justify-evenly w-full max-w-[220px]">
                {PLAYBACK_RATES.map((speed) => (
                  <button
                    key={speed}
                    className={`${speedBtnBase} ${pillFor(playbackRate === speed)}`}
                    onClick={() => onSpeedChange(speed)}
                  >
                    {speed}
                  </button>
                ))}
              </div>
            </div>

            <div
              className={`flex flex-col items-center ${disabledClass}`}
              data-tour="tour-repeat"
            >
              {/* w-full + justify-between → pills spread across their column */}
              {/* Ascending here, unlike desktop: this cluster sits on the right
                  under the mode toggle, so the counts read left-to-right. */}
              <div className="flex items-center justify-evenly w-full max-w-[220px]">
                {[1, 2, 3].map((count) => (
                  <button
                    key={count}
                    className={`${repeatBtnBase} ${pillFor(repeatCount === count)}`}
                    onClick={() => onRepeatCountChange(count)}
                    title={`Repeat each segment ${count} time${count > 1 ? "s" : ""}`}
                  >
                    x{count}
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
    // Two rows and a footnote: the transport (help · prev · play · next ·
    // volume), one settings bar (how to play · speed · repeats), and the
    // keyboard shortcuts usePlayerControls already listens for — which nothing
    // on screen used to mention. The comic left this row for the column above.
    const deskLabel =
      "text-white/70 text-[10px] uppercase tracking-[0.16em] font-mono whitespace-nowrap";
    const segGroup = "inline-flex rounded-full bg-black/15 p-[3px]";
    const segBtn = (on: boolean) =>
      "h-[30px] min-w-10 cursor-pointer rounded-full px-2.5 text-[13px] font-semibold tabular-nums " +
      "transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white " +
      (on ? "bg-white text-ink" : "text-white/90 hover:bg-white/10");
    const kbd = "mr-1.5 rounded-[3px] border border-white/40 px-1.5 py-px text-white/90";

    return (
      <div className="flex w-full flex-col gap-4">
        {/* 1fr | auto | 1fr rather than one justify-between row: equal side
            tracks pin Play/Pause to the panel's centre line whatever the two
            sides end up holding. */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center">
          <button
            type="button"
            onClick={onOpenHelp}
            disabled={!hasHelpAudio}
            title={
              hasHelpAudio
                ? undefined
                : t("controls.helpUnavailable", "No help audio for this part")
            }
            className="inline-flex cursor-pointer items-center gap-2 justify-self-start rounded-full py-1.5 pl-1.5 pr-3
              text-sm font-semibold text-white/90 transition-colors duration-200 hover:bg-white/10 hover:text-white
              disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <IoHelpCircle className="h-6 w-6" aria-hidden="true" />
            {t("controls.help", "Help")}
          </button>

          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={onPrev}
              disabled={!canGoPrev}
              aria-label={t("controls.prevPhrase")}
              className={`${GHOST_BTN} h-12 w-12 disabled:pointer-events-none disabled:opacity-30`}
            >
              <IoChevronBack className="h-7 w-7" />
            </button>

            <button
              type="button"
              onClick={onPlayPause}
              aria-label={showPauseIcon ? t("controls.pause") : t("controls.play")}
              className={`flex h-[76px] w-[76px] cursor-pointer items-center justify-center rounded-full border-none
                text-white transition-all duration-200 active:scale-95 ${
                  buttonIsGreen
                    ? "bg-green-500 hover:bg-green-400"
                    : "bg-black/20 hover:bg-black/30"
                }`}
            >
              {showPauseIcon ? (
                <IoPause className="h-10 w-10" />
              ) : (
                <IoPlay className="ml-1 h-10 w-10" />
              )}
            </button>

            <button
              type="button"
              onClick={onNext}
              disabled={!canGoNext}
              aria-label={t("controls.nextPhrase")}
              className={`${GHOST_BTN} h-12 w-12 disabled:pointer-events-none disabled:opacity-30`}
            >
              <IoChevronForward className="h-7 w-7" />
            </button>
          </div>

          <div className="justify-self-end">{volumeControl}</div>
        </div>

        {/* One bar for how the part plays. «Подряд | По фразам» replaces the
            toggle, whose «Режим практики» shared a word with the «Практика»
            exercises; speed and repeats only drive the phrase-by-phrase mode,
            so they grey out beside it outside that mode. Labels sit above, in
            three columns (speed under Play), so the bar never wraps — inline
            labels made it two ragged lines at laptop widths. */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-x-3 rounded-card bg-black/10 px-3.5 pb-2.5 pt-2">
          <div className="flex flex-col items-start gap-1.5 justify-self-start">
            <span className={deskLabel} id={modeLabelId}>{t("controls.mode")}</span>
            <div role="radiogroup" aria-labelledby={modeLabelId} className={segGroup}>
              <button
                type="button"
                role="radio"
                aria-checked={!isEnhancedMode}
                onClick={() => isEnhancedMode && onToggleEnhancedMode()}
                className={segBtn(!isEnhancedMode)}
              >
                {t("controls.modeFree")}
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={isEnhancedMode}
                onClick={() => !isEnhancedMode && onToggleEnhancedMode()}
                className={segBtn(isEnhancedMode)}
              >
                {t("controls.modePhrases")}
              </button>
            </div>
          </div>

          <div className={`flex flex-col items-center gap-1.5 ${disabledClass}`} data-tour="tour-speed">
            <span className={deskLabel}>{t("controls.speed")}</span>
            <div className={segGroup}>
              {PLAYBACK_RATES.map((speed) => (
                <button
                  key={speed}
                  type="button"
                  disabled={!isEnhancedMode}
                  aria-pressed={playbackRate === speed}
                  onClick={() => onSpeedChange(speed)}
                  className={segBtn(playbackRate === speed && isEnhancedMode)}
                >
                  {speed}
                </button>
              ))}
            </div>
          </div>

          <div className={`flex flex-col items-end gap-1.5 justify-self-end ${disabledClass}`} data-tour="tour-repeat">
            <span className={deskLabel}>{t("controls.repeat")}</span>
            <div className={segGroup}>
              {[1, 2, 3].map((count) => (
                <button
                  key={count}
                  type="button"
                  disabled={!isEnhancedMode}
                  aria-pressed={repeatCount === count}
                  onClick={() => onRepeatCountChange(count)}
                  title={`Repeat each segment ${count} time${count > 1 ? "s" : ""}`}
                  className={segBtn(repeatCount === count && isEnhancedMode)}
                >
                  ×{count}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="hidden justify-center gap-5 font-mono text-[10px] uppercase tracking-[0.1em] text-white/60 lg:flex">
          <span>
            <kbd className={kbd}>{t("controls.keySpace")}</kbd>
            {t("controls.keyPause")}
          </span>
          <span>
            <kbd className={kbd}>→</kbd>
            {t("controls.keyNext")}
          </span>
          <span>
            <kbd className={kbd}>R</kbd>
            {t("controls.keyReplay")}
          </span>
        </p>
      </div>
    );
  },
);

PlayerControls.displayName = "PlayerControls";