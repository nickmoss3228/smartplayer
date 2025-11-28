import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Subtitle {
  startTime: number;
  endTime: number;
  text: string;
}

interface TimeMarker {
  time: number;
}

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
  subtitles: Subtitle[]; 
  timeMarkers: (TimeMarker | number)[]; 
}

const initialState: PlayerState = {
  currentMarkerIndex: 0,
  isPlaying: false,
  volume: 1,
  isMuted: false,
  playbackRate: 1.0,
  subtitlesVisible: false,
  isPlayMode: false,
  currentTime: "0:00",
  durationSeconds: 0,
  duration: "0:00",
  activeSubtitle: '',
  subtitles: [],
  timeMarkers: [], 
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
    },
    setSubtitles: (state, action: PayloadAction<Subtitle[]>) => {
      state.subtitles = action.payload;
    },
    setTimeMarkers: (state, action: PayloadAction<(TimeMarker | number)[]>) => {
      state.timeMarkers = action.payload;
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
  setActiveSubtitle,
  setSubtitles,
  setTimeMarkers 
} = playerSlice.actions;

export default playerSlice.reducer;