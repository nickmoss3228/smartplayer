import React from "react";
import { useTranslation } from "react-i18next";
import { IoVolumeHigh, IoVolumeMute } from "react-icons/io5";

interface VolumeControlProps {
  isMuted: boolean;
  volume: number;
  onMuteToggle: () => void;
  onVolumeChange: (value: number) => void;
}

/**
 * Desktop only (phones use the device's buttons): a mute toggle and a short
 * slider. It used to carry a 0–10 ruler under a 220 px track, which read as a
 * second widget beneath the play button rather than as one quiet control.
 */
export const VolumeControl: React.FC<VolumeControlProps> = React.memo(
  ({ isMuted, volume, onMuteToggle, onVolumeChange }) => {
    const { t } = useTranslation();
    const level = isMuted ? 0 : Math.round(volume * 10);
    const fill = `${level * 10}%`;

    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onMuteToggle}
          aria-label={isMuted ? t("controls.unmute") : t("controls.mute")}
          className="grid h-10 w-10 cursor-pointer place-items-center rounded-full text-white/90 transition-colors duration-200 hover:bg-white/10 hover:text-white"
        >
          {isMuted ? <IoVolumeMute size={22} /> : <IoVolumeHigh size={22} />}
        </button>
        <input
          type="range"
          min="0"
          max="10"
          step="1"
          value={level}
          aria-label={t("controls.volume")}
          onChange={(e) => onVolumeChange(parseInt(e.target.value, 10))}
          // The track is white up to the thumb, faint after it.
          style={{ background: `linear-gradient(to right, #fff ${fill}, rgb(255 255 255 / 0.3) ${fill})` }}
          className="h-1 w-24 cursor-pointer appearance-none rounded-full outline-none
            focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white
            [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5
            [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none
            [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:transition-transform
            [&::-moz-range-thumb]:hover:scale-110"
        />
      </div>
    );
  },
);

VolumeControl.displayName = "VolumeControl";
