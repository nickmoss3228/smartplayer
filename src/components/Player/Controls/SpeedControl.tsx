import React from "react";
import { PLAYBACK_RATES } from "../hooks/constants";

interface SpeedControlProps {
  playbackRate: number;
  repeatCount: number;
  onSpeedChange: (rate: number) => void;
  onRepeatCountChange: (count: number) => void;
}

export const SpeedControl: React.FC<SpeedControlProps> = React.memo(
  ({ playbackRate, onSpeedChange }) => (
    <div className="flex flex-col items-center w-full gap-2">
      <div className="flex items-center justify-evenly w-full gap-5 md:gap-3 sm:gap-2.5">
        {/* <div className="flex items-center gap-[15px] md:gap-3 sm:gap-2.5">
          {[3, 2, 1].map((count) => (
            <button
              key={count}
              className={`border-2 rounded-full w-10 h-10 md:w-12 md:h-12 sm:w-11 sm:h-11 flex items-center justify-center cursor-pointer text-xs font-medium font-['Montserrat'] transition-all duration-200 active:scale-95
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
        </div> */}

        <div className="flex items-center gap-[15px] md:gap-3 sm:gap-2.5">
          {PLAYBACK_RATES.map((speed) => (
            <button
              key={speed}
              className={`border-2 text-white rounded-full w-10 h-10 md:w-12 md:h-12 sm:w-11 sm:h-11 flex items-center justify-center cursor-pointer text-xs font-medium font-['Montserrat'] transition-all duration-200 active:scale-95
                ${
                  playbackRate === speed
                    ? "bg-[#05df3bff] text-black border-green-500"
                    : "bg-black/90 border-[#ddd] hover:bg-[#05df3bff] hover:text-white hover:border-green-500"
                }`}
              onClick={() => onSpeedChange(speed)}
            >
              {speed}
            </button>
          ))}
        </div>
      </div>
      {/* <p className="text-black/80 text-[10px] uppercase tracking-widest font-semibold font-['Montserrat']">
        Repeat count 
      </p> */}
    </div>
  ),
);

SpeedControl.displayName = "SpeedControl";

// import React, { useState, useCallback, useEffect } from 'react';
// import { DropdownContainer, DropdownButton, DropdownMenu, DropdownItem } from '../../../styledComponents';
// import { useAppSelector, useAppDispatch } from '../../../hooks/hooks';
// import { setPlaybackRate } from '../../../store/playerslice';

// const playbackRates: number[] = [0.85, 0.9, 1.0, 1.1, 1.2];

// export const SpeedControl: React.FC = React.memo(() => {
//   const dispatch = useAppDispatch();
//   const { playbackRate } = useAppSelector((state) => state.player);
//   const [isSpeedDropdownOpen, setIsSpeedDropdownOpen] = useState(false);

//   const changePlaybackRate = useCallback((rate: number) => {
//     dispatch(setPlaybackRate(rate));
//   }, [dispatch]);

//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       if (event.target instanceof Element && !event.target.closest(".speed-dropdown")) {
//         setIsSpeedDropdownOpen(false);
//       }
//     };

//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   return (
//     <DropdownContainer className="speed-dropdown">
//       <DropdownButton onClick={() => setIsSpeedDropdownOpen(!isSpeedDropdownOpen)}>
//         {playbackRate}x
//       </DropdownButton>
//       <DropdownMenu $isOpen={isSpeedDropdownOpen}>
//         {playbackRates.map((speed) => (
//           <DropdownItem
//             key={speed}
//             $active={playbackRate === speed}
//             onClick={() => {
//               changePlaybackRate(speed);
//               setIsSpeedDropdownOpen(false);
//             }}
//           >
//             {speed}x
//           </DropdownItem>
//         ))}
//       </DropdownMenu>
//     </DropdownContainer>
//   );
// });

// SpeedControl.displayName = 'SpeedControl';