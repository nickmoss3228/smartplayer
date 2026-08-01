// audioDataNewsPlaceholder.ts
//
// Placeholder tracks for the "News and Interesting things" story group (easy/Leo).
// No real audio/subtitles/quiz content yet — `audio: ""` intentionally left empty so
// the waveform simply stays empty until real files are wired in. Replace `audio` with
// a getStorageUrl(...)/imported mp3 path and fill in subtitles/timeMarkers/quiz per
// track once content is ready, following the pattern in audioDataLeoAdditional.ts.
import { AudioTrack } from "../../types";

const placeholderTracks = (titles: [string, string]): AudioTrack[] => [
  {
    id: "1",
    title: titles[0],
    audio: "",
    subtitles: [],
    timeMarkers: [],
    quiz: [],
  },
  {
    id: "2",
    title: titles[1],
    audio: "",
    subtitles: [],
    timeMarkers: [],
    quiz: [],
  },
];

export const newsRolandGarrosAudioData: AudioTrack[] = placeholderTracks(["Story", "Discussion"]);
export const newsFamilyVisitAudioData: AudioTrack[] = placeholderTracks(["Story", "Discussion"]);
export const newsGrazingBoardAudioData: AudioTrack[] = placeholderTracks(["Story", "Discussion"]);
