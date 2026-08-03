//Easy level Audios
// const Leoslife = "/assets/leo/1. Meet Leo.mp3";
// const Leosmornings = "/assets/leo/2. Leo's Mornings.mp3";
// const Leosfavoritefood = "/assets/leo/3. Leo's Favorite Food.mp3";
// const Leosfamily = "/assets/leo/4. Leo's family.mp3";
// const Leosclothes = "/assets/leo/5. Leo's Clothes.mp3";
// const Adayatthebeach = "/assets/leo/6. A day at the beach.mp3";
// const Acountry = "/assets/leo/7. A country Leo wants to visit.mp3";
// const Leoshobbies = "/assets/leo/8. Leo's Hobbies.mp3";
// const Meetingafriend = "/assets/leo/9. Meeting A Friend.mp3";
// const TheLostKitten = "/assets/leo/10. The Lost Kitten.mp3";

const Leoslife         = getStorageUrl("leo/1. Meet Leo.mp3");
const Leosmornings     = getStorageUrl("leo/2. Leo's Mornings.mp3");
const Leosfavoritefood = getStorageUrl("leo/3. Leo's Favorite Food.mp3");
const Leosfamily       = getStorageUrl("leo/4. Leo's family.mp3");
const Leosclothes      = getStorageUrl("leo/5. Leo's Clothes.mp3");
const Adayatthebeach   = getStorageUrl("leo/6. A day at the beach.mp3");
const Acountry         = getStorageUrl("leo/7. A country Leo wants to visit.mp3");
const Leoshobbies      = getStorageUrl("leo/8. Leo's Hobbies.mp3");
const Meetingafriend   = getStorageUrl("leo/9. Meeting A Friend.mp3");
const TheLostKitten    = getStorageUrl("leo/10. The Lost Kitten.mp3");

import { getStorageUrl } from "../../services/yandexStorage";











import { AudioTrack } from "../../types";
import { getHelpAudioUrls } from "./helpAudioUrls";

