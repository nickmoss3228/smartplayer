import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface PlayerState {
  currentMarkerIndex: number;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  subtitlesVisible: boolean;
  isPlayMode: boolean;
  currentTime: string;
  durationSeconds: number;
  duration: string;
  activeSubtitle: string;
}

const initialState: PlayerState = {
  currentMarkerIndex: 0,
  isPlaying: false,
  volume: 1,
  isMuted: false,
  playbackRate: 1.0,
  subtitlesVisible: true,
  isPlayMode: true,
  currentTime: "0:00",
  durationSeconds: 0,
  duration: "0:00",
  activeSubtitle: '',
};

const playerSlice = createSlice({
  name: 'player',
  initialState, 
  reducers: {
    setCurrentMarkerIndex: (state, action: PayloadAction<number>) => {
      state.currentMarkerIndex = action.payload;
    },
    setIsPlaying: (state, action: PayloadAction<boolean>) => {
      state.isPlaying = action.payload;
    },
    setVolume: (state, action: PayloadAction<number>) => {
      state.volume = action.payload;
    },
    setIsMuted: (state, action: PayloadAction<boolean>) => {
      state.isMuted = action.payload;
    },
    setPlaybackRate: (state, action: PayloadAction<number>) => {
      state.playbackRate = action.payload;
    },
    setSubtitlesVisible: (state, action: PayloadAction<boolean>) => {
      state.subtitlesVisible = action.payload;
    },
    setIsPlayMode: (state, action: PayloadAction<boolean>) => {
      state.isPlayMode = action.payload;
    },
    setCurrentTime: (state, action: PayloadAction<string>) => {
      state.currentTime = action.payload;
    },
    setDurationSeconds: (state, action: PayloadAction<number>) => {
      state.durationSeconds = action.payload;
    },
    setDuration: (state, action: PayloadAction<string>) => {
      state.duration = action.payload;
    },
    setActiveSubtitle: (state, action: PayloadAction<string>) => {
      state.activeSubtitle = action.payload;
    }
  }
});

export const {
  setCurrentMarkerIndex,
  setIsPlaying,
  setVolume,
  setIsMuted,
  setPlaybackRate,
  setSubtitlesVisible,
  setIsPlayMode,
  setCurrentTime,
  setDurationSeconds,
  setDuration,
  setActiveSubtitle
} = playerSlice.actions;

export default playerSlice.reducer;