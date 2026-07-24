// audioDataLeoAdditional.ts
import { getStorageUrl } from "../../services/yandexStorage";
import { AudioTrack } from "../../types";
import { getHelpAudioUrls } from "./helpAudioUrls";
// import your 3 new mp3 files, quiz audio, etc.

const Girls1         = getStorageUrl("leo/additional/1. Girls-part1.mp3");
const Girls2     = getStorageUrl("leo/additional/2. Girls-part2.mp3");
const Girls3 = getStorageUrl("leo/additional/2. Girls-part2.mp3");


export const leoAdditionalAudioData: AudioTrack[] = [
  {
    id: "1",
    title: "Girls",
    audio: Girls1 ,
    helpAudio: getHelpAudioUrls("easy", "leo-additional-1"), // check this signature/path convention
    subtitles: [ /* ... */ ],
    timeMarkers: [ /* ... */ ],
    quiz: [ /* ... */ ],
  },
  {
    id: "2",
    title: "Girls 2",
    audio: Girls2,
    helpAudio: getHelpAudioUrls("easy", "leo-additional-2"), // check this signature/path convention
    subtitles: [ /* ... */ ],
    timeMarkers: [ /* ... */ ],
    quiz: [ /* ... */ ],
  },
  {
    id: "3",
    title: "Girls 3",
    audio: Girls3,
    helpAudio: getHelpAudioUrls("easy", "leo-additional-3"), // check this signature/path convention
    subtitles: [ /* ... */ ],
    timeMarkers: [ /* ... */ ],
    quiz: [ /* ... */ ],
  },
];