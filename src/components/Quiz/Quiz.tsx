import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { IoCheckmark, IoClose, IoRocketOutline, IoLockClosedOutline } from "react-icons/io5";
import { QuizProps } from "../../types/Quiz";
import { useQuestionAudio } from "./useQuestionAudio";
import QuestionAudioButton from "./QuestionAudioButton";
import QuizConfetti from "./QuizConfetti";
import { playFanfare } from "../../utils/soundEffects";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { CURRENCIES, QUIZ_PASS_BITAWARD } from "../../config/currencies";
import { checkQuizAnswer } from "../../services/quizServices";

const BitAwardIcon = CURRENCIES[0].icon;

type FeedbackState = "idle" | "correct" | "incorrect";

const Quiz: React.FC<QuizProps> = ({
  questions,
  difficulty,
  storyId,
  partNumber,
  onQuizComplete,
  onAnswerResult,
  isSubmitting = false,
}) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>("idle");
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [correctFlags, setCorrectFlags] = useState<boolean[]>([]);
  const [celebrate, setCelebrate] = useState(false);
  const [hasListened, setHasListened] = useState(false);
  const { t } = useTranslation()
  const { user } = useAuth();

  const navigate = useNavigate();

  const currentQ = questions[currentQuestion];
  const { playState, handlePress, stop } = useQuestionAudio({
    fastSrc: currentQ.audio?.fast,
    slowSrc: currentQ.audio?.slow,
  });

  // Only lock answers behind a listen if there's actually audio to listen to —
  // a question with no audio source would otherwise be permanently unanswerable.
  const requiresListen = !!currentQ.audio?.fast;

  // Reset the listen-gate every time we move to a new question.
  useEffect(() => {
    setHasListened(false);
  }, [currentQuestion]);

  // Unlock once the question has actually finished playing at least once —
  // "playing-fast" alone isn't enough, since a user could tap play and
  // immediately try to answer before hearing anything.
  useEffect(() => {
    if (playState === "played-fast" || playState === "playing-slow" || playState === "played-slow") {
      setHasListened(true);
    }
  }, [playState]);

  useEffect(() => {
    if (feedback === "idle") return;
    const timer = setTimeout(() => {
      handleNext();
    }, 1500);
    return () => clearTimeout(timer);
  }, [feedback]);

  // Fire the confetti + fanfare exactly once, right as a passing result appears.
  useEffect(() => {
    if (!showResults) return;
    if (score >= Math.ceil(questions.length * 0.7)) {
      setCelebrate(true);
      playFanfare();
    }
  }, [showResults]);

  const handleAnswer = async (selectedOption: number) => {
    if (selectedAnswer !== null || feedback !== "idle") return;
    if (requiresListen && !hasListened) return;
    stop();
    setSelectedAnswer(selectedOption);
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestion] = selectedOption;
    setUserAnswers(newAnswers);

    let isCorrect = false;
    try {
      isCorrect = await checkQuizAnswer(
        difficulty,
        storyId,
        partNumber,
        currentQuestion,
        selectedOption,
      );
    } catch (error) {
      console.error("Failed to check quiz answer:", error);
    }

    const newFlags = [...correctFlags];
    newFlags[currentQuestion] = isCorrect;
    setCorrectFlags(newFlags);
    setFeedback(isCorrect ? "correct" : "incorrect");
    onAnswerResult?.(isCorrect, currentQuestion);
  };

  const handleNext = () => {
    const isCorrect = correctFlags[currentQuestion] ?? false;
    let newScore = score;
    if (isCorrect) {
      newScore = score + 1;
      setScore(newScore);
    }
    setFeedback("idle");
    setSelectedAnswer(null);
    if (currentQuestion + 1 < questions.length) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      setShowResults(true);
      if (onQuizComplete) {
        onQuizComplete({
          correctAnswers: newScore,
          totalQuestions: questions.length,
          answers: userAnswers,
        });
      }
    }
  };

  const handleRetry = () => {
    setCurrentQuestion(0);
    setScore(0);
    setShowResults(false);
    setSelectedAnswer(null);
    setUserAnswers([]);
    setCorrectFlags([]);
    setFeedback("idle");
    setCelebrate(false);
    setHasListened(false);
  };

  const handleReturn = () => {
    navigate(-1);
  };

  const passingScore = Math.ceil(questions.length * 0.7);
  const progressPercentage = (currentQuestion / questions.length) * 100;
  const finalPercentage = Math.round((score / questions.length) * 100);

  const isLocked = requiresListen && !hasListened;

  // ── Option button styles ──────────────────────────────────────────────────
  const getOptionClasses = (index: number) => {
    const base =
      // ↓ p-3 on mobile, p-4 on sm+  |  gap-2 on mobile, gap-3 on sm+
      "w-full p-3 sm:p-4 text-left rounded-xl border-2 font-medium transition-all duration-200 flex items-center gap-2 sm:gap-3 group";

    if (feedback === "idle" || selectedAnswer === null) {
      if (isLocked) {
        return `${base} bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed`;
      }
      return `${base} bg-white border-gray-200 text-gray-700 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer`;
    }
    if (selectedAnswer === index) {
      if (feedback === "correct") {
        return `${base} bg-green-50 border-green-500 text-green-800 cursor-default`;
      } else {
        return `${base} bg-red-50 border-red-500 text-red-800 cursor-default`;
      }
    }
    return `${base} bg-gray-50 border-gray-200 text-gray-400 cursor-default opacity-60`;
  };

  const getOptionIcon = (index: number) => {
    const letter = String.fromCharCode(65 + index);
    // ↓ w-7 h-7 on mobile, w-8 h-8 on sm+  |  text-xs on mobile, text-sm on sm+
    const baseIcon =
      "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0 transition-all duration-200";

    if (feedback === "idle" || selectedAnswer === null) {
      if (isLocked) {
        return (
          <span className={`${baseIcon} bg-gray-100 text-gray-400`}>
            <IoLockClosedOutline size={13} />
          </span>
        );
      }
      return (
        <span className={`${baseIcon} bg-gray-100 text-gray-500 group-hover:bg-indigo-100 group-hover:text-indigo-600`}>
          {letter}
        </span>
      );
    }
    if (selectedAnswer === index) {
      if (feedback === "correct") {
        return (
          <span className={`${baseIcon} bg-green-500 text-white`}>
            <IoCheckmark size={16} />
          </span>
        );
      } else {
        return (
          <span className={`${baseIcon} bg-red-500 text-white`}>
            <IoClose size={16} />
          </span>
        );
      }
    }
    return (
      <span className={`${baseIcon} bg-gray-100 text-gray-400`}>{letter}</span>
    );
  };

  if (!showResults) {
    return (
      <div className="w-full mx-auto bg-white/60 rounded-2xl shadow-xl overflow-hidden">

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100 w-full">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* ↓ p-4 on mobile, p-8 on sm+ */}
        <div className="m-2 p-5 sm:p-8">

          {/* Header row — ↓ mb-4 on mobile, mb-6 on sm+ */}
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <span className="text-xs font-semibold uppercase tracking-widest text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              {t('quiz.question')}  {currentQuestion + 1} / {questions.length}
            </span>
            <span className="text-xs font-semibold text-gray-400">
              {t('quiz.score')} : {score}/{currentQuestion}
            </span>
          </div>

          {/* Options — locked until the question has been listened to at least
              once (when it has audio) — ↓ gap-2 on mobile, gap-3 on sm+  |  mb-5 on mobile, mb-8 on sm+ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-5 sm:mb-8">
            {currentQ.options.map((option, index) => (
              <button
                key={index}
                className={getOptionClasses(index)}
                onClick={() => handleAnswer(index)}
                disabled={selectedAnswer !== null || isSubmitting || isLocked}
              >
                {getOptionIcon(index)}
                {/* ↓ text-sm on mobile, text-base on sm+ */}
                <span className="flex-1 text-sm sm:text-base leading-snug">
                  {option}
                </span>
              </button>
            ))}
          </div>

          {/* Audio button — kept below the options so it's within easy thumb
              reach on mobile (QuestionAudioButton has its own bottom margin) */}
          <QuestionAudioButton
            playState={playState}
            onPress={handlePress}
            hasAudio={!!currentQ.audio}
          />
          {isLocked && (
            <p className="flex items-center gap-1.5 text-xs text-gray-400 mb-4 sm:mb-6">
              <IoLockClosedOutline size={13} />
              {t('quiz.listenFirst')}
            </p>
          )}

        </div>
      </div>
    );
  }

  // ── Results Screen ────────────────────────────────────────────────────────
  const passed = score >= passingScore;

  return (
    <div className="w-full mx-auto mt-4 bg-white/80 rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">

      <QuizConfetti active={celebrate} />

      {/* Top accent bar */}
      <div className={`h-2 w-full ${passed ? "bg-gradient-to-r from-green-400 to-emerald-500" : "bg-gradient-to-r from-orange-400 to-red-500"}`} />

      {/* ↓ p-4 on mobile, p-8 on sm+ */}
      <div className="p-4 sm:p-8 text-center">

        {/* Score circle — ↓ w-24 h-24 on mobile, w-28 h-28 on sm+  |  mb-4 on mobile, mb-6 on sm+ */}
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto mb-4 sm:mb-6">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#f1f5f9" strokeWidth="10" />
            <circle
              cx="50" cy="50" r="42"
              fill="none"
              stroke={passed ? "#22c55e" : "#f97316"}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 42}`}
              strokeDashoffset={`${2 * Math.PI * 42 * (1 - finalPercentage / 100)}`}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {/* ↓ text-2xl on mobile, text-3xl on sm+ */}
            <span className={`text-2xl sm:text-3xl font-bold ${passed ? "text-green-600" : "text-orange-500"}`}>
              {finalPercentage}%
            </span>
            <span className="text-xs text-gray-400 font-medium mt-0.5">
              {score}/{questions.length}
            </span>
          </div>
        </div>

        {/* Pass / Fail message */}
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-2">
          {!passed && <IoRocketOutline className="text-orange-500 flex-shrink-0" size={24} />}
          {passed ? t('quiz.welldone'): t('quiz.keepgoing')}
        </h2>

        {/* Reward badge — only for signed-in students; guests aren't credited server-side */}
        {passed && user && (
          <div className="flex justify-center mb-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-100 text-amber-600 text-xs sm:text-sm font-semibold">
              <BitAwardIcon size={15} />
              {t('quiz.rewardEarned', { amount: QUIZ_PASS_BITAWARD })}
            </div>
          </div>
        )}
        {/* ↓ mb-6 on mobile, mb-8 on sm+ */}
        <p className="text-gray-500 text-sm sm:text-base mb-6 sm:mb-8 max-w-sm mx-auto">
          {passed
            ? "You passed this level. Great listening skills!"
            : `You need ${passingScore} correct answers to pass. You got ${score}. Give it another shot!`}
        </p>

        {/* Stats row — ↓ gap-2 on mobile, gap-3 on sm+  |  mb-6 on mobile, mb-8 on sm+ */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6 sm:mb-8">
          {/* ↓ p-2.5 on mobile, p-3 on sm+  |  text-lg on mobile, text-xl on sm+ */}
          <div className="bg-gray-50 rounded-xl p-2.5 sm:p-3 border border-gray-100">
            <p className="text-lg sm:text-xl font-bold text-gray-800">{score}</p>
            <p className="text-xs text-gray-400 mt-0.5">{t('quiz.correctanswers')}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-2.5 sm:p-3 border border-gray-100">
            <p className="text-lg sm:text-xl font-bold text-gray-800">{questions.length - score}</p>
            <p className="text-xs text-gray-400 mt-0.5">{t('quiz.incorrectanswers')}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-2.5 sm:p-3 border border-gray-100">
            <p className={`text-lg sm:text-xl font-bold ${passed ? "text-green-600" : "text-orange-500"}`}>
              {passed ? t('quiz.pass') : t('quiz.fail')}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{t('quiz.result')}</p>
          </div>
        </div>

        {/* Action buttons */}
        {isSubmitting ? (
          <div className="flex items-center justify-center gap-3 py-4 text-gray-500 text-sm">
            <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            Saving your progress...
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleRetry}
              className="flex-1 bg-white/80 cursor-pointer px-6 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 text-sm sm:text-base"
            >
              {t('quiz.tryagain')}
            </button>
            <button
              onClick={handleReturn}
              className={`flex-1 cursor-pointer px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 text-sm sm:text-base ${
                passed
                  ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 shadow-lg shadow-green-500/30"
                  : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 shadow-lg shadow-indigo-500/30"
              }`}
            >
              {t('quiz.return-btn')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Quiz;        