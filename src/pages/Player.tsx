import React, {
  useRef,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import WaveformPlayer from "../modules/WaveformPlayer";
import Quiz from "../modules/Quiz";
import { getAudioTracksByDifficulty } from "../modules/audioDataByDiffculty";
import { Difficulty, QuizResults, WaveSurferInstance } from "../types/Player";
import { useProgress } from "../context/ProgressContext";


const Player = React.memo(() => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const difficulty = (searchParams.get("difficulty") || "easy") as Difficulty;
  const level = parseInt(searchParams.get("level") || "1");

  const { canAccessLevel, getHighestUnlockedLevel, isInitialLoad } = useProgress();
  const navigate = useNavigate();
  
  const wavesurferRef = useRef<WaveSurferInstance | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState(level.toString());
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizResults, setQuizResults] = useState<QuizResults | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    console.log(showQuiz)
    }, [location.pathname]);

  const themes: Record<Difficulty, { background: string }> = {
    easy: {
      background: "from-green-900 via-emerald-900 to-teal-800",
    },
    medium: {
      background: "from-yellow-900 via-orange-900 to-red-800",
    },
    hard: {
      background: "from-red-900 via-purple-900 to-pink-800",
    },
  };

  const theme = themes[difficulty] || themes.easy;

  useEffect(() => {
    setSelectedTrackId(level.toString());
    setShowQuiz(false);
    setQuizResults(null);
  }, [level]);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    // Wait for initial progress load
    if (isInitialLoad) return;

    // Check if user can access this level
    if (!canAccessLevel(difficulty, level)) {
      const highestLevel = getHighestUnlockedLevel(difficulty);
      alert(`You need to complete Level ${level - 1} first!`);
      navigate(`/player?difficulty=${difficulty}&level=${highestLevel}`);
    }
  }, [user, difficulty, level, canAccessLevel, getHighestUnlockedLevel, isInitialLoad, navigate]);

  // Get the appropriate audio tracks based on difficulty
  const audioTracks = useMemo(
    () => getAudioTracksByDifficulty(difficulty),
    [difficulty]
  );

  const audioTrack = useMemo(
    () =>
      audioTracks.find((track) => track.id === selectedTrackId) ||
      audioTracks[0],
    [selectedTrackId, audioTracks]
  );

  const handleTimeJump = useCallback((time: number) => {
    if (wavesurferRef.current) {
      wavesurferRef.current.seekTo(time / wavesurferRef.current.getDuration());
      wavesurferRef.current.play();
    }
  }, []);

  const handleWavesurferMount = useCallback((wavesurfer: WaveSurferInstance) => {
    wavesurferRef.current = wavesurfer;
  }, []);

  const handleQuizComplete = useCallback(
    async (results: QuizResults) => {
      if (!user || isSubmitting) return;

      setIsSubmitting(true);
      setQuizResults(results);
      console.log(quizResults)

      try {
        const token = localStorage.getItem("token");

        const response = await axios.post(
          "http://localhost:5000/api/progress/complete",
          {
            difficulty,
            level,
            correctAnswers: results.correctAnswers,
            totalQuestions: results.totalQuestions,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        console.log("Progress saved successfully:", response.data);
      } catch (error) {
        console.error("Failed to save progress:", error);
       // Type guard for AxiosError
      if (axios.isAxiosError(error)) {
        console.error("Error response:", error.response?.data);
      }
        alert("Failed to save your progress. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [user, difficulty, level, isSubmitting]
  );
  

  return (
    <div className={`min-h-screen pt-16 bg-gradient-to-br ${theme.background}`}>
      <div className="flex justify-center items-center">
        <div className="relative w-full max-w-[1100px] h-[800x] mx-auto my-2.5 p-5 bg-white/10 backdrop-blur-sm rounded-2xl text-center animate-fade-in">
          <div className="mb-[50px] bg-[#212121ff] min-h-[60px] items-center flex flex-col justify-center rounded-lg">
            <h3 className="text-sm text-white/80">
              Level {level} -{" "}
              {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
            </h3>
            <h1 className="text-2xl -mt-1.5 text-white font-bold">{audioTrack.title}</h1>
          </div>

          <WaveformPlayer
            audioUrl={audioTrack.audio}
            subtitles={audioTrack.subtitles}
            timeMarkers={audioTrack.timeMarkers}
            onWavesurferMount={handleWavesurferMount}
          />

          <Quiz
            onTimeJump={handleTimeJump}
            questions={audioTrack.quiz}
            onQuizComplete={handleQuizComplete}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
});

Player.displayName = "Player";

export default Player;