export const audioTracks: AudioTrack[] = [
  {
    id: "1",
    title: "Leo's Life",
    audio: Leoslife,
    helpAudio: getHelpAudioUrls("easy", "1"), 
    subtitles: [
      { startTime: 0.1, endTime: 1, text: "Meet Leo." },
    ],
    timeMarkers: [
      { time: 0.1, label: "1", color: "red" },
      { time: 2.5, label: "2", color: "red" },
      { time: 4.5, label: "3", color: "red" },
      { time: 6.4, label: "4", color: "red" },
      { time: 9.4, label: "5", color: "red" },
      { time: 12.3, label: "6", color: "red" },
      { time: 17, label: "7", color: "red" },
      { time: 20.8, label: "8", color: "red" },
      { time: 23.8, label: "9", color: "red" },
      { time: 29, label: "10", color: "red" },
      { time: 33, label: "11", color: "red" },
      { time: 37.6, label: "12", color: "red" },
      { time: 43.4, label: "13", color: "red" },
      { time: 47, label: "14", color: "red" },
      { time: 53.4, label: "15", color: "red" },
      { time: 60.5, label: "16", color: "red" },
    ],

  },
  {
    id: "2",
    title: "Leo's Mornings",
    audio: Leosmornings,
    helpAudio: getHelpAudioUrls("easy", "2"),
    subtitles: [
      { startTime: 0.1, endTime: 2.7, text: "2. Leo's mornings." },
    ],
    timeMarkers: [
      { time: 0.1, label: "1", color: "red" },
      { time: 3, label: "2", color: "red" },
      { time: 9, label: "3", color: "red" },
      { time: 18.5, label: "4", color: "red" },
      { time: 24.3, label: "5", color: "red" },
      { time: 31.3, label: "6", color: "red" },
      { time: 41.4, label: "7", color: "red" },
      { time: 49, label: "8", color: "red" },
      { time: 56, label: "9", color: "red" },
      { time: 62.2, label: "10", color: "red" },
      { time: 69.8, label: "11", color: "red" },
      { time: 79, label: "12", color: "red" },
      { time: 90.5, label: "13", color: "red" },
      { time: 99.6, label: "14", color: "red" },
      { time: 109.9, label: "15", color: "red" },
      { time: 117, label: "16", color: "red" },
    ],

  },
  {
    id: "3",
    title: "Leo's Favorite Food",
    audio: Leosfavoritefood,
    helpAudio: getHelpAudioUrls("easy", "3"),
    subtitles: [
      { startTime: 0.1, endTime: 3.2, text: "3. Leo's favorite food." },
    ],
    timeMarkers: [
      { time: 0, label: "1", color: "red" },
      { time: 4.3, label: "2", color: "red" },
      { time: 9, label: "3", color: "red" },
      { time: 14.3, label: "4", color: "red" },
      { time: 18, label: "5", color: "red" },
      { time: 28, label: "6", color: "red" },
      { time: 35.4, label: "7", color: "red" },
      { time: 41, label: "8", color: "red" },
      { time: 49, label: "9", color: "red" },
      { time: 58.3, label: "10", color: "red" },
      { time: 64.4, label: "11", color: "red" },
      { time: 72.3, label: "12", color: "red" },
      { time: 77.2, label: "13", color: "red" },
      { time: 87, label: "14", color: "red" },
      { time: 92.4, label: "15", color: "red" },
      { time: 103, label: "16", color: "red" },

    ],

  },
  {
    id: "4",
    title: "Leo's Family",
    audio: Leosfamily,
    helpAudio: getHelpAudioUrls("easy", "4"),
    subtitles: [
      { startTime: 0.1, endTime: 3.4, text: "4. Leo's Family" },
    ],
    timeMarkers: [
      { time: 0.1, label: "1", color: "red" },
      { time: 8.1, label: "2", color: "red" },
      { time: 14, label: "3", color: "red" },
      { time: 20, label: "4", color: "red" },
      { time: 25, label: "5", color: "red" },
      { time: 30.5, label: "6", color: "red" },
      { time: 38, label: "7", color: "red" },
      { time: 44, label: "8", color: "red" },
      { time: 49.3, label: "9", color: "red" },
      { time: 55, label: "10", color: "red" },
      { time: 60.9, label: "11", color: "red" },
      { time: 67.5, label: "12", color: "red" },
      { time: 73, label: "13", color: "red" },
      { time: 79, label: "14", color: "red" },
      { time: 85.8, label: "15", color: "red" },
      { time: 92, label: "16", color: "red" },
      { time: 97, label: "17", color: "red" },
      { time: 105, label: "18", color: "red" },
    ],

  },
  {
    id: "5",
    title: "Leo's Clothes",
    audio: Leosclothes,
    helpAudio: getHelpAudioUrls("easy", "5"),
    subtitles: [
      { startTime: 0.1, endTime: 3, text: "5. Leo's Clothes" },
    ],
    timeMarkers: [
      { time: 0.1, label: "1", color: "red" },
      { time: 7.3, label: "2", color: "red" },
      { time: 14.6, label: "3", color: "red" },
      { time: 18, label: "4", color: "red" },
      { time: 23.3, label: "5", color: "red" },
      { time: 31.3, label: "6", color: "red" },
      { time: 35, label: "7", color: "red" },
      { time: 42.7, label: "8", color: "red" },
      { time: 53.3, label: "9", color: "red" },
      { time: 58.5, label: "10", color: "red" },
      { time: 65.3, label: "11", color: "red" },
      { time: 70, label: "12", color: "red" },
      { time: 76.6, label: "13", color: "red" },
      { time: 84, label: "14", color: "red" },
      { time: 87.5, label: "15", color: "red" },
      { time: 94, label: "16", color: "red" },

    ],

  },
  {
    id: "6",
    title: "A day at the Beach",
    audio: Adayatthebeach,
    helpAudio: getHelpAudioUrls("easy", "6"),
    subtitles: [
      { startTime: 0.1, endTime: 3, text: "6. A day at the beach." },
    ],
    timeMarkers: [
      { time: 0.1, label: "1", color: "red" },
      { time: 4.3, label: "2", color: "red" },
      { time: 12.2, label: "3", color: "red" },
      { time: 19.4, label: "4", color: "red" },
      { time: 26, label: "5", color: "red" },
      { time: 30, label: "6", color: "red" },
      { time: 36, label: "7", color: "red" },
      { time: 43, label: "8", color: "red" },
      { time: 46, label: "9", color: "red" },
      { time: 49.5, label: "10", color: "red" },
      { time: 52, label: "11", color: "red" },
      { time: 56.3, label: "12", color: "red" },
      { time: 59, label: "13", color: "red" },
      { time: 63, label: "14", color: "red" },
      { time: 71, label: "15", color: "red" },
    ],

  },

  {
    id: "7",
    title: "A country that Leo wants to visit",
    audio: Acountry,
    helpAudio: getHelpAudioUrls("easy", "7"),
    subtitles: [
      { startTime: 0.1, endTime: 4, text: "7. A Country Leo Wants to Visit" },
    ],
    timeMarkers: [
      { time: 0.1, label: "1", color: "red" },
      { time: 5, label: "2", color: "red" },
      { time: 9, label: "3", color: "red" },
      { time: 12, label: "4", color: "red" },
      { time: 18.4, label: "5", color: "red" },
      { time: 23, label: "6", color: "red" },
      { time: 31, label: "7", color: "red" },
      { time: 36, label: "8", color: "red" },
      { time: 43, label: "9", color: "red" },
      { time: 46, label: "10", color: "red" },
      { time: 52.3, label: "11", color: "red" },
      { time: 57, label: "12", color: "red" },
      { time: 67, label: "13", color: "red" },
      { time: 71, label: "14", color: "red" },
      { time: 77.7, label: "15", color: "red" },
    ],

  },
  {
    id: "8",
    title: "Leo's hobbies",
    audio: Leoshobbies,
    helpAudio: getHelpAudioUrls("easy", "8"),
    subtitles: [
      { startTime: 0.1, endTime: 2.5, text: "8. Leo’s hobbies " },
    ],
    timeMarkers: [
      { time: 0.1, label: "1", color: "red" },
      { time: 4.8, label: "2", color: "red" },
      { time: 10.7, label: "3", color: "red" },
      { time: 19, label: "4", color: "red" },
      { time: 26.5, label: "5", color: "red" },
      { time: 29.6, label: "6", color: "red" },
      { time: 37, label: "7", color: "red" },
      { time: 48.5, label: "8", color: "red" },
      { time: 55, label: "9", color: "red" },
      { time: 62.9, label: "10", color: "red" },
      { time: 68.3, label: "11", color: "red" },
      { time: 77, label: "12", color: "red" },
      { time: 80.3, label: "13", color: "red" },
      { time: 90, label: "14", color: "red" },
      { time: 96.4, label: "15", color: "red" },
      { time: 103.5, label: "16", color: "red" },
      { time: 109.8, label: "17", color: "red" },
    ],

  },
  {
    id: "9",
    title: "Meeting a friend",
    audio: Meetingafriend,
    helpAudio: getHelpAudioUrls("easy", "9"),
    subtitles: [
      { startTime: 0.1, endTime: 4, text: "9. Meeting a Friend" },
    ],
    timeMarkers: [
      { time: 0.1, label: "1", color: "red" },
      { time: 3.5, label: "2", color: "red" },
      { time: 15, label: "3", color: "red" },
      { time: 24, label: "4", color: "red" },
      { time: 30.8, label: "5", color: "red" },
      { time: 43, label: "6", color: "red" },
      { time: 47.8, label: "7", color: "red" },
      { time: 58.6, label: "8", color: "red" },
      { time: 65, label: "9", color: "red" },
      { time: 73, label: "10", color: "red" },
      { time: 92.5, label: "11", color: "red" },
      { time: 96, label: "12", color: "red" },
      { time: 103, label: "13", color: "red" },
      { time: 112.5, label: "14", color: "red" },
      { time: 119.3, label: "15", color: "red" },
      { time: 125.4 , label: "16", color: "red" },
      { time: 130.3, label: "17", color: "red" },
    ],

  },
  {
    id: "10",
    title: "The Lost Kitten",
    audio: TheLostKitten,
    helpAudio: getHelpAudioUrls("easy", "10"),
    subtitles: [
      { startTime: 0.1, endTime: 2.7, text: "10. The Lost Kitten" },
    ],
    timeMarkers: [
      { time: 0.1, label: "1", color: "red" },
      { time: 4.4, label: "2", color: "red" },
      { time: 11.4, label: "3", color: "red" },
      { time: 17, label: "4", color: "red" },
      { time: 21.5, label: "5", color: "red" },
      { time: 31, label: "6", color: "red" },
      { time: 36.9, label: "7", color: "red" },
      { time: 44.5, label: "8", color: "red" },
      { time: 51.4, label: "9", color: "red" },
      { time: 60.7, label: "10", color: "red" },
      { time: 68.3, label: "11", color: "red" },
      { time: 73.4, label: "12", color: "red" },
      { time: 83, label: "13", color: "red" },
      { time: 89.6, label: "14", color: "red" },
      { time: 99, label: "15", color: "red" },
      { time: 110.8, label: "16", color: "red" },
      { time: 120.5, label: "17", color: "red" },
      { time: 128.6, label: "18", color: "red" },
      { time: 135.3, label: "19", color: "red" },
      { time: 142.7, label: "20", color: "red" },
      { time: 150, label: "21", color: "red" },
      { time: 157, label: "22", color: "red" },

    ],

  },
];

