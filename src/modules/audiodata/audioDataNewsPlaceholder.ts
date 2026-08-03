// audioDataNewsPlaceholder.ts
//
// Placeholder tracks for the "News and Interesting things" story group (easy/Leo).
// No real audio/subtitles content yet — `audio: ""` intentionally left empty so
// the waveform simply stays empty until real files are wired in. Replace `audio` with
// a getStorageUrl(...)/imported mp3 path and fill in subtitles/timeMarkers per
// track once content is ready, following the pattern in audioDataLeoAdditional.ts.
// Quiz content for these stories now lives on the backend (config/quizData.js) once
// written — see the smartplayer_quiz_backend_validation memory for the pattern.
import { AudioTrack } from "../../types";

const placeholderTracks = (titles: [string, string]): AudioTrack[] => [
  {
    id: "1",
    title: titles[0],
    audio: "",
    subtitles: [],
    timeMarkers: [],
  },
  {
    id: "2",
    title: titles[1],
    audio: "",
    subtitles: [],
    timeMarkers: [],
  },
];

export const newsRolandGarrosAudioData: AudioTrack[] = placeholderTracks(["Story", "Discussion"]);
export const newsFamilyVisitAudioData: AudioTrack[] = placeholderTracks(["Story", "Discussion"]);
export const newsGrazingBoardAudioData: AudioTrack[] = placeholderTracks(["Story", "Discussion"]);
