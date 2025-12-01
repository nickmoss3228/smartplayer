  import React, { useState } from "react";
  import { useNavigate } from "react-router";
  import { QuizProps } from "../types/Quiz";
  // import { useProgress } from "../context/ProgressContext";

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

    // const { refreshAllProgress } = useProgress();

    const navigate = useNavigate()

    const handleAnswer = (selectedOption: number) => {
      setSelectedAnswer(selectedOption);
      const newAnswers = [...userAnswers];
      newAnswers[currentQuestion] = selectedOption;
      setUserAnswers(newAnswers);
      setShowFeedbackModal(true);
    };

    const handleNext = () => {
      let newScore = score;
      if (selectedAnswer === questions[currentQuestion].correctAnswer) {
        newScore = score + 1;
        setScore(newScore);
      }

      setShowFeedbackModal(false); 

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

    const handleReturn = async () => {
      // await refreshAllProgress(); // or refreshProgress(difficulty)
      navigate(-1);
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
            className="w-full mb-6 px-6 py-3 cursor-pointer bg-[#05df3bff] hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
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
  <div className="w-full mx-auto mt-5 p-4 sm:p-5 md:p-6 bg-black/95 rounded-2xl shadow-2xl border border-gray-800 animate-in slide-in-from-bottom-4 duration-500">
    <div className="text-center">
      {/* Results Header */}
      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">
          Quiz Complete!
        </h2>
        <p className="text-sm sm:text-base text-gray-400">Here's how you performed</p>
      </div>

      {/* Score Display */}
      <div className="mb-4 sm:mb-6">
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 mx-auto mb-4">
          <div className="w-full h-full rounded-full bg-gradient-to-r from-[#05df3bff] to-[#00ff87] p-2 shadow-lg shadow-[#05df3bff]/30">
            <div className="w-full h-full rounded-full bg-black border-2 border-gray-800 flex items-center justify-center">
              <div className="text-center">
                <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                  {currentScore}
                </span>
                <span className="text-base sm:text-lg md:text-xl text-gray-400">
                  /{questions.length}
                </span>
              </div>
            </div>
          </div>
          {/* Percentage badge */}
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-[#05df3bff] to-[#00ff87] text-black px-3 py-1 sm:px-4 sm:py-1.5 rounded-full font-bold text-xs sm:text-sm shadow-lg shadow-[#05df3bff]/50">
            {Math.round((currentScore / questions.length) * 100)}%
          </div>
        </div>
      </div>

      {/* Pass/Fail Message */}
      <div className="mb-6 sm:mb-8 flex justify-center px-2">
        {currentScore >= passingScore ? (
          <div className="bg-gradient-to-r from-[#05df3bff]/10 to-[#00ff87]/10 border-2 border-[#05df3bff] rounded-xl p-4 sm:p-6 max-w-md w-full">
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#05df3bff] mb-2">
              Congratulations!
            </h3>
            <p className="text-sm sm:text-base text-gray-300 font-medium">
              You passed this level with flying colors!
            </p>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border-2 border-orange-500 rounded-xl p-4 sm:p-6 max-w-md w-full">
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-orange-400 mb-2">
              Keep Practicing!
            </h3>
            <p className="text-sm sm:text-base text-gray-300 font-medium">
              You need at least {passingScore} correct answers to pass. You
              got {currentScore}. You're getting there!
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {isSubmitting ? (
        <div className="bg-gradient-to-r from-[#05df3bff]/10 to-[#00ff87]/10 border-2 border-[#05df3bff] rounded-xl p-4 sm:p-6">
          <div className="flex items-center justify-center">
            <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-[#05df3bff] border-t-transparent rounded-full animate-spin mr-3"></div>
            <span className="text-sm sm:text-base text-gray-300 font-medium">
              Saving your progress...
            </span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 px-2">
          <button
            className="flex-1 px-6 py-3 sm:px-8 sm:py-4 cursor-pointer bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white text-sm sm:text-base font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40"
            onClick={handleRetry}
          >
            <span className="flex items-center justify-center font-['Montserrat'] tracking-wide">
              Try Again
            </span>
          </button>
          <button
            className="flex-1 px-6 py-3 sm:px-8 sm:py-4 cursor-pointer bg-gradient-to-r from-[#05df3bff] to-[#00ff87] hover:from-[#04c935] hover:to-[#00e67a] text-black text-sm sm:text-base font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-[#05df3bff]/30 hover:shadow-xl hover:shadow-[#05df3bff]/40"
            onClick={handleReturn}
          >
            <span className="flex items-center justify-center font-['Montserrat'] tracking-wide">
              Return
            </span>
          </button>
        </div>
      )}
    </div>
  </div>
);
};

export default Quiz;