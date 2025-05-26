import React, { useRef, useState, useCallback, useMemo } from 'react';
import "../Player.css"
import WaveformPlayer from '../modules/progressBar';
import { PlayerProps } from '../types';
import Quiz from '../modules/Quiz';
import WaveSurfer from 'wavesurfer.js';
import { audioTracks } from '../modules/audioData';

const Player: React.FC<PlayerProps> = React.memo(() => {
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState(audioTracks[0].id);
  const [showQuiz, setShowQuiz] = useState(false);

  // Мемоизируем выбранный трек
  const audioTrack = useMemo(() => 
    audioTracks.find(track => track.id === selectedTrackId) || audioTracks[0],
    [selectedTrackId]
  );

  // Мемоизируем функцию для прыжков по времени
  const handleTimeJump = useCallback((time: number) => {
    if (wavesurferRef.current) {
      wavesurferRef.current.seekTo(time / wavesurferRef.current.getDuration());
      wavesurferRef.current.play();
    }
  }, []);

  // Мемоизируем обработчик смены трека
  const handleTrackChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTrackId(event.target.value);
    if (wavesurferRef.current) {
      wavesurferRef.current.stop();
    }
  }, []);

  // Мемоизируем функцию маунтинга wavesurfer
  const handleWavesurferMount = useCallback((wavesurfer: WaveSurfer) => {
    wavesurferRef.current = wavesurfer;
  }, []);

  // Мемоизируем функцию переключения квиза
  const toggleQuiz = useCallback(() => {
    setShowQuiz(prev => !prev);
  }, []);

  return (
    <div className='audio-player-wrapper'>
      <div className="audio-player">
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
          />
        )}
      </div>
    </div>
  );
});

Player.displayName = 'Player';

export default Player;