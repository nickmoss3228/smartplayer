// audioDataNewsPlaceholder.ts
//
// Tracks for the "News and Interesting things" story group (easy/Leo). Every
// news story is a source article (part 1, "Story") plus the linked
// conversation (part 2, "Discussion").
//
// Roland Garros and Grazing Board now have real recordings in the bucket;
// Family Visit is still a placeholder (`audio: ""` intentionally left empty so
// the waveform simply stays empty instead of 404ing until its files exist).
//
// Bucket layout for a news story, all under one top-level prefix per slug so
// the three stories don't collide on the shared "1. story"/"2. discussion"
// track folders (see storyFolderMap/trackFolderMap in
// modules/vocabulary/Vocabulary.ts, which address the same folders for the
// vocab and phrasal-verb clips):
//
//   news-roland-garros/1. story.mp3                                  ← here
//   news-roland-garros/quiz/1. story/qN-{fast,slow}.mp3              ← backend config/quizData.js
//   news-roland-garros/quiz/1. story/vocab/<audioKey>.mp3            ← useVocabAudio
//   news-roland-garros/quiz/1. story/phrasal-verbs/<audioKey>.mp3    ← useVocabAudio
//
// timeMarkers come from markers/<difficulty>.<storyId>.json, refreshed by
// `npm run pull:markers` after you place them in the Story Builder — see
// markers/index.ts for why they live in the repo at all. subtitles are still
// empty for every news track (the transcripts aren't time-aligned yet), and
// quiz content lives on the backend (config/quizData.js), not here.
import { getStorageUrl } from "../../services/yandexStorage";
import { AudioTrack } from "../../types";
import { getStoryMarkers } from "./markers";

// Track titles double as the folder names in trackFolderMap ("1. story" →
// "Story"), so keep the two in step when adding a story.
const newsTracks = (slug: string, recorded: boolean): AudioTrack[] =>
  [
    { id: "1", title: "Story", file: "1. story.mp3" },
    { id: "2", title: "Discussion", file: "2. discussion.mp3" },
  ].map(({ id, title, file }) => ({
    id,
    title,
    audio: recorded ? getStorageUrl(`${slug}/${file}`) : "",
    subtitles: [],
    timeMarkers: getStoryMarkers("easy", slug, id),
  }));

export const newsRolandGarrosAudioData: AudioTrack[] = newsTracks("news-roland-garros", true);
export const newsGrazingBoardAudioData: AudioTrack[] = newsTracks("news-grazing-board", true);
// No recordings yet — see the header note.
export const newsFamilyVisitAudioData: AudioTrack[] = newsTracks("news-family-visit", false);
