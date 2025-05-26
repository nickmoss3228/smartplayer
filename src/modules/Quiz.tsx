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
} 


const Quiz: React.FC<QuizProps> = ({ onTimeJump, questions }) => {
  const [currentQuestion, setCurrentQuestion] =useState(0);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);


  const handleAnswer = (selectedOption: number) => {
    setSelectedAnswer(selectedOption);
    if (selectedOption === questions[currentQuestion].correctAnswer) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestion + 1 < questions.length) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
    } else {
      setShowResults(true);
    }
  };

  const handleReferenceClick = () => {
    onTimeJump(questions[currentQuestion].referenceTime);
  };

  return (
    <div className="quiz-container">
      {!showResults ? (
        <div className="question-container">
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
                disabled={selectedAnswer !== null}
              >
                {option}
              </button>
            ))}
          </div>

          <button className="reference-button" onClick={handleReferenceClick}>
            Listen to Reference
          </button>

          {selectedAnswer !== null && (
            <button className="next-button" onClick={handleNext}>
              {currentQuestion + 1 === questions.length ? 'Show Results' : 'Next Question'}
            </button>
          )}
        </div>
      ) : (
        <div className="results-container">
          <h2>Quiz Results</h2>
          <p>You scored {score} out of {questions.length}!</p>
          <button onClick={() => {
            setCurrentQuestion(0);
            setScore(0);
            setShowResults(false);
            setSelectedAnswer(null);
          }}>
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};

export default Quiz;