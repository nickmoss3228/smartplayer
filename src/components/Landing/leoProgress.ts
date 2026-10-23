import axios from 'axios';
import { useCallback, useState } from 'react';
import { API_BASE } from '../../services/apiClient';
import { saveGuestQuizResult } from '../../services/guestProgress';
import { useAuth } from '../../context/AuthContext';
import { useWallet } from '../../context/WalletContext';
import { LEO } from './leoPart1';

export interface QuizResults {
  correctAnswers: number;
  totalQuestions: number;
  answers: number[];
}

/**
 * Leo's part 1 quiz counts on the landing as it does in the player
 * (Player.tsx handleQuizComplete): a guest's result is kept on this device and
 * moves into the account at sign-up; a signed-in student's answers are
 * re-graded and saved by the server, which also pays the pass reward. So the
 * result screen's «Часть 2 открыта» is true wherever the quiz was passed.
 */
export function useLeoQuizSubmit(totalParts: number) {
  const { user } = useAuth();
  const { setWalletDirect } = useWallet();
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(
    async (results: QuizResults) => {
      if (!user) {
        saveGuestQuizResult(LEO.difficulty, LEO.storyId, LEO.partNumber, results.correctAnswers, results.totalQuestions, totalParts);
        return;
      }
      setSubmitting(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.post(
          `${API_BASE}/api/progress/complete`,
          { difficulty: LEO.difficulty, storyId: LEO.storyId, partNumber: LEO.partNumber, answers: results.answers },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (res.data.wallet) setWalletDirect(res.data.wallet);
      } catch (error) {
        console.error('[landing] could not save the quiz result', error);
      } finally {
        setSubmitting(false);
      }
    },
    [user, setWalletDirect, totalParts],
  );

  return { submit, submitting };
}
