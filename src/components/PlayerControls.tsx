import React from 'react';
import { IoPause, IoPlay, IoRepeat, IoArrowForward } from "react-icons/io5";
import { 
  ControlsContainer, 
  Button, 
  PlayModeContainer, 
  PlayModeToggle, 
  NavigationControls, 
  NavButton,
  SubtitlesButton
} from '../styledComponents';
import { VolumeControl } from '../components/VolumeControl';
import { SpeedControl } from '../components/SpeedControl';

interface PlayerControlsProps {
  isPlaying: boolean;
  isPlayMode: boolean;
  subtitlesVisible: boolean;
  handlePlayPause: () => void;
  togglePlayMode: () => void;
  replayCurrentSentence: () => void;
  goToNextSentence: () => void;
  toggleSubtitles: () => void;
}

export const PlayerControls: React.FC<PlayerControlsProps> = React.memo(({
  isPlaying,
  isPlayMode,
  subtitlesVisible,
  handlePlayPause,
  togglePlayMode,
  replayCurrentSentence,
  goToNextSentence,
  toggleSubtitles
}) => {
  return (
    <ControlsContainer>
      <PlayModeContainer>
        <PlayModeToggle $active={isPlayMode} onClick={togglePlayMode}>
          Sentence Mode: {isPlayMode ? "ON" : "OFF"}
        </PlayModeToggle>
        <NavigationControls>
          <NavButton disabled={!isPlayMode} onClick={replayCurrentSentence}>
            <IoRepeat style={{ fontSize: "24px" }} />
          </NavButton>
          <NavButton disabled={!isPlayMode} onClick={goToNextSentence}>
            <IoArrowForward style={{ fontSize: "24px" }} />
          </NavButton>
        </NavigationControls>
      </PlayModeContainer>

      <Button onClick={handlePlayPause}>
        {isPlaying ? (
          <IoPause style={{ fontSize: "30px", width: "60px", height: "60px", borderRadius: "30px" }} />
        ) : (
          <IoPlay style={{ fontSize: "30px", width: "60px", height: "60px", borderRadius: "30px" }} />
        )}
      </Button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <VolumeControl />
        <SpeedControl />
      </div>

      <SubtitlesButton onClick={toggleSubtitles} $active={subtitlesVisible}>
        CC
      </SubtitlesButton>
    </ControlsContainer>
  );
});

PlayerControls.displayName = 'PlayerControls';