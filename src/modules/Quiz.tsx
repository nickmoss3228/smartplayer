import React, { useState } from "react";
import { useNavigate } from "react-router";

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  referenceTime: number;
}

interface QuizProps {
  onTimeJump: (time: number) => void;
  questions: QuizQuestion[];
  onQuizComplete?: (results: {
    correctAnswers: number;
    totalQuestions: number;
  }) => void;
  isSubmitting?: boolean;
}

const Quiz: React.FC<QuizProps> = ({
  onTimeJump,
  questions,
  onQuizComplete,
  isSubmitting = false,
}) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const navigate = useNavigate()

  const handleAnswer = (selectedOption: number) => {
    setSelectedAnswer(selectedOption);
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestion] = selectedOption;
    setUserAnswers(newAnswers);
    // Show the modal after selecting an answer
    setShowFeedbackModal(true);
  };

  const handleNext = () => {
    let newScore = score;
    if (selectedAnswer === questions[currentQuestion].correctAnswer) {
      newScore = score + 1;
      setScore(newScore);
    }

    setShowFeedbackModal(false); // Hide modal before proceeding

    if (currentQuestion + 1 < questions.length) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(userAnswers[currentQuestion + 1] ?? null);
    } else {
      setShowResults(true);
      if (onQuizComplete) {
        const results = {
          correctAnswers: newScore,
          totalQuestions: questions.length,
        };
        onQuizComplete(results);
      }
    }
  };

  const handleReferenceClick = () => {
    onTimeJump(questions[currentQuestion].referenceTime);
  };

  const handleRetry = () => {
    setCurrentQuestion(0);
    setScore(0);
    setShowResults(false);
    setSelectedAnswer(null);
    setUserAnswers([]);
    setShowFeedbackModal(false);
  };

  const handleReturn = () => {
    navigate(-1)
  }

  const getCurrentScore = () => {
    let currentScore = score;
    if (
      showResults &&
      selectedAnswer === questions[currentQuestion]?.correctAnswer
    ) {
      currentScore += 1;
    }
    return currentScore;
  };

  const currentScore = showResults ? score : getCurrentScore();
  const passingScore = Math.ceil(questions.length * 0.7);
  const progressPercentage = (currentQuestion / questions.length) * 100;

  const getOptionButtonClasses = (index: number) => {
    const baseClasses =
      "w-full p-2 cursor-pointer text-left rounded-xl transition-all duration-300 transform hover:scale-[1.02] border-2 font-medium";

    if (selectedAnswer === null) {
      return `${baseClasses} bg-gradient-to-r from-slate-50 to-slate-100 hover:from-blue-50 hover:to-blue-100 border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700`;
    }

    if (index === questions[currentQuestion].correctAnswer) {
      return `${baseClasses} bg-gradient-to-r from-green-100 to-green-200 border-green-400 text-green-800 shadow-green-200 shadow-lg`;
    }

    if (selectedAnswer === index) {
      return `${baseClasses} bg-gradient-to-r from-red-100 to-red-200 border-red-400 text-red-800 shadow-red-200 shadow-lg`;
    }

    return `${baseClasses} bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200 text-slate-600 opacity-70`;
  };

  // Feedback Modal Component
  const FeedbackModal = () => {
    if (!showFeedbackModal || selectedAnswer === null) return null;

    const isCorrect = selectedAnswer === questions[currentQuestion].correctAnswer;

    return (
      <div className="absolute inset-0 flex items-center justify-center z-50 p-4">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm rounded-2xl" />
        
        {/* Modal Content */}
        <div className="relative z-10 max-w-md w-full bg-white rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="p-8">
            {isCorrect ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-2xl">✓</span>
                </div>
                <h3 className="text-2xl font-bold text-green-800 mb-2">Correct!</h3>
                <p className="text-green-700 mb-6">Great job! You got it right.</p>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-2xl">✗</span>
                </div>
                <h3 className="text-2xl font-bold text-red-800 mb-2">Incorrect</h3>
                <p className="text-red-700 mb-4">
                  The correct answer was:
                </p>
                <p className="text-red-800 font-semibold bg-red-50 p-3 rounded-lg mb-6">
                  {questions[currentQuestion].options[questions[currentQuestion].correctAnswer]}
                </p>
              </div>
            )}

            <button
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleNext}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Submitting...
                </span>
              ) : currentQuestion + 1 === questions.length ? (
                "Finish Quiz"
              ) : (
                "Next Question"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!showResults) {
    return (
      <div className="w-full mx-auto mt-6 p-8 bg-[#212121ff] shadow-2xl animate-in slide-in-from-bottom-4 duration-500 relative">
        {/* Progress Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
              Question {currentQuestion + 1} of {questions.length}
            </span>
            <span className="text-sm font-small text-white">
              {Math.round(progressPercentage)}% Complete
            </span>
          </div>

          <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden shadow-inner">
            <div
              className="h-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-700 ease-out shadow-lg"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Question Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4 leading-tight">
            {questions[currentQuestion].question}
          </h2>
        </div>

        {/* Options - Changed to 2x2 Grid */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {questions[currentQuestion].options.map((option, index) => (
            <button
              key={index}
              className={getOptionButtonClasses(index)}
              onClick={() => handleAnswer(index)}
              disabled={selectedAnswer !== null || isSubmitting}
            >
              <div className="flex items-center">
                <span className="w-2 h-2 rounded-full bg-white text-slate-600 font-semibold text-sm flex items-center justify-center mr-5 flex-shrink-0">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="flex-1">{option}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Reference Button */}
        <button
          className="w-full mb-6 px-6 py-3 cursor-pointer bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleReferenceClick}
          disabled={isSubmitting}
        >
          <span className="flex items-center justify-center">
            🎧 Listen to Reference
          </span>
        </button>

        {/* Feedback Modal - Now contained within the quiz */}
        <FeedbackModal />
      </div>
    );
  }

  // Results Screen
  return (
    <div className="w-full mx-auto mt-5 p-5 bg-white rounded-2xl shadow-2xl border border-slate-200 animate-in slide-in-from-bottom-4 duration-500">
      <div className="text-center">
        {/* Results Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-800 mb-2">
            Quiz Complete!
          </h2>
          <p className="text-slate-600">Here's how you performed</p>
        </div>

        {/* Score Display */}
        <div className="mb-2">
          <div className="relative w-24 h-24 mx-auto mb-4">
            <div className="w-full h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-600 p-2 shadow-lg">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                <div className="text-center">
                  <span className="text-3xl font-bold text-slate-800">
                    {currentScore}
                  </span>
                  <span className="text-lg text-slate-500">
                    /{questions.length}
                  </span>
                </div>
              </div>
            </div>
            {/* Percentage badge */}
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-1 rounded-full font-bold text-sm shadow-lg">
              {Math.round((currentScore / questions.length) * 100)}%
            </div>
          </div>
        </div>

        {/* Pass/Fail Message */}
        <div className="mb-4 flex justify-center">
          {currentScore >= passingScore ? (
            <div className="bg-gradient-to-r w-sm from-green-50 to-emerald-50 border border-green-200 rounded-xl p-2">
              <h3 className="text-2xl font-bold text-green-800 mb-2">
                Congratulations!
              </h3>
              <p className="text-green-700 font-medium">
                You passed this level with flying colors!
              </p>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-xl p-6">
              <h3 className="text-2xl font-bold text-orange-800 mb-2">
                Keep Practicing!
              </h3>
              <p className="text-orange-700 font-medium">
                You need at least {passingScore} correct answers to pass. You
                got {currentScore}. You're getting there!
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {isSubmitting ? (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3"></div>
              <span className="text-blue-700 font-medium">
                Saving your progress...
              </span>
            </div>
          </div>
        ) : (
          <div className="flex">
            <button
              className="w-lg m-2 px-8 py-4 cursor-pointer bg-gradient-to-r from-green-500 to-red-600 hover:from-green-400 hover:to-red-500 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
              onClick={handleRetry}
            >
              <span className="flex items-center justify-center">
              Try Again
              </span>
            </button>
            <button
              className="w-lg m-2 px-8 py-4 cursor-pointer bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
              onClick={handleReturn}
            >
              <span className="flex items-center justify-center">Return</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Quiz;