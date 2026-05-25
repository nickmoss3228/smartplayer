import React, {
  useRef,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import WaveformPlayer from "../components/Player/WaveformPlayer";
import Quiz from "../components/Quiz/Quiz";
import { getAudioTracksByDifficulty } from "../modules/audiodata/audioDataByDiffculty";
import { Difficulty, QuizResults, WaveSurferInstance } from "../types/Player";
import { useProgress } from "../context/ProgressContext";

const Player = React.memo(() => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const {
    difficulty: urlDifficulty,
    storySlug,
    trackNumber: urlTrackNumber,
  } = useParams<{
    difficulty: string;
    storySlug: string;
    trackNumber: string;
  }>();

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  const difficulty = (urlDifficulty || searchParams.get("difficulty") || "easy") as Difficulty;
  const level = urlTrackNumber
    ? parseInt(urlTrackNumber)
    : parseInt(searchParams.get("level") || "1");

  const backPath = storySlug
    ? `/levels/${difficulty}/${storySlug}`
    : `/levels/${difficulty}`;

  // Replace the useProgress destructure in Player.tsx
  const { refreshStoryProgress, isInitialLoad } = useProgress();
  
  const navigate = useNavigate();

  const wavesurferRef = useRef<WaveSurferInstance | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState(level.toString());
  const [showQuiz, setShowQuiz] = useState(false);
  const [_quizResults, setQuizResults] = useState<QuizResults | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // tracks whether the student has listened to the full audio 
  const [hasListenedFully, setHasListenedFully] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const themes: Record<Difficulty, { background: string }> = {
    easy:   { background: "from-green-500 via-emerald-500 to-teal-500" },
    medium: { background: "from-yellow-300 via-orange-400 to-red-500" },
    hard:   { background: "from-red-500 via-purple-500 to-pink-500" },
  };

  const theme = themes[difficulty] || themes.easy;

  // Reset audio gate whenever the level changes
  useEffect(() => {
    setSelectedTrackId(level.toString());
    setShowQuiz(false);
    setQuizResults(null);
    setHasListenedFully(false);
  }, [level]);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (isInitialLoad) return;
  }, [user, difficulty, level, storySlug, isInitialLoad, navigate]);

  const audioTracks = useMemo(
    () => getAudioTracksByDifficulty(difficulty),
    [difficulty]
  );

  

  const resolvedStorySlug = storySlug ?? (
  difficulty === "easy" ? "leo" :
  difficulty === "medium" ? "maya" :
  difficulty === "hard" ? "daniel" : "leo"
);

  // useEffect(() => {
  //   const nextTrack = audioTracks.find((t) => t.id === (level + 1).toString());
  //   if (nextTrack) {
  //     const audio = new Audio();
  //     audio.preload = "auto";
  //     audio.src = nextTrack.audio;
  //   }
  // }, [level, audioTracks]);

  useEffect(() => {
  const nextTrack = audioTracks.find((t) => t.id === (level + 1).toString());
  if (!nextTrack) return;

  // Warm up the CDN/storage edge cache with a HEAD request
  axios.head(nextTrack.audio).catch(() => {
    // Non-critical: silently ignore if the next track doesn't exist yet
  });
}, [level, audioTracks]);

  const audioTrack = useMemo(
    () => audioTracks.find((track) => track.id === selectedTrackId) || audioTracks[0],
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

  // called by WaveformPlayer when the track ends
  const handleAudioComplete = useCallback(() => {
    setHasListenedFully(true);
  }, []);

// Replace handleQuizComplete in Player.tsx
const handleQuizComplete = useCallback(
  async (results: QuizResults) => {
    if (!user || isSubmitting) return;

    setIsSubmitting(true);
    setQuizResults(results);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_BASE_URL}/api/progress/complete`,
        {
          difficulty,
          storyId: resolvedStorySlug,   // ← was missing
          partNumber: level,             // ← was "level"
          correctAnswers: results.correctAnswers,
          totalQuestions: results.totalQuestions,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("Progress saved:", response.data);

      // Refresh just this story's progress
      await refreshStoryProgress(difficulty, resolvedStorySlug);
    } catch (error) {
      console.error("Failed to save progress:", error);
      if (axios.isAxiosError(error)) {
        console.error("Error response:", error.response?.data);
      }
      alert("Failed to save your progress. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  },
  [user, difficulty, level, resolvedStorySlug, isSubmitting, refreshStoryProgress]
  );

  useEffect(() => {
  console.log("Audio URL being passed to WaveformPlayer:", audioTrack.audio);
  }, [audioTrack]);
  
  
  
  return (
    <div className={`min-h-screen pt-13 bg-gradient-to-br ${theme.background}`}>
      <div className="flex justify-center items-center align-center ">
        <div className="relative w-full max-w-[1100px] md:mt-10 mx-auto my-0.5 md:p-10 bg-white/15 backdrop-blur-sm rounded-2xl text-center animate-fade-in">

          {/* Back button */}
          <button
            onClick={() => showQuiz ? setShowQuiz(false) : navigate(backPath)}
            className="absolute top-5 left-5 flex items-center gap-1.5 text-black/60 cursor-pointer hover:text-black transition-colors text-sm z-10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {showQuiz ? "Back to Player" : ""}
          </button>

          {/* Track header */}
          <div className="min-h-[60px] items-center flex flex-col justify-center rounded-lg">
            {/* <h3 className="text-sm text-black">
              Level {level} –{" "}
              {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} */}
              {/* {storySlug && (
                <span className="ml-1 text-black">
                  · {storySlug.charAt(0).toUpperCase() + storySlug.slice(1)}'s Story
                </span>
              )} */}
            {/* </h3> */}
            <h1 className="text-xl -mt-1.5 text-black font-bold">{audioTrack.title}</h1>
          </div>

          {/* Main content */}
          {showQuiz ? ( 
            <Quiz
              onTimeJump={handleTimeJump}
              questions={audioTrack.quiz}
              onQuizComplete={handleQuizComplete}
              isSubmitting={isSubmitting}
            />
          ) : (
            <>
              <WaveformPlayer
                key={`${difficulty}-${level}`}
                audioUrl={audioTrack.audio}
                  trackId={audioTrack.id}
                  difficulty={difficulty}
                level={String(level)}
                subtitles={audioTrack.subtitles}
                timeMarkers={audioTrack.timeMarkers}
                onWavesurferMount={handleWavesurferMount}
                onAudioComplete={handleAudioComplete}
              />

              {/* locked until audio fully played */}
              <div className="mb-4 flex flex-col items-center gap-2">
                <button
                  onClick={() => setShowQuiz(true)}
                  disabled={!hasListenedFully}
                  className={`px-6 py-3 font-semibold rounded-xl transition-all duration-200 backdrop-blur-sm border
                    ${hasListenedFully
                      ? "bg-white/20 hover:bg-white/30 text-white border-white/20 hover:border-white/40 cursor-pointer"
                      : "bg-white/5 text-white/30 border-white/10 cursor-not-allowed"
                    }`}
                >
                  {hasListenedFully ? "Take the Quiz →" : "Listen to unlock the Quiz"}
                </button>
                {!hasListenedFully && (
                  <p className="text-white/40 text-xs">
                    Complete the audio track to unlock the quiz.
                  </p>
                )}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
});

Player.displayName = "Player";
export default Player;