import React, { useState } from 'react';
import '../Quiz.css';

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  referenceTime: number;
}

interface QuizProps {
  onTimeJump: (time: number) => void;
  questions: QuizQuestion[];
  onQuizComplete?: (results: { correctAnswers: number; totalQuestions: number }) => void;
  isSubmitting?: boolean;
}

const Quiz: React.FC<QuizProps> = ({ 
  onTimeJump, 
  questions, 
  onQuizComplete,
  isSubmitting = false 
}) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);

  const handleAnswer = (selectedOption: number) => {
    setSelectedAnswer(selectedOption);
    
    // Store the user's answer
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestion] = selectedOption;
    setUserAnswers(newAnswers);
    
    if (selectedOption === questions[currentQuestion].correctAnswer) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestion + 1 < questions.length) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(userAnswers[currentQuestion + 1] ?? null);
    } else {
      setShowResults(true);
      // Automatically submit results to backend when quiz is completed
      if (onQuizComplete) {
        const results = {
          correctAnswers: score + (selectedAnswer === questions[currentQuestion].correctAnswer ? 1 : 0),
          totalQuestions: questions.length
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
  };

  const currentScore = score + (selectedAnswer === questions[currentQuestion].correctAnswer ? 1 : 0);
  const passingScore = Math.ceil(questions.length * 0.7);

  return (
    <div className="quiz-container">
      {!showResults ? (
        <div className="question-container">
          <div className="quiz-progress">
            <span>Question {currentQuestion + 1} of {questions.length}</span>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          <h2 className='h-tag'>Question {currentQuestion + 1}</h2>
          <p>{questions[currentQuestion].question}</p>
          
          <div className="options-container">
            {questions[currentQuestion].options.map((option, index) => (
              <button
                key={index}
                className={`option-button ${
                  selectedAnswer === index ? 'selected' : ''
                } ${
                  selectedAnswer !== null
                    ? index === questions[currentQuestion].correctAnswer
                      ? 'correct'
                      : selectedAnswer === index
                      ? 'incorrect'
                      : ''
                    : ''
                }`}
                onClick={() => handleAnswer(index)}
                disabled={selectedAnswer !== null || isSubmitting}
              >
                {option}
              </button>
            ))}
          </div>

          <button 
            className="reference-button" 
            onClick={handleReferenceClick}
            disabled={isSubmitting}
          >
            🎧 Listen to Reference
          </button>

          {selectedAnswer !== null && (
            <div className="answer-feedback">
              {selectedAnswer === questions[currentQuestion].correctAnswer ? (
                <p className="correct-feedback">✅ Correct!</p>
              ) : (
                <p className="incorrect-feedback">
                  ❌ Incorrect. The correct answer was: {questions[currentQuestion].options[questions[currentQuestion].correctAnswer]}
                </p>
              )}
              
              <button 
                className="next-button" 
                onClick={handleNext}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span>Submitting...</span>
                ) : (
                  currentQuestion + 1 === questions.length ? 'Finish Quiz' : 'Next Question'
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="results-container">
          <h2>Quiz Complete!</h2>
          <div className="score-display">
            <div className="score-circle">
              <span className="score-number">{currentScore}</span>
              <span className="score-total">/{questions.length}</span>
            </div>
            <p className="score-percentage">
              {Math.round((currentScore / questions.length) * 100)}%
            </p>
          </div>
          
          <div className="results-details">
            {currentScore >= passingScore ? (
              <div className="success-message">
                <h3>🎉 Congratulations!</h3>
                <p>You passed this level! You need at least {passingScore} correct answers to advance.</p>
              </div>
            ) : (
              <div className="failure-message">
                <h3>📚 Keep Practicing!</h3>
                <p>You need at least {passingScore} correct answers to pass this level. You got {currentScore}.</p>
              </div>
            )}
          </div>

          {isSubmitting ? (
            <div className="submitting-status">
              <p>⏳ Saving your progress...</p>
            </div>
          ) : (
            <div className="results-actions">
              <button 
                className="retry-button" 
                onClick={handleRetry}
              >
                🔄 Try Again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Quiz;