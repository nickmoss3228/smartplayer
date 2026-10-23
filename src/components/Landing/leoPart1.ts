import { createContext, useContext, useEffect, useState } from 'react';
import { fetchPublishedStory, type PanelQuiz, type TextShape } from '../../services/storyServices';
import { wordKey, type WindowWord } from '../../modules/vocab/textShape';
import type { QuizQuestion } from '../../types/Quiz';
import { createLandingAudio, type LandingAudio } from './landingAudio';

/**
 * The landing's demos all play the real first part of «Приключения Лео», read
 * from the same endpoint the player uses, so what a visitor tries here is what
 * the app does: the same phrases, comic, words and quiz (which the server
 * grades — the page never holds the answers).
 */
export const LEO = { difficulty: 'easy', storyId: 'leo', partNumber: 1 } as const;

/** The phrase the dancer moves to: Leo's third line (4.5–6.4 s), 1.9 s at full speed. */
export const DANCE_PHRASE = 2;

export interface LeoPart1 {
  /** How many parts the story has (a guest's saved quiz result needs it). */
  totalParts: number;
  audioUrl: string;
  comicUrl: string | null;
  /** Where each phrase starts, in seconds. */
  markers: number[];
  /** Until the audio's metadata arrives; LandingAudio.duration() has the real one. */
  durationGuess: number;
  panelQuiz: PanelQuiz | null;
  words: WindowWord[];
  shape: TextShape | null;
  quiz: QuizQuestion[];
}

export interface LandingData {
  leo: LeoPart1 | null;
  audio: LandingAudio | null;
  /** The story could not be loaded; demos that need it say so instead of waiting. */
  failed: boolean;
}

/**
 * What every section reads: the part, its audio, and one копилка for the whole
 * page (useVocabProgress, as on /kopilka), so a word found in the game gets its
 * tick in the word window too. `playWord` is WordWindow/WordBoard's onPlay: it
 * plays the clip and stops whatever else on the page was sounding.
 */
export interface LandingContextValue extends LandingData {
  learnedWords: Set<string>;
  markLearned: (keys: string[]) => void;
  playWord: (audioKey: string, audioUrl: string) => HTMLAudioElement | null;
}

export const LandingDataContext = createContext<LandingContextValue>({
  leo: null,
  audio: null,
  failed: false,
  learnedWords: new Set(),
  markLearned: () => {},
  playWord: () => null,
});
export const useLandingData = () => useContext(LandingDataContext);

/** Loads part 1 once and owns its audio for as long as the landing is mounted. */
export function useLeoPart1Loader(): LandingData {
  const [data, setData] = useState<LandingData>({ leo: null, audio: null, failed: false });

  useEffect(() => {
    let alive = true;
    let audio: LandingAudio | null = null;
    (async () => {
      const story = await fetchPublishedStory(LEO.difficulty, LEO.storyId);
      const part = story?.parts.find((p) => p.partNumber === LEO.partNumber);
      if (!alive) return;
      if (!part || part.locked || !part.audioUrl) {
        setData({ leo: null, audio: null, failed: true });
        return;
      }
      const markers = part.timeMarkers.map((m) => m.time).sort((a, b) => a - b);
      // The word window's words, built as the player builds them: vocabulary, then phrasal verbs, one per key.
      const seen = new Set<string>();
      const words: WindowWord[] = [];
      for (const [list, phrasal] of [[part.vocabulary, false], [part.phrasalVerbs, true]] as const) {
        for (const w of list) {
          const key = wordKey(w);
          if (seen.has(key)) continue;
          seen.add(key);
          words.push({ key, word: w.word, audioKey: w.audioKey, audioUrl: w.audioUrl, phrasal });
        }
      }
      // Never shorter than the phrases: the intro's stored length can be stale
      // (Leo's part 1 says 48 s; its last phrase starts at 60.5 s).
      const fromMarkers = markers.length ? markers[markers.length - 1] + 9 : 70;
      const durationGuess = Math.max(part.intro?.durationSeconds ?? 0, fromMarkers);
      const leo: LeoPart1 = {
        totalParts: story?.totalParts || story?.parts.length || 10,
        audioUrl: part.audioUrl,
        comicUrl: part.comicUrl ?? null,
        markers,
        durationGuess,
        panelQuiz: part.panelQuiz ?? null,
        words,
        shape: part.textShape ?? null,
        quiz: part.quiz.map((q) => ({ question: q.question, options: q.options, referenceTime: q.referenceTime, audio: q.audio })),
      };
      audio = createLandingAudio(leo.audioUrl, durationGuess);
      // For the scripted browser checks (dev builds only).
      if (import.meta.env.DEV) (window as unknown as { __landingAudio?: LandingAudio }).__landingAudio = audio;
      setData({ leo, audio, failed: false });
    })();
    return () => {
      alive = false;
      audio?.dispose();
    };
  }, []);

  return data;
}