// // type definition
// export interface VocabEntry {
//   word: string;
//   definition: string;
//   audioKey: string; // English filename without extension, used when word is non-Latin
// }

// export const trackFolderMap: Record<string, string> = {
//   "1":  "1.leo's life",
//   "2":  "2. leo's mornings",
//   "3":  "3. leo's favorite food",
//   "4":  "4. leo's family",
//   "5":  "5. leo's clothes",
//   "6":  "6. a day at the beach",
//   "7":  "7. a country that Leo wants to visit",
//   "8":  "8. leo's hobbies",
//   "9":  "9. meeting a friend",
//   "10": "10. the lost kitten",
// };

// export const trackVocabulary: Record<string, VocabEntry[]> = {
//   "1": [
//     { word: "квартира", definition: "1",audioKey: "flat" },
//     { word: "местный магазин", definition: "1", audioKey: "local shop"},
//     { word: "удобный", definition: "1", audioKey: "convenient"},
//     { word: "добрый", definition: "1", audioKey: "kind"},
//     { word: "дружелюбный", definition: "1", audioKey: "friendly"},
//     { word: "просто", definition: "1", audioKey: "just"},
//     { word: "около", definition: "1", audioKey: "near"},
//     { word: "неплохо", definition: "1", audioKey: "pretty good"},
//     { word: "каждый день", definition: "1", audioKey: "every day"},
//     { word: "много друзей", definition: "1", audioKey: "a lot of friends"},
//     { word: "только", definition: "1", audioKey: "only" },
    
