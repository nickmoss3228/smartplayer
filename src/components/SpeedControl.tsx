import React, { useState, useCallback, useEffect } from 'react';
import { DropdownContainer, DropdownButton, DropdownMenu, DropdownItem } from '../styledComponents';
import { useAppSelector, useAppDispatch } from '../hooks/hooks';
import { setPlaybackRate } from '../store/playerslice';

const playbackRates: number[] = [0.85, 0.9, 1.0, 1.1, 1.2];

export const SpeedControl: React.FC = React.memo(() => {
  const dispatch = useAppDispatch();
  const { playbackRate } = useAppSelector((state) => state.player);
  const [isSpeedDropdownOpen, setIsSpeedDropdownOpen] = useState(false);

  const changePlaybackRate = useCallback((rate: number) => {
    dispatch(setPlaybackRate(rate));
  }, [dispatch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (event.target instanceof Element && !event.target.closest(".speed-dropdown")) {
        setIsSpeedDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <DropdownContainer className="speed-dropdown">
      <DropdownButton onClick={() => setIsSpeedDropdownOpen(!isSpeedDropdownOpen)}>
        {playbackRate}x
      </DropdownButton>
      <DropdownMenu $isOpen={isSpeedDropdownOpen}>
        {playbackRates.map((speed) => (
          <DropdownItem
            key={speed}
            $active={playbackRate === speed}
            onClick={() => {
              changePlaybackRate(speed);
              setIsSpeedDropdownOpen(false);
            }}
          >
            {speed}x
          </DropdownItem>
        ))}
      </DropdownMenu>
    </DropdownContainer>
  );
});

SpeedControl.displayName = 'SpeedControl';