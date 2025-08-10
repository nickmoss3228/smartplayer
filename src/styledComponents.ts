import styled from "styled-components";

// #4caf50; - buttons, #f5f5f5 - background color,  hover background color: #45a049;, 

// Type definitions for styled components props
interface SpeedButtonProps {
  $active: boolean; // $-prefix to avoid DOM attribute warnings
}

interface SubtitlesContainterProps {
  $visible: boolean;
}

interface SubtitlesButtonProps {
  $active: boolean;
}

interface PlayModeToggleProps {
  $active: boolean;
}

export const WaveformContainer = styled.div`
  width: 100%;
  height: 80px;
  background: #552626;
  margin: 0 auto;
  border-radius: 8px;
  overflow: visible;
  position: relative;
  padding: 0 2px;

  @media (max-width: 768px) {
    height: 80px;
  }

  @media (max-width: 480px) {
    height: 60px;
  }
`;

export const HoverEffect = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  z-index: 10;
  pointer-events: none;
  height: 80px;
  width: 0;
  mix-blend-mode: overlay;
  background: rgba(255, 255, 255, 0.4);
  opacity: 0;
  transition: opacity 0.2s ease;

  ${WaveformContainer}:hover & {
    opacity: 1;
  }
`;

export const Controls = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 10px;
  @media (max-width: 768px) {
    gap: 10px;
  }
`;

export const Button = styled.button`
  padding: 8px 16px;
  border-radius: 40px;
  border: none;
  background:#773f3f;
  color: white;
  cursor: pointer;

  &:hover {
    background:#8f4c4c;
  }

  @media (max-width: 768px) {
  }

  @media (max-width: 480px) {
  }
`;

export const TimeLabel = styled.div`
  position: absolute;
  z-index: 11;
  bottom: 5px; // Changed from top: 50%
  transform: translateY(0); // Removed vertical centering
  font-size: 11px;
  background: rgba(0, 0, 0, 0.75);
  padding: 2px 6px; // Added horizontal padding
  color: #ddd;
  border-radius: 3px;
  pointer-events: none; // Prevents labels from interfering with waveform interaction

  &#time {
    left: 5px;
  }

  &#duration {
    right: 5px;
  }

  @media (max-width: 768px) {
    font-size: 10px;
    padding: 1px 4px;
  }
`;

export const VolumeControl = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: 20px;

  @media (max-width: 768px) {
    margin-left: 0;
  }

  @media (max-width: 480px) {
    width: 100%;
    justify-content: center;
  }
`;

export const VolumeIcon = styled.div`
  cursor: pointer;
  color: #773f3f;
  display: flex;
  align-items: center;

  &:hover {
   color: #8f4c4c;
  }
`;

export const VolumeSlider = styled.input`
  -webkit-appearance: none;
  width: 100px;
  height: 4px;
  background: #ddd;
  border-radius: 2px;
  outline: none;
  opacity: 0.7;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
  }

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    background: #773f3f;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: #8f4c4c;
      transform: scale(1.2);
    }
  }

  &::-moz-range-thumb {
    width: 12px;
    height: 12px;
    background: #773f3f;
    border-radius: 50%;
    cursor: pointer;
    border: none;
    transition: all 0.2s;

    &:hover {
      background: #8f4c4c;
      transform: scale(1.2);
    }

    @media (max-width: 480px) {
      width: 80px;
    }
  }
`;

export const ControlsContainer = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 10px;
  }
`;

export const SpeedControls = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;

  @media (max-width: 768px) {
    gap: 5px;
  }
`;

export const SpeedButton = styled.button<SpeedButtonProps>`
  padding: 6px 12px;
  border-radius: 4px;
  border: 1px solidrgb(99, 37, 37);
  background-color: ${(props) => (props.$active ?  "rgb(151, 86, 86)" : "rgb(86, 36, 36)")};
  color: ${(props) => (props.$active ? "white" : "white")};
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
  font-family: inherit;

  &:hover {
    background-color: ${(props) => (props.$active ? "#773f3f" : "#8f4c4c")};
  }

  @media (max-width: 768px) {
    padding: 4px 8px;
    font-size: 11px;
  }
`;

export const SubtitlesContainer = styled.div<SubtitlesContainterProps>`
  position: absolute; // Add this
  left: 50%; // Add this
  transform: translateX(-50%); // Add this
  width: 90%; // Add this to control the width
  margin-top: 20px;
  padding: 10px;
  height: 90px;
  background: #773f3f;
  color:white;  
  border-radius: 4px;
  text-align: center;
  display: ${(props) => (props.$visible ? "block" : "none")};
  z-index: 10; // Add this to ensure it appears above other elements

  @media (max-width: 768px) {
    margin-top: 10px;
    height: 40px;
  }
`;

export const SubtitleText = styled.p`
  text-align: center;
  font-size: 24px;
  margin: 0;
  color: white;

  @media (max-width: 768px) {
    font-size: 18px;
  }

  @media (max-width: 480px) {
    font-size: 16px;
  }
`;

export const SubtitlesButton = styled.button<SubtitlesButtonProps>`
  background: ${(props) => (props.$active ?  " #773f3f" : " #8f4c4c")};
  color: ${(props) => (props.$active ? "white" : "#333")};
  border: 1px solid   ;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 5px;
  margin-left: 10px;
  font-family: inherit;

  &:hover {
    background: ${(props) => (props.$active ? "rgb(155, 78, 78)" : " #773f3f")};
  }
`;

export const TimeMarkersContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100%;
  bottom: 0;
`;

export const TimeMarkerLine = styled.div<{ $position: number; color?: string }>`
  position: absolute;
  left: ${(props) => props.$position}%;
  top: 0;
  bottom: 0;
  width: 2px;
  background-color: ${(props) => props.color || "red"};
  cursor: pointer;
  transition: opacity 0.3s ease;
  z-index: 10;

  &:hover {
    opacity: 0.8;
  }

  @media (max-width: 768px) {
    width: 1px;
  }
`;

export const TimeMarkerLabel = styled.span`
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.75);
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  white-space: nowrap;

  @media (max-width: 768px) {
    padding: 2px 4px;
    font-size: 10px;
  }
`;

export const PlayModeContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  margin-left: 20px;

  @media (max-width: 768px) {
    margin-left: 0;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: center;
  }
`;

export const PlayModeToggle = styled.button<PlayModeToggleProps>`
  background: ${(props) => (props.$active ? " #773f3f" :  "rgb(96, 29, 29)")};
  color: white;
  border: none;
  border-radius: 20px;
  padding: 8px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;

  &:hover {
    opacity: 0.9;
  }
`;

export const NavigationControls = styled.div`
  display: flex;
  gap: 10px;

  @media (max-width: 480px) {
    gap: 5px;
  }
`;

export const NavButton = styled.button`
  background: none;
  border: 2px solid " #773f3f"
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: " #773f3f"
  transition: all 0.2s ease;

  &:hover {
    background: " #773f3f"
    color: white;
  }

  &:active {
    transform: scale(0.95);
  }

  @media (max-width: 768px) {
    width: 50px;
    height: 50px;
  }

  @media (max-width: 480px) {
    width: 50px;
    height: 50px;
  }
`;
