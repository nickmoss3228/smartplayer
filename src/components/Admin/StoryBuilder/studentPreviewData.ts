import type { AudioTrack } from "../../../types";
import type { AdminStory, StoryPart, VocabEntry } from "../../../services/adminStoryServices";

/** Only listening assets enter the student player. Transcript/translation stay in the editor. */
export function studentPreviewTrack(story: AdminStory, part: StoryPart): AudioTrack {
  return {
    id: String(part.partNumber),
    title: part.title?.trim() || `${story.storyName} — ${part.partNumber}`,
    audio: part.audioUrl ?? "",
    subtitles: [],
    timeMarkers: part.timeMarkers.map((marker, index) => ({ time: marker.time, label: String(index + 1), color: marker.color })),
    comicUrl: part.comicUrl ?? null,
    helpAudio: part.helpAudio ?? [],
    panelQuiz: part.panelQuiz ?? null,
    slowCopies: part.slowAudio?.source === part.audioUrl ? { ...part.slowAudio.copies } : {},
    textShape: null,
  };
}

export const studentPreviewWords = (words: VocabEntry[]) => words.map((word) => ({
  word: word.word,
  definition: word.definition,
  audioKey: word.audioKey,
  audioUrl: word.audioUrl,
  image: word.image,
}));
