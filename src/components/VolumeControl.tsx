import React, { useCallback } from 'react';
import { FaVolumeHigh, FaVolumeXmark } from "react-icons/fa6";
import { VolumeControl as VolumeContainer, VolumeIcon, VolumeSlider } from '../styledComponents';
import { useAppSelector, useAppDispatch } from '../hooks/hooks';
import { setVolume, setIsMuted } from '../store/playerslice';

export const VolumeControl: React.FC = React.memo(() => {
  const dispatch = useAppDispatch();
  const { volume, isMuted } = useAppSelector((state) => state.player);

  const handleMuteToggle = useCallback(() => {
    const newMutedState = !isMuted;
    dispatch(setIsMuted(newMutedState));
  }, [isMuted, dispatch]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    dispatch(setVolume(newVolume));
    dispatch(setIsMuted(newVolume === 0));
  }, [dispatch]);

  return (
    <VolumeContainer>
      <VolumeIcon onClick={handleMuteToggle}>
        {isMuted ? <FaVolumeXmark size={24} /> : <FaVolumeHigh size={24} />}
      </VolumeIcon>
      <VolumeSlider
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={isMuted ? 0 : volume}
        onChange={handleVolumeChange}
      />
    </VolumeContainer>
  );
});

VolumeControl.displayName = 'VolumeControl';