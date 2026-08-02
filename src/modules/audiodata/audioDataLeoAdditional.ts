// audioDataLeoAdditional.ts
import { getStorageUrl } from "../../services/yandexStorage";
import { AudioTrack } from "../../types";
import { getHelpAudioUrls } from "./helpAudioUrls";
// import your 3 new mp3 files, quiz audio, etc.

const Girls1         = getStorageUrl("leo/additional/1. Girls-part1.mp3");
const Girls2     = getStorageUrl("leo/additional/2. Girls-part2.mp3");
// const Girls3 = getStorageUrl("leo/additional/2. Girls-part2.mp3");


export const leoAdditionalAudioData: AudioTrack[] = [
  {
    id: "1",
    title: "Ava and Katrin",
    audio: Girls1 ,
    helpAudio: getHelpAudioUrls("easy", "leo-additional-1"), // check this signature/path convention
    subtitles: [ /* ... */ ],
    timeMarkers: [ /* ... */ ],
    quiz: [{
        question: "Where did Leo find the kitten?",
        options: [
          "In a box",
          "Under a car",
          "In the park",
          "On the street",
        ],
        correctAnswer: 1,
        referenceTime: 0,
        audio: { fast: "1", slow: "1" },
      },
      {
        question: "What did Leo give the kitten first?",
        options: ["Cat food", "Cookies", "Cold water", "Warm milk"],
        correctAnswer: 3,
        referenceTime: 0,
        audio: { fast: "1", slow: "1" },
      },
      {
        question: "Who helped Leo with medicine for the kitten?",
        options: ["His mother", "A neighbor", "His sister Mia", "A vet clinic"],
        correctAnswer: 2,
        referenceTime: 0,
        audio: { fast: "1", slow: "1" },
      },
      {
        question: "How did Leo try to find the kitten's owners?",
        options: [
          "He called the police",
          "He asked his neighbors",
          "He made posters and posted online",
          "He went to the vet",
        ],
        correctAnswer: 2,
        referenceTime: 0,
        audio: { fast: "1", slow: "1" },
      },
      {
        question: "Who came to take the kitten?",
        options: [
          "An old man",
          "A young couple",
          "Another cat owner",
          "A little girl and her mother",
        ],
        correctAnswer: 2,
        referenceTime: 0,
        audio: { fast: "1", slow: "1" },
      }],
  },
  {
    id: "2",
    title: "Ava and Sofia",
    audio: Girls2,
    helpAudio: getHelpAudioUrls("easy", "leo-additional-2"), // check this signature/path convention
    subtitles: [ /* ... */ ],
    timeMarkers: [ /* ... */ ],
    quiz: [ /* ... */ ],
  },
  // {
  //   id: "3",
  //   title: "Girls 3",
  //   audio: Girls3,
  //   helpAudio: getHelpAudioUrls("easy", "leo-additional-3"), // check this signature/path convention
  //   subtitles: [ /* ... */ ],
  //   timeMarkers: [ /* ... */ ],
  //   quiz: [ /* ... */ ],
  // },
];