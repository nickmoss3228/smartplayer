 import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { QuizProps } from "../../types/Quiz";
import { useQuestionAudio } from "./useQuestionAudio";
import QuestionAudioButton from "./QuestionAudioButton";

type FeedbackState = "idle" | "correct" | "incorrect";

const Quiz: React.FC<QuizProps> = ({
  // onTimeJump,
  questions,
  onQuizComplete,
  isSubmitting = false,
}) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>("idle");
  const [userAnswers, setUserAnswers] = useState<number[]>([]);

  const navigate = useNavigate();

  // ── Question audio ────────────────────────────────────────────────────────
  const currentQ = questions[currentQuestion];                  // ← NEW
  const { playState, handlePress, stop } = useQuestionAudio({  // ← NEW
    fastSrc: currentQ.audio?.fast,
    slowSrc: currentQ.audio?.slow,
  });

  // Auto-advance after feedback is shown
  useEffect(() => {
    if (feedback === "idle") return;

    const timer = setTimeout(() => {
      handleNext();
    }, 1500);

    return () => clearTimeout(timer);
  }, [feedback]);

  const handleAnswer = (selectedOption: number) => {
    if (selectedAnswer !== null || feedback !== "idle") return;

    stop();

    setSelectedAnswer(selectedOption);

    const newAnswers = [...userAnswers];
    newAnswers[currentQuestion] = selectedOption;
    setUserAnswers(newAnswers);

    const isCorrect =
      selectedOption === questions[currentQuestion].correctAnswer;
    setFeedback(isCorrect ? "correct" : "incorrect");
  };

  const handleNext = () => {
    const isCorrect =
      selectedAnswer === questions[currentQuestion].correctAnswer;
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
        });
      }
    }
  };

  // const handleReferenceClick = () => {
  //   onTimeJump(questions[currentQuestion].referenceTime);
  // };

  const handleRetry = () => {
    setCurrentQuestion(0);
    setScore(0);
    setShowResults(false);
    setSelectedAnswer(null);
    setUserAnswers([]);
    setFeedback("idle");
  };

  const handleReturn = () => {
    navigate(-1);
  };

  const passingScore = Math.ceil(questions.length * 0.7);
  const progressPercentage = ((currentQuestion) / questions.length) * 100;
  const finalPercentage = Math.round((score / questions.length) * 100);

  // ── Option button styles ──────────────────────────────────────────────────
  const getOptionClasses = (index: number) => {
    const base =
      "w-full p-4 text-left rounded-xl border-2 font-medium transition-all duration-200 flex items-center gap-3 group";

    if (feedback === "idle" || selectedAnswer === null) {
      return `${base} bg-white border-gray-200 text-gray-700 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer`;
    }

    if (selectedAnswer === index) {
      if (feedback === "correct") {
        return `${base} bg-green-50 border-green-500 text-green-800 cursor-default`;
      } else {
        return `${base} bg-red-50 border-red-500 text-red-800 cursor-default`;
      }
    }

    // All other options dimmed
    return `${base} bg-gray-50 border-gray-200 text-gray-400 cursor-default opacity-60`;
  };

  const getOptionIcon = (index: number) => {
    const letter = String.fromCharCode(65 + index);
    const baseIcon =
      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all duration-200";

    if (feedback === "idle" || selectedAnswer === null) {
      return (
        <span className={`${baseIcon} bg-gray-100 text-gray-500 group-hover:bg-indigo-100 group-hover:text-indigo-600`}>
          {letter}
        </span>
      );
    }

    if (selectedAnswer === index) {
      if (feedback === "correct") {
        return (
          <span className={`${baseIcon} bg-green-500 text-white`}>✓</span>
        );
      } else {
        return (
          <span className={`${baseIcon} bg-red-500 text-white`}>✗</span>
        );
      }
    }

    return (
      <span className={`${baseIcon} bg-gray-100 text-gray-400`}>{letter}</span>
    );
  };

 if (!showResults) {
    return (
      <div className="w-full mx-auto mt-4 bg-white/60 rounded-2xl shadow-xl overflow-hidden">

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100 w-full">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        <div className="p-6 sm:p-8">

          {/* Header row */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs font-semibold uppercase tracking-widest text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              Question {currentQuestion + 1} / {questions.length}
            </span>
            <span className="text-xs font-semibold text-gray-400">
              Score: {score}/{currentQuestion}
            </span>
          </div>

          {/* Question text */}
          {/* <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 leading-snug">
            {currentQ.question}
          </h2> */}

          {/* ← NEW: Audio play button sits right under the question */}
          <QuestionAudioButton
            playState={playState}
            onPress={handlePress}
            hasAudio={!!currentQ.audio}
          />

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            {currentQ.options.map((option, index) => (
              <button
                key={index}
                className={getOptionClasses(index)}
                onClick={() => handleAnswer(index)}
                disabled={selectedAnswer !== null || isSubmitting}
              >
                {getOptionIcon(index)}
                <span className="flex-1 text-sm sm:text-base leading-snug">
                  {option}
                </span>
              </button>
            ))}
          </div>

          {/* Feedback banner — unchanged */}
          <div
            className={`mb-6 rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2 transition-all duration-300 ${
              feedback === "idle"
                ? "opacity-0 bg-transparent"
                : feedback === "correct"
                ? "opacity-100 bg-green-50 border border-green-200 text-green-700"
                : "opacity-100 bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            {feedback === "correct" && (<><span className="text-green-500 text-base">✓</span> Correct! Moving on...</>)}
            {feedback === "incorrect" && (<><span className="text-red-500 text-base">✗</span> Not quite. Moving on...</>)}
            {feedback === "idle" && <span>&nbsp;</span>}
          </div>

          {/* Reference button — unchanged */}
          {/* <button
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-200 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={handleReferenceClick}
            disabled={isSubmitting}
          >
            🎧 <span>Jump to Reference in Audio</span>
          </button> */}

        </div>
      </div>
    );
  }

  // ── Results Screen ────────────────────────────────────────────────────────
  const passed = score >= passingScore;

  return (
    <div className="w-full mx-auto mt-4 bg-white/80 rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">

      {/* Top accent bar */}
      <div className={`h-2 w-full ${passed ? "bg-gradient-to-r from-green-400 to-emerald-500" : "bg-gradient-to-r from-orange-400 to-red-500"}`} />

      <div className="p-6 sm:p-8 text-center">

        {/* Score circle */}
        <div className="relative w-28 h-28 mx-auto mb-6">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50" cy="50" r="42"
              fill="none"
              stroke="#f1f5f9"
              strokeWidth="10"
            />
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
            <span className={`text-3xl font-bold ${passed ? "text-green-600" : "text-orange-500"}`}>
              {finalPercentage}%
            </span>
            <span className="text-xs text-gray-400 font-medium mt-0.5">
              {score}/{questions.length}
            </span>
          </div>
        </div>

        {/* Pass / Fail message */}
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
          {passed ? "Well Done! 🎉" : "Keep Going! 💪"}
        </h2>
        <p className="text-gray-500 text-sm sm:text-base mb-8 max-w-sm mx-auto">
          {passed
            ? "You passed this level. Great listening skills!"
            : `You need ${passingScore} correct answers to pass. You got ${score}. Give it another shot!`}
        </p>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <p className="text-xl font-bold text-gray-800">{score}</p>
            <p className="text-xs text-gray-400 mt-0.5">Correct</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <p className="text-xl font-bold text-gray-800">{questions.length - score}</p>
            <p className="text-xs text-gray-400 mt-0.5">Incorrect</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <p className={`text-xl font-bold ${passed ? "text-green-600" : "text-orange-500"}`}>
              {passed ? "Pass" : "Fail"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Result</p>
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
              Try Again
            </button>
            <button
              onClick={handleReturn}
              className={`flex-1 cursor-pointer px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 text-sm sm:text-base ${
                passed
                  ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 shadow-lg shadow-green-500/30"
                  : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 shadow-lg shadow-indigo-500/30"
              }`}
            >
              Return
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Quiz;