//   ],
//   "2": [
//     { word: "жаворонок", definition: "1", audioKey: "lark"},
//     { word: "счастливые носки",definition: "1",audioKey: "lucky socks"},
//     { word: "расслабиться",definition: "1", audioKey: "relax"},
//     { word: "продажи падают", definition: "1", audioKey: "sales are going down"},
//     { word: "кормить", definition: "1", audioKey: "feed"},
//     { word: "чистить зубы", definition: "1", audioKey: "brush my teeth"},
//     { word: "брюки", definition: "1", audioKey: "trousers"},
//     { word: "ответить", definition: "1", audioKey: "answer"},
//     { word: "тихое утро", definition: "1", audioKey: "quiet mornings"},
//     { word: "занятый", definition: "1", audioKey: "busy"},
//     { word: "расстроенный", definition: "1", audioKey: "upset"},
//     { word: "прилечь", definition: "1", audioKey: "lay down"},
//   ],
//   "3": [
//     { word: "есть", definition: "1", audioKey: "eat"},
//     { word: "тесто", definition: "1", audioKey: "dough" },
//     { word: "пекарня", definition: "1",audioKey: "bakery"},
//     { word: "яблочный пирог", definition: "1",audioKey: "apple pie"},
//     { word: "лазанья", definition: "1", audioKey: "lasagna"},
//     { word: "скидка", definition: "1", audioKey: "discount" },
//     { word: "процент", definition: "1", audioKey: "percent" },
//     { word: "ручной работы", definition: "1", audioKey: "handmade" },
//     { word: "вредный для здоровья", definition: "1", audioKey: "unhealthy"},
//   ],
//   "4": [
//     { word: "двоюродная сестра", definition: "1", audioKey: "cousin"},
//     { word: "галерея", definition: "1", audioKey: "art gallery"},
//     { word: "экзамены", definition: "1", audioKey: "exams"},
//     { word: "бизнес", definition: "1", audioKey: "business"},
//     { word: "вместе", definition: "1", audioKey: "together" },
//     { word: "молодой", definition: "1", audioKey: "young" },
//     { word: "сканированные фото", definition: "1", audioKey: "scans" },
//     { word: "почти", definition: "1", audioKey: "almost" },
//     { word: "жаловаться", definition: "1", audioKey: "complain" },
//     { word: "готовиться", definition: "1", audioKey: "prepare" },
//     { word: "школьный класс", definition: "1", audioKey: "grade" },
//     { word: "лицом к лицу, лично", definition: "1", audioKey: "face to face" },
    
