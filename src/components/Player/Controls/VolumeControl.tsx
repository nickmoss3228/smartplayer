import React from "react";
import { FaVolumeHigh } from "react-icons/fa6";
import { FaVolumeMute } from "react-icons/fa";

interface VolumeControlProps {
  isMuted: boolean;
  volume: number;
  onMuteToggle: () => void;
  onVolumeChange: (value: number) => void;
}

export const VolumeControl: React.FC<VolumeControlProps> = React.memo(
  ({ isMuted, volume, onMuteToggle, onVolumeChange }) => (
    <div className="flex items-center gap-2 sm:gap-2 md:gap-2.5 w-full justify-center">
      <div
        className="cursor-pointer text-black/90 flex items-center hover:text-white transition-colors duration-200"
        onClick={onMuteToggle}
      >
        {isMuted ? (
          <FaVolumeMute className="text-[24px] sm:text-[24px] md:text-[30px]" />
        ) : (
          <FaVolumeHigh className="text-[24px] sm:text-[24px] md:text-[30px]" />
        )}
      </div>

      <div className="flex flex-col items-center gap-0.5">
        <input
          type="range"
          min="0"
          max="10"
          step="1"
          value={isMuted ? 0 : Math.round(volume * 10)}
          onChange={(e) => onVolumeChange(parseInt(e.target.value, 10))}
          className="w-[156px] sm:w-[156px] md:w-[220px] h-[5px] md:h-[3px] bg-black/90 rounded-[3px] outline-none cursor-pointer appearance-none
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-5
            [&::-webkit-slider-thumb]:h-5
            md:[&::-webkit-slider-thumb]:w-4
            md:[&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-all
            [&::-webkit-slider-thumb]:duration-200
            [&::-webkit-slider-thumb]:hover:bg-[#05df3bff]
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-moz-range-thumb]:w-5
            [&::-moz-range-thumb]:h-5
            md:[&::-moz-range-thumb]:w-4
            md:[&::-moz-range-thumb]:h-4
            [&::-moz-range-thumb]:bg-white
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:cursor-pointer
            [&::-moz-range-thumb]:border-none
            [&::-moz-range-thumb]:transition-all
            [&::-moz-range-thumb]:duration-200
            [&::-moz-range-thumb]:hover:bg-[#05df3bff]
            [&::-moz-range-thumb]:hover:scale-110"
        />
        <div className="flex justify-between w-[156px] sm:w-[156px] md:w-[220px] px-[2px]">
          {Array.from({ length: 11 }, (_, i) => (
            <div key={i} className="flex flex-col items-center gap-[2px]">
              <div className="w-[1px] h-[5px] bg-white/40" />
              <span className="text-black/80 text-[9px] sm:text-[9px] md:text-[10px] font-['Montserrat'] leading-none select-none">
                {i}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
);

VolumeControl.displayName = "VolumeControl";