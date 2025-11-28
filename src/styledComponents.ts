import styled from "styled-components";

// #4caf50; - buttons, #f5f5f5 - background color,  hover background color: #45a049;, 

interface SpeedButtonProps {
  $active: boolean; 
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

const black = '#212121ff'

// #552626; #8f4c4c; #773f3f;
// #212121ff

export const WaveformContainer = styled.div`
  width: 100%;
  height: 100px;
  background: ${black};
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
  height: 100px;
  width: 0;
  mix-blend-mode: overlay;
  background: rgba(57, 57, 57, 0.74);
  opacity: 0;
  transition: opacity 0.2s ease;

  ${WaveformContainer}:hover & {
    opacity: 1;
  }

  @media (max-width: 768px) {
    height: 80px;
  }

  @media (max-width: 480px) {
    height: 60px;
  }
`;

export const Controls = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 10px;
  background-color: black;

  @media (max-width: 768px) {
    gap: 10px;
  }
`;

export const Button = styled.button`
  padding: 12px 16px;
  border: none;
  background:white;
  color: black;
  cursor: pointer;

  &:hover {
    background:white;
  }

  @media (max-width: 768px) {
  }

  @media (max-width: 480px) {
  }
`;

export const TimeLabel = styled.div`
  position: absolute;
  z-index: 11;
  bottom: 5px;
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

// New container for volume and speed controls
export const VolumeSpeedContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  background-color:white;
  padding: 25px;

  @media (max-width: 768px) {
    gap: 10px;
  }
`;

export const VolumeControl = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: 10px;

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
  color: #4f4f4fff;
  display: flex;
  align-items: center;

  &:hover {
   color:  ${black};
  }
`;

export const VolumeSlider = styled.input`
  -webkit-appearance: none;
  width: 130px;
  height: 3px;
  background: #ddd;
  border-radius: 3px;
  outline: none;
  opacity: 0.7;
  transition: opacity 0.2s;
  cursor:pointer;

  &:hover {
    opacity: 1;
  }

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    background:  ${black};
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: #202020ff;
      transform: scale(1.2);
    }
  }

  &::-moz-range-thumb {
    width: 12px;
    height: 12px;
    background: #232323ff;
    border-radius: 50%;
    cursor: pointer;
    border: none;
    transition: all 0.2s;

    &:hover {
      background: #2e2e2eff;
      transform: scale(1.2);
    }

    @media (max-width: 480px) {
      width: 80px;
    }
  }
`;

export const ControlsContainer = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: ${black};
  margin-top:15px;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 10px;
  }
`;

// export const SpeedControls = styled.div`
//   display: flex;
//   gap: 8px;
//   flex-wrap: wrap;
//   justify-content: center;

//   @media (max-width: 768px) {
//     gap: 5px;
//   }
// `;

// export const SpeedButton = styled.button<SpeedButtonProps>`
//   padding: 6px 12px;
//   border-radius: 4px;
//   border: 1px solidrgb(99, 37, 37);
//   background-color: ${(props) => (props.$active ?  "rgb(151, 86, 86)" : "rgb(86, 36, 36)")};
//   color: ${(props) => (props.$active ? "white" : "white")};
//   cursor: pointer;
//   font-size: 22px;
//   transition: all 0.2s;
//   font-family: inherit;

//   &:hover {
//     background-color: ${(props) => (props.$active ? "#773f3f" : "#8f4c4c")};
//   }

//   @media (max-width: 768px) {
//     padding: 4px 8px;
//     font-size: 11px;
//   }
// `;

export const SubtitlesContainer = styled.div<SubtitlesContainterProps>`
  position: relative; 
  width: 100%;
  margin-top: 20px;
  padding: 10px;
  height: 70px;
  background:  ${black};
  color: white;  
  font-family:monospace;
  border-radius: 4px;
  text-align: center;
  display: ${(props) => (props.$visible ? "block" : "none")};
  z-index: 10; 

  @media (max-width: 768px) {
    margin-top: 10px;
    height: 40px;
  }
`;

export const SubtitleText = styled.p`
  text-align: center;
  font-size: 23px;
  margin: 0;
  color: white;
  letter-spacing:0px;
  font-weight: 500;
  font-family: Montserrat;

  @media (max-width: 768px) {
    font-size: 18px;
  }

  @media (max-width: 480px) {
    font-size: 16px;
  }
`;

// background: ${(props) => (props.$active ?  " #773f3f" : " #8f4c4c")};
export const SubtitlesButton = styled.button<SubtitlesButtonProps>`
  background: ${(props) => (props.$active ?  " #fafafaff" : " #808080ff")};
  color: ${(props) => (props.$active ? "#222222ff" : "#222222ff")};
  padding:30px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 5px;
  margin-left:0px;
  letter-spacing:1px;
  font-weight: 500;
  font-family: Montserrat;


  &:hover {
    background: ${(props) => (props.$active ? "rgba(144, 144, 144, 1)" : " #f4f4f4ff")};
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
  justify-content:center;
  gap: 20px;

  min-width: 200px; // Fixed width to maintain space
  font-weight:600;
  background-color: white;

  @media (max-width: 768px) {
    gap: 10px;
    min-width: 150px;
  }
`;

export const PlayModeToggle = styled.button<PlayModeToggleProps>`
  background: ${(props) => (props.$active ? 'black' : 'rgba(108, 108, 108, 1)')};
  color: white;
  border: none;
  border-radius: 20px;
  margin-left: 35px;
  padding: 8px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: black;

  &:hover {
    opacity: 0.9;
  }

  &:active {
  }
`;

export const NavigationControls = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  color:black;
  background-color:white;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 10px;
  }
`;

export const NavButton = styled.button`
  background: none;
  border: 2px solid " #ffffffff"
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #000000ff
  transition: all 0.2s ease;

  &:hover {
    background: " #000000ff"
    color: white;
  }

  &:active {
    transform: scale(0.95);
  }

  &:disabled {
    opacity: 0.5;  // Dim the button when disabled
    cursor: not-allowed;  // Show forbidden cursor
    pointer-events: none;  // Fully prevent interactions
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

export const DropdownContainer = styled.div`
  position: relative;
  display: inline-block;
  letter-spacing:0px;
  font-weight: 500;
  font-family: Montserrat;

`;

export const DropdownButton = styled.button`
  background: #121212ff;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.2s ease;
  font-family: inherit;

  &:hover {
    background: #131313ff;
  }

  &:after {
    content: '▼';
    font-size: 10px;
  }
`;

export const DropdownMenu = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: 100%;
  left: 0;
  background: #242424ff;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  min-width: 80px;
  display: ${props => props.$isOpen ? 'block' : 'none'};
  overflow: hidden;
`;

export const DropdownItem = styled.button<SpeedButtonProps>`
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: ${props => props.$active ? '#161616ff' : 'transparent'};
  color: white;
  cursor: pointer;
  font-size: 12px;
  text-align: left;
  transition: background 0.2s ease;
  font-family: inherit;

  &:hover {
    background: #141414ff;
  }

  &:not(:last-child) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
`;

// import {
//   WaveformContainer,
//   HoverEffect,
//   Button,
//   TimeLabel,
//   VolumeControl,
//   VolumeIcon,
//   VolumeSlider,
//   ControlsContainer,
//   SubtitlesContainer,
//   SubtitleText,
//   SubtitlesButton,
//   TimeMarkersContainer,
//   TimeMarkerLine,
//   TimeMarkerLabel,
//   PlayModeContainer,
//   PlayModeToggle,
//   NavigationControls,
//   NavButton,
//   DropdownContainer,
//   VolumeSpeedContainer,
//   DropdownButton,
//   DropdownItem,
//   DropdownMenu,
// } from "../styledComponents";