//   ],
//   "5": [
//     { word: "тренды", definition: "1", audioKey: "trends"},
//     { word: "модный", definition: "1", audioKey: "fashionable"},
//     { word: "удобный", definition: "1", audioKey: "comfortable"},
//     { word: "шерстяной свитер", definition: "1", audioKey: "woolen sweater"},
//     { word: "форма", definition: "1",audioKey: "uniform"},
//     { word: "костюм", definition: "1", audioKey: "suit" },
//     { word: "кепка", definition: "1", audioKey: "cap" },
//     { word: "платье", definition: "1", audioKey: "a dress"},
//     { word: "потные", definition: "1", audioKey: "sweaty"},
//     { word: "аккуратный и опрятный", definition: "1", audioKey: "neat and tidy" },
//     { word: "наряд", definition: "1", audioKey: "outfit" },    
//   ],
//   "6": [
//     { word: "поездка", definition: "1", audioKey: "a trip"},
//     { word: "вспоминть", definition: "1", audioKey: "recall" },
//     { word: "обычный день", definition: "1", audioKey: "a usual day" },
//     { word: "пляж", definition: "1", audioKey: "a beach"},
//     { word: "замок", definition: "1", audioKey: "a castle"},
//     { word: "берег",definition: "1", audioKey: "a shore"},
//     { word: "напуганный", definition: "1", audioKey: "scared"},
//     { word: "акула", definition: "1",  audioKey: "a shark" },
//     { word: "научил себя сам", definition: "1", audioKey: "taught himself"},
//     { word: "купальник", definition: "1", audioKey: "swimming suit"},
//     { word: "напоминать", definition: "1", audioKey: "remind" },
//   ],
//   "7": [
//     { word: "гондола", definition: "1", audioKey: "gondola"},
//     { word: "настоящий", definition: "1", audioKey: "authentic"},
//     { word: "джелато", definition: "1", audioKey: "gelato"},
//     { word: "копить деньги", definition: "1", audioKey: "saving money"},
//     { word: "мечта сбывается", definition: "1", audioKey: "dream come true" },
//     { word: "путешествовать", definition: "1", audioKey: "travel"},
//     { word: "опасный", definition: "1", audioKey: "dangerous"},
//   ],
//   "8": [
//     { word: "билет", definition: "1", audioKey: "a ticket" },
//     { word: "информировать", definition: "1", audioKey: "inform" },
//     { word: "продуктивный", definition: "1", audioKey: "productive"},
//     { word: "нападающий", definition: "1", audioKey: "attacker" },
//     { word: "дарить", definition: "1", audioKey: "gift"},
//     { word: "спортивное поле", definition: "1", audioKey: "sports field"},
//     { word: "напряжённый", definition: "1", audioKey: "stressful" },
//     { word: "сериалы на Netflix", definition: "1", audioKey: "netflix series"},
//     { word: "коллекция DVD", definition: "1", audioKey: "DVD collection"},
//     { word: "капитан команды", definition: "1", audioKey: "team captain"},
//   ],
//   "9": [
//     { word: "старый друг", definition: "1",audioKey: "old friend"},
//     { word: "кафе", definition: "1", audioKey: "cafe"},
//     { word: "уютный", definition: "1", audioKey: "cozy"}, 
//     { word: "великолепный", definition: "1", audioKey: "wonderful"},
//     { word: "очевидно", definition: "1", audioKey: "obviously"},
//     { word: "получить по заслугам", definition: "1", audioKey: "get the beatings"},
//     { word: "приключения", definition: "1", audioKey: "adventures"},
//     { word: "смеяться", definition: "1", audioKey: "laugh" },
//     { word: "важный", definition: "1", audioKey: "important"},
//     { word: "планы на будущее", definition: "1", audioKey: "plans for the future"},
//     { word: "рабочая поездка", definition: "1",audioKey: "work trip"},
//     { word: "скучать", definition: "1",audioKey: "miss"},
//     { word: "попрощался", definition: "1", audioKey: "said goodbye" },
//     { word: "крошечный",definition: "1",audioKey: "tiny"},
//   ],
//   "10": [
//     { word: "мягкий", definition: "1", audioKey: "soft" },
//     { word: "трястись",definition: "1",audioKey: "shake"},
//     { word: "бережно", definition: "1", audioKey: "carefully"},
//     { word: "убежать", definition: "1-", audioKey: "run away" },
//     { word: "магазин у дома", definition: "1-", audioKey: "convenience shop" },
//     { word: "одеяло",definition: "1-",audioKey: "blanket"},
//     { word: "ветеринар",definition: "1",audioKey: "veterinarian"},
//     { word: "постеры", definition: "1", audioKey: "posters" },
//     { word: "район",definition: "1", audioKey: "neighborhood" },
//     { word: "социальные сети",definition: "1", audioKey: "social media" },
//   ],
// };

// // Helper function to get a specific track
// export const getAudioTrack = (id: string): AudioTrack | undefined => {
//   return audioTracks.find((track) => track.id === id);
// };
