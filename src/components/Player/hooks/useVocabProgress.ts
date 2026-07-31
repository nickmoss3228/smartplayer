import { useCallback, useEffect, useState } from "react";
import {
  fetchLearnedWords,
  submitLearnedWords,
} from "../../../services/vocabProgressServices";
import {
  getGuestLearnedWords,
  saveGuestLearnedWords,
} from "../../../services/guestProgress";

// Tracks which vocab words (by lowercased audioKey/word) the student has
// ever correctly identified in a VocabQuiz — fetched once so chips in the
// Player stay colored across visits, and pushed to the backend whenever a
// new round finishes so it also drives the Dashboard's "Words Learned" stat.
// For guests (no token), the same set persists to localStorage instead, so
// it survives a reload and can be migrated into their account on signup.
export function useVocabProgress(enabled: boolean) {
  const [learnedWords, setLearnedWords] = useState<Set<string>>(new Set());

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!enabled || !token) {
      setLearnedWords(new Set(getGuestLearnedWords()));
      return;
    }
    fetchLearnedWords(token)
      .then((words) => setLearnedWords(new Set(words)))
      .catch(() => {});
  }, [enabled]);

  const markLearned = useCallback((words: string[]) => {
    if (words.length === 0) return;
    setLearnedWords((prev) => {
      const next = new Set(prev);
      words.forEach((w) => next.add(w));
      return next;
    });

    const token = localStorage.getItem("token");
    if (!token) {
      saveGuestLearnedWords(words);
      return;
    }
    submitLearnedWords(token, words).catch(() => {});
  }, []);

  return { learnedWords, markLearned };
}
