import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import "../Player.css"
import WaveformPlayer from '../modules/progressBar';
import { PlayerProps } from '../types';
import Quiz from '../modules/Quiz';
import WaveSurfer from 'wavesurfer.js';
import { audioTracks } from '../modules/audioData';

const Player = React.memo(() => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const difficulty = searchParams.get('difficulty') || 'easy';
  const level = parseInt(searchParams.get('level') || '1');
  
  const wavesurferRef = useRef(null);
  const [selectedTrackId, setSelectedTrackId] = useState(audioTracks[0].id);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizResults, setQuizResults] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const audioTrack = useMemo(() => 
    audioTracks.find(track => track.id === selectedTrackId) || audioTracks[0],
    [selectedTrackId]
  );

  const handleTimeJump = useCallback((time) => {
    if (wavesurferRef.current) {
      wavesurferRef.current.seekTo(time / wavesurferRef.current.getDuration());
      wavesurferRef.current.play();
    }
  }, []);

  const handleTrackChange = useCallback((event) => {
    setSelectedTrackId(event.target.value);
    if (wavesurferRef.current) {
      wavesurferRef.current.stop();
    }
  }, []);

  const handleWavesurferMount = useCallback((wavesurfer) => {
    wavesurferRef.current = wavesurfer;
  }, []);

  const toggleQuiz = useCallback(() => {
    setShowQuiz(prev => !prev);
  }, []);

  // Функция для сохранения результатов квиза
  const handleQuizComplete = useCallback(async (results) => {
    if (!user || isSubmitting) return;
    
    setIsSubmitting(true);
    setQuizResults(results);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:5000/api/progress/complete', {
        difficulty,
        level,
        correctAnswers: results.correctAnswers,
        totalQuestions: results.totalQuestions
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.completed) {
        alert('Level completed successfully! 🎉');
      } else {
        alert(`Level not completed. You got ${results.correctAnswers}/${results.totalQuestions} correct. Try to get at least ${Math.ceil(results.totalQuestions * 0.7)} correct.`);
      }
      
    } catch (error) {
      console.error('Failed to save progress:', error);
      alert('Failed to save your progress. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [user, difficulty, level, isSubmitting]);

  return (
    <div className='audio-player-wrapper'>
      <div className="audio-player">
        <div className="level-info">
          <h2>Level {level} - {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</h2>
        </div>

        <div className="track-selector">
          <label htmlFor="track-select">Select Audio Track: </label>
          <select
            id="track-select"
            value={selectedTrackId}
            onChange={handleTrackChange}
          >
            {audioTracks.map(track => (
              <option key={track.id} value={track.id}>
                {track.title}
              </option>
            ))}
          </select>
        </div>

        <WaveformPlayer
          audioUrl={audioTrack.audio}
          subtitles={audioTrack.subtitles}
          timeMarkers={audioTrack.timeMarkers}
          onWavesurferMount={handleWavesurferMount}
        />

        <button
          className="quiz-toggle-button"
          onClick={toggleQuiz}
        >
          {showQuiz ? 'Hide Quiz' : 'Show Quiz'}
        </button>

        {showQuiz && (
          <Quiz
            onTimeJump={handleTimeJump}
            questions={audioTrack.quiz}
            onQuizComplete={handleQuizComplete}
            isSubmitting={isSubmitting}
          />
        )}

        {quizResults && (
          <div className="quiz-results">
            <h3>Quiz Results:</h3>
            <p>Correct: {quizResults.correctAnswers}/{quizResults.totalQuestions}</p>
            <p>Score: {Math.round((quizResults.correctAnswers / quizResults.totalQuestions) * 100)}%</p>
          </div>
        )}
      </div>
    </div>
  );
});

Player.displayName = 'Player';

export default Player;