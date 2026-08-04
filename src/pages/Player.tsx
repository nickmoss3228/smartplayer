import React, {
  useRef,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWallet } from "../context/WalletContext";
import axios from "axios";
import WaveformPlayer from "../components/Player/WaveformPlayer";
import Quiz from "../components/Quiz/Quiz";
import { Difficulty, QuizResults, WaveSurferInstance } from "../types/Player";
import { useProgress } from "../context/ProgressContext";
import { FREE_TRIAL_STORIES } from "../constants/trial";
import { GuidedTour } from "../components/GuidedTour/GuidedTour";
import { useTranslation } from "react-i18next";
import { IoChatbubbleEllipsesOutline } from "react-icons/io5";
import FeedbackModal from "../components/Feedback/FeedbackModal";
import { getAudioTracksByStory } from "../modules/audiodata/audioDataByDifficulty";
import { useVocabAudio } from "../components/Player/hooks/useVocabAudio";
import { VocabQuiz } from "../components/Player/Vocabulary/VocabQuiz";
import { trackVocabulary, trackPhrasalVerbs } from "../modules/vocabulary/Vocabulary"
import {
  fetchPublishedStory,
  adaptPublishedStoryToTracks,
  PublishedStory,
} from "../services/storyServices";
import { AudioTrack } from "../types";
import { useListeningTimeSync } from "../hooks/useListeningTimeSync";
import { useVocabProgress } from "../components/Player/hooks/useVocabProgress";
import { saveGuestQuizResult } from "../services/guestProgress";
import { fetchQuizQuestions } from "../services/quizServices";
import { QuizQuestion } from "../types/Quiz";

// Whether a track's "Take the quiz" / "Vocab quiz" buttons should stay
// unlocked persists across visits (not just the current session) once the
// student has heard the whole track once — otherwise navigating away and
// back would make them re-listen just to see the buttons again.
const getListenedKey = (difficulty: string, storySlug: string, level: number) =>
  `listenedFully_${difficulty}_${storySlug}_${level}`;

const hasListenedFullyStored = (difficulty: string, storySlug: string, level: number): boolean =>
  localStorage.getItem(getListenedKey(difficulty, storySlug, level)) === "true";

const markListenedFullyStored = (difficulty: string, storySlug: string, level: number): void => {
  localStorage.setItem(getListenedKey(difficulty, storySlug, level), "true");
};

// Used only while a DB-backed story's tracks are still being fetched (static
// stories always have audioTracks populated synchronously, so this never
// applies to them) — keeps audioTrack.id/.title/.audio safely accessible
// instead of undefined during that brief window.
const PLACEHOLDER_TRACK: AudioTrack = { id: "", title: "", audio: "", subtitles: [], timeMarkers: [] };

const Player = React.memo(() => {
  const { user } = useAuth();
  const { setWalletDirect } = useWallet();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();

  const {
    difficulty: urlDifficulty,
    storySlug: storySlugParam,
    trackNumber: urlTrackNumber,
  } = useParams<{
    difficulty: string;
    storySlug: string;
    trackNumber: string;
  }>();
  const storySlug = storySlugParam ?? "leo";

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  const difficulty = (urlDifficulty ||
    searchParams.get("difficulty") ||
    "easy") as Difficulty;
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
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[] | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizLoadError, setQuizLoadError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const handleOpenFeedback = useCallback(() => {
    setShowFeedback(true);
  }, []);

  const handleCloseFeedback = useCallback(() => {
    setShowFeedback(false);
  }, []);

  // tracks whether the student has listened to the full audio — seeded from
  // localStorage so returning to a finished track keeps the quiz buttons visible
  const [hasListenedFully, setHasListenedFully] = useState(() =>
    hasListenedFullyStored(difficulty, storySlug, level),
  );

  // Push accumulated listening time to the backend while actually on the
  // player, not just when the Dashboard happens to be open.
  useListeningTimeSync(!!user);

  // Which vocab words the student has ever correctly identified — colors
  // their chips in the Player and feeds the Dashboard's "Words Learned" stat.
  const { learnedWords, markLearned } = useVocabProgress(!!user);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const themes: Record<Difficulty, { background: string }> = {
    easy: { background: "from-green-500 via-emerald-500 to-teal-500" },
    medium: { background: "from-yellow-300 via-orange-400 to-red-500" },
    hard: { background: "from-red-500 via-purple-500 to-pink-500" },
  };

  const theme = themes[difficulty] || themes.easy;

  // Reset per-track UI state whenever the level changes, but restore the
  // listened-gate from storage instead of always relocking it.
  useEffect(() => {
    setSelectedTrackId(level.toString());
    setShowQuiz(false);
    setQuizResults(null);
    setQuizQuestions(null);
    setQuizLoadError(false);
    setHasListenedFully(hasListenedFullyStored(difficulty, storySlug, level));
  }, [level, difficulty, storySlug]);

  useEffect(() => {
    // Route layer (TrackProtectedRoute) already blocks guests on tracks > FREE_TRIAL_STORIES.
    // Only redirect here as a safety net for the legacy /player route which has no params.
    if (!user && level > FREE_TRIAL_STORIES) {
      navigate("/login");
      return;
    }
    if (isInitialLoad) return;
  }, [user, difficulty, level, storySlug, isInitialLoad, navigate]);

  const staticAudioTracks = useMemo(
    () => getAudioTracksByStory(difficulty, storySlug),
    [difficulty, storySlug],
  );

  // Story isn't in the static config — it may be a DB-backed story authored
  // via the admin Story Builder. Fetched once; static stories skip this
  // entirely (staticAudioTracks.length > 0 short-circuits below).
  const [dbStory, setDbStory] = useState<PublishedStory | null>(null);
  const [dbStoryLoading, setDbStoryLoading] = useState(staticAudioTracks.length === 0);

  useEffect(() => {
    if (staticAudioTracks.length > 0) {
      setDbStory(null);
      setDbStoryLoading(false);
      return;
    }
    let cancelled = false;
    setDbStoryLoading(true);
    fetchPublishedStory(difficulty, storySlug)
      .then((story) => {
        if (!cancelled) setDbStory(story);
      })
      .finally(() => {
        if (!cancelled) setDbStoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [difficulty, storySlug, staticAudioTracks.length]);

  const dbAudioTracks = useMemo(
    () => (dbStory ? adaptPublishedStoryToTracks(dbStory) : []),
    [dbStory],
  );

  const audioTracks = staticAudioTracks.length > 0 ? staticAudioTracks : dbAudioTracks;

  const resolvedStorySlug =
    storySlug ??
    (difficulty === "easy"
      ? "leo"
      : difficulty === "medium"
        ? "maya"
        : difficulty === "hard"
          ? "daniel"
          : "leo");

  // Quiz questions come from the backend (answer-free) instead of the local
  // audioData files — fetched lazily, only once the student actually opens
  // the quiz for this track.
  useEffect(() => {
    if (!showQuiz) return;
    let cancelled = false;
    setQuizLoading(true);
    setQuizLoadError(false);
    fetchQuizQuestions(difficulty, resolvedStorySlug, level)
      .then((questions) => {
        if (!cancelled) setQuizQuestions(questions);
      })
      .catch((error) => {
        console.error("Failed to load quiz questions:", error);
        if (!cancelled) setQuizLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setQuizLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showQuiz, difficulty, resolvedStorySlug, level]);

  useEffect(() => {
    const nextTrack = audioTracks.find((t) => t.id === (level + 1).toString());
    if (!nextTrack) return;

    // Warm up the CDN/storage edge cache with a HEAD request
    axios.head(nextTrack.audio).catch(() => {
      // Non-critical: silently ignore if the next track doesn't exist yet
    });
  }, [level, audioTracks]);

  const audioTrack = useMemo(
    () =>
      audioTracks.find((track) => track.id === selectedTrackId) ||
      audioTracks[0] ||
      PLACEHOLDER_TRACK,
    [selectedTrackId, audioTracks],
  );

  const handleTimeJump = useCallback((time: number) => {
    if (wavesurferRef.current) {
      wavesurferRef.current.seekTo(time / wavesurferRef.current.getDuration());
      wavesurferRef.current.play();
    }
  }, []);

  const handleWavesurferMount = useCallback(
    (wavesurfer: WaveSurferInstance) => {
      wavesurferRef.current = wavesurfer;
    },
    [],
  );

  console.log(
    "[Player] difficulty:",
    difficulty,
    "storySlug:",
    storySlug,
    "level:",
    level,
  );
  console.log(
    "[Player] resolved audioTrack:",
    audioTrack?.id,
    audioTrack?.title,
    audioTrack?.audio,
  );

  // called by WaveformPlayer when the track ends
  const handleAudioComplete = useCallback(() => {
    setHasListenedFully(true);
    markListenedFullyStored(difficulty, storySlug, level);
  }, [difficulty, storySlug, level]);

  const handleQuizComplete = useCallback(
    async (results: QuizResults) => {
      // Guest completed a trial track — save locally so it isn't lost if
      // they sign up later (AuthContext migrates this into their account).
      if (!user) {
        setQuizResults(results);
        saveGuestQuizResult(
          difficulty,
          resolvedStorySlug,
          level,
          results.correctAnswers,
          results.totalQuestions,
          audioTracks.length,
        );
        return;
      }

      if (isSubmitting) return; // ← just isSubmitting, !user is already handled above

      setIsSubmitting(true);
      setQuizResults(results);

      try {
        const token = localStorage.getItem("token");
        const response = await axios.post(
          `${API_BASE_URL}/api/progress/complete`,
          {
            difficulty,
            storyId: resolvedStorySlug,
            partNumber: level,
            answers: results.answers,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        console.log("Progress saved:", response.data);

        // The endpoint only awards BitAward (and returns a wallet) on an
        // actual pass — push it straight into the shared cache so the navbar
        // chip updates immediately, no extra fetch needed.
        if (response.data.wallet) setWalletDirect(response.data.wallet);

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
    [
      user,
      difficulty,
      level,
      resolvedStorySlug,
      isSubmitting,
      refreshStoryProgress,
      audioTracks,
      setWalletDirect,
    ],
  );

  const [showVocabQuiz, setShowVocabQuiz] = useState(false);
  const { playVocabWord } = useVocabAudio(
    String(audioTrack.id),
    difficulty,
    storySlug,
  );

  // DB-backed story's vocab/phrasal words for the selected part, if any —
  // only consulted when the static Vocabulary.ts lists have nothing (legacy
  // stories keep using their existing folder-path-derived audio untouched).
  const dbPart = useMemo(
    () => dbStory?.parts.find((p) => String(p.partNumber) === selectedTrackId),
    [dbStory, selectedTrackId],
  );

  const allVocabWords = useMemo(() => {
    const vocab = (trackVocabulary[difficulty]?.[storySlug]?.[selectedTrackId] ?? [])
      .map((w) => ({ ...w, type: "vocab" as const }));
    const phrasal = (trackPhrasalVerbs[difficulty]?.[storySlug]?.[selectedTrackId] ?? [])
      .map((w) => ({ ...w, type: "phrasal" as const }));
    if (vocab.length > 0 || phrasal.length > 0) return [...vocab, ...phrasal];

    const dbVocab = (dbPart?.vocabulary ?? []).map((w) => ({ ...w, type: "vocab" as const }));
    const dbPhrasal = (dbPart?.phrasalVerbs ?? []).map((w) => ({ ...w, type: "phrasal" as const }));
    return [...dbVocab, ...dbPhrasal];
  }, [difficulty, storySlug, selectedTrackId, dbPart]);

  // DB vocab entries already carry their full audioUrl (no folder-path
  // construction needed) — play those directly, falling back to the
  // legacy folder-map-based lookup for static stories.
  const dbVocabAudioUrls = useMemo(() => {
    const entries = [...(dbPart?.vocabulary ?? []), ...(dbPart?.phrasalVerbs ?? [])];
    return new Map(entries.map((w) => [w.audioKey.toLowerCase(), w.audioUrl]));
  }, [dbPart]);

  const playVocabWordUnified = useCallback(
    (fileName: string, type: "vocab" | "phrasal" = "vocab"): HTMLAudioElement | null => {
      const dbUrl = dbVocabAudioUrls.get(fileName.toLowerCase());
      if (dbUrl) {
        const audio = new Audio(dbUrl);
        audio.play().catch(() => {});
        return audio;
      }
      return playVocabWord(fileName, type);
    },
    [dbVocabAudioUrls, playVocabWord],
  );
  
  // useEffect(() => {
  // console.log("Audio URL being passed to WaveformPlayer:", audioTrack.audio);
  // }, [audioTrack]);

  return dbStoryLoading ? (
    <div className="flex justify-center items-center h-dvh">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white/70" />
    </div>
  ) : (
    <div
      className={`h-dvh overflow-hidden bg-gradient-to-br ${theme.background} pt-1`}
    >
      <GuidedTour />
      <div className="flex justify-center items-center h-full">
        <div className="relative w-full h-full max-w-[1100px] md:h-auto md:mt-10 mx-auto md:p-10 bg-white/15 backdrop-blur-sm rounded-2xl text-center animate-fade-in flex flex-col overflow-hidden">
          {/* ── TOP ZONE: back button, title, feedback — fixed height, never shrinks ── */}
          <div className="shrink-0 relative flex items-center justify-center min-h-[52px] px-2">
            <button
              onClick={() =>
                showQuiz
                  ? setShowQuiz(false)
                  : showVocabQuiz
                    ? setShowVocabQuiz(false)
                    : navigate(backPath)
              }
              className="absolute left-3 flex items-center gap-1.5 text-black/60 cursor-pointer hover:text-black transition-colors text-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <h1 className="text-lg text-black font-bold px-10 truncate">
              {audioTrack.title}
            </h1>

            <button
              onClick={handleOpenFeedback}
              aria-label={t("controls.feedback", "Send feedback")}
              className="absolute right-3 p-2 rounded-full text-black/50 hover:text-black/80 active:scale-95 transition-all cursor-pointer"
            >
              <IoChatbubbleEllipsesOutline className="w-6 h-6" />
            </button>
          </div>

          {/* ── MIDDLE + BOTTOM: everything else lives inside WaveformPlayer now ── */}
          {showQuiz ? (
            <div className="flex-1 min-h-0 overflow-y-auto pb-[180px] flex flex-col justify-center">
              {quizLoading || !quizQuestions ? (
                <p className="text-center text-black/50 text-sm py-10">
                  {quizLoadError ? t("player.quiz-load-error") : t("player.quiz-loading")}
                </p>
              ) : (
                <Quiz
                  onTimeJump={handleTimeJump}
                  questions={quizQuestions}
                  difficulty={difficulty}
                  storyId={resolvedStorySlug}
                  partNumber={level}
                  onQuizComplete={handleQuizComplete}
                  isSubmitting={isSubmitting}
                />
              )}
            </div>
          ) : showVocabQuiz ? (
            <div className="flex-1 min-h-0">
              <VocabQuiz
                words={allVocabWords}
                onPlay={playVocabWordUnified}
                onClose={() => setShowVocabQuiz(false)}
                onComplete={markLearned}
                learnedWords={learnedWords}
              />
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col relative">
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
                helpAudioUrls={audioTrack.helpAudio}
                storySlug={storySlug}
                hasListenedFully={hasListenedFully}
                onOpenQuiz={() => setShowQuiz(true)}
                onOpenVocabQuiz={() => setShowVocabQuiz(true)}
                learnedWords={learnedWords}
              />
            </div>
          )}
        </div>
      </div>
      {showFeedback && <FeedbackModal onClose={handleCloseFeedback} />}
    </div>
  );
});

Player.displayName = "Player";
export default Player;