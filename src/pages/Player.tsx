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
import { useEntitlements } from "../context/EntitlementsContext";
import { storyKey } from "../config/priceCatalog";
import { useCatalog } from "../context/CatalogContext";
import { GuidedTour } from "../components/GuidedTour/GuidedTour";
import { useTranslation } from "react-i18next";
import { IoChatbubbleEllipsesOutline } from "react-icons/io5";
import FeedbackModal from "../components/Feedback/FeedbackModal";
import { resolveStory, findResolvedTrack } from "../modules/story/resolveStory";
import { useVocabAudio } from "../components/Player/hooks/useVocabAudio";
import { VocabQuiz } from "../components/Player/Vocabulary/VocabQuiz";
import {
  fetchPublishedStory,
  PublishedStory,
} from "../services/storyServices";
import { AudioTrack } from "../types";
import { useListeningTimeSync } from "../hooks/useListeningTimeSync";
import { useVocabProgress } from "../components/Player/hooks/useVocabProgress";
import { saveGuestQuizResult } from "../services/guestProgress";
import { fetchQuizQuestions } from "../services/quizServices";
import { preloadAudio } from "../services/preload";
import { QuizQuestion } from "../types/Quiz";

// Whether a track's "Take the quiz" / "Vocab quiz" buttons should stay
// unlocked persists across visits (not just the current session) once the
// student has heard the whole track once — otherwise navigating away and
// back would make them re-listen just to see the buttons again.
const getListenedKey = (difficulty: string, storySlug: string, level: number) =>
  `listenedFully_${difficulty}_${storySlug}_${level}`;
import { API_BASE as API_BASE_URL } from "../services/apiClient";

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
  const { user, loading: authLoading } = useAuth();
  const { owns, entitlementsLoading } = useEntitlements();
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
  const { refreshStoryProgress } = useProgress();

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

  // ── Paywall ───────────────────────────────────────────────────────────
  // Same rule as the level grid (useLevelProgressPage) and the server
  // (config/entitlements.js), for guests and members alike. The grid never
  // links a locked part, but a URL can: send the learner back to the grid with
  // the offer open instead of leaving them on a silent player.
  const { getCatalogStory, paywallEnabled, catalogLoading } = useCatalog();
  const catalogEntry = getCatalogStory(storyKey(difficulty, storySlug));
  // Deliberately the same expression the level grid uses, because these two
  // used to disagree twice over: this one treated a story missing from the
  // catalog as OWNED (fail open, where the grid failed closed), and it derived
  // the allowance from the story's length with freeAllowanceFor() instead of
  // reading the row, so an admin who set freeParts got a grid and a player that
  // disagreed about which parts play.
  const storyOwned = catalogEntry
    ? !catalogEntry.paid ||
      owns(difficulty, storySlug) ||
      (!paywallEnabled && Boolean(user))
    : false;
  const allowance =
    catalogEntry && !storyOwned
      ? { freeParts: catalogEntry.freeParts, previewSeconds: catalogEntry.previewSeconds }
      : null;
  // A story the catalog does not list plays nothing — but only once we know the
  // catalog has actually arrived, or the first frame would bounce everyone.
  const unlisted = !catalogLoading && !catalogEntry;
  const partLocked =
    unlisted ||
    (allowance !== null &&
      !(level <= allowance.freeParts || (allowance.previewSeconds !== null && level === 1)));
  // Part 1 of an unowned short story plays for this long, then stops.
  const previewSeconds =
    allowance !== null && allowance.previewSeconds !== null && level === 1 && level > allowance.freeParts
      ? allowance.previewSeconds
      : null;

  useEffect(() => {
    // Ownership is unknown until both have loaded; redirecting earlier would
    // bounce a paying customer off their own story.
    if (authLoading || entitlementsLoading || catalogLoading) return;
    if (partLocked) navigate(backPath, { replace: true, state: { openPaywall: true } });
  }, [authLoading, entitlementsLoading, catalogLoading, partLocked, navigate, backPath]);

  const [previewEnded, setPreviewEnded] = useState(false);

  useEffect(() => {
    setPreviewEnded(false);
    if (previewSeconds === null) return;
    // Polled rather than hooked into the waveform's events: Enhanced mode
    // drives playback segment by segment and resumes on its own, so a one-off
    // pause at the boundary would be undone. Every tick past the limit pauses
    // again, and the dialog below covers the controls.
    const id = window.setInterval(() => {
      const ws = wavesurferRef.current as unknown as {
        getCurrentTime?: () => number;
        pause?: () => void;
      } | null;
      const time = ws?.getCurrentTime?.();
      if (typeof time === "number" && time >= previewSeconds) {
        ws?.pause?.();
        setPreviewEnded(true);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [previewSeconds, level]);

  // Resolved once, from ONE source — see modules/story/resolveStory.ts. Before
  // this, tracks came from the DB while the vocabulary chips came from the
  // static tables, so a published story was only ever half itself.
  const staticStory = useMemo(
    () => resolveStory(difficulty, storySlug, null),
    [difficulty, storySlug],
  );

  // Whole-story, DB-wins-once-published precedence (matches the backend's
  // helpers/storyLookup.js): always check for a published Story Builder
  // override — including for static stories like leo/maya/daniel, since an
  // imported+published copy must actually take effect — but never block
  // rendering on it. Static content (if any) renders immediately; if a
  // published override is found, everything for this story (tracks, vocab,
  // phrasal) swaps to the DB copy. Only a story with nothing static at all
  // shows a loading spinner until the DB check resolves (see dbChecked below).
  const [dbStory, setDbStory] = useState<PublishedStory | null>(null);
  const [dbChecked, setDbChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDbChecked(false);
    fetchPublishedStory(difficulty, storySlug)
      .then((story) => {
        if (cancelled) return;
        setDbStory(story);
        setDbChecked(true);
      })
      .catch(() => {
        if (!cancelled) setDbChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [difficulty, storySlug]);

  const resolvedStory = useMemo(
    () => (dbStory ? resolveStory(difficulty, storySlug, dbStory) : staticStory),
    [dbStory, difficulty, storySlug, staticStory],
  );
  const audioTracks = resolvedStory.tracks;
  const dbStoryLoading = audioTracks.length === 0 && !dbChecked;

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

  // Warm the browser cache for the next track.
  //
  // This used to be an axios.head(), which did nothing useful three times over:
  // a HEAD response has no body so it populates no cache, there is no CDN edge
  // in front of the bucket to warm, and a cross-origin axios.head needs a CORS
  // preflight the bucket doesn't answer — so it was failing silently into an
  // empty catch. A real ranged GET through an <audio> element (no crossOrigin
  // attribute, so it's a no-CORS media load) actually fills the cache.
  useEffect(() => {
    const nextTrack = audioTracks.find((t) => t.id === (level + 1).toString());
    if (!nextTrack?.audio) return;

    // 'metadata' fetches only the container header, 'low' keeps it out of the
    // way of the track that's actually playing.
    const element = preloadAudio(nextTrack.audio, "metadata", "low");
    return () => {
      // Abort the in-flight fetch if the student moves on before it lands.
      element.src = "";
      element.load();
    };
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
  const { playVocabWord } = useVocabAudio(String(audioTrack.id));

  const resolvedTrack = useMemo(
    () => findResolvedTrack(resolvedStory, selectedTrackId),
    [resolvedStory, selectedTrackId],
  );

  // The SAME list the chips get. These used to be computed separately: this
  // one was DB-aware and fed the Vocab Quiz, while WaveformPlayer looked up
  // its chips from the static table — two word lists for one track, on screen
  // at the same time.
  const allVocabWords = useMemo(
    () => [
      ...(resolvedTrack?.vocabulary ?? []).map((w) => ({ ...w, type: "vocab" as const })),
      ...(resolvedTrack?.phrasalVerbs ?? []).map((w) => ({ ...w, type: "phrasal" as const })),
    ],
    [resolvedTrack],
  );

  // Every entry already carries a resolved URL, so there is nothing to look
  // up and no folder-path fallback left to disagree with.
  const playVocabWordUnified = useCallback(
    (_audioKey: string, audioUrl: string) => playVocabWord(audioUrl),
    [playVocabWord],
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
      {previewEnded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-7 text-center shadow-2xl">
            <h2 className="mb-2 text-xl font-bold text-gray-900">{t("playerPreview.endedTitle")}</h2>
            <p className="mb-6 text-sm leading-relaxed text-gray-500">{t("playerPreview.endedBody")}</p>
            <button
              onClick={() =>
                // Nothing is for sale: the way on is an account, not a purchase.
                paywallEnabled
                  ? navigate(backPath, { state: { openPaywall: true } })
                  : navigate(user ? backPath : '/login', {
                      state: user ? undefined : { returnTo: backPath },
                    })
              }
              className="mb-3 w-full cursor-pointer rounded-xl bg-gray-900 py-3 font-semibold text-white transition-opacity hover:opacity-90"
            >
              {paywallEnabled ? t("playerPreview.buy") : t("paywall.signUpToContinue")}
            </button>
            <button
              onClick={() => navigate(backPath)}
              className="cursor-pointer text-sm text-gray-400 transition-colors hover:text-gray-600"
            >
              {t("playerPreview.back")}
            </button>
          </div>
        </div>
      )}
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
                vocabulary={resolvedTrack?.vocabulary ?? []}
                phrasalVerbs={resolvedTrack?.phrasalVerbs ?? []}
                difficulty={difficulty}
                level={String(level)}
                subtitles={audioTrack.subtitles}
                timeMarkers={audioTrack.timeMarkers}
                onWavesurferMount={handleWavesurferMount}
                onAudioComplete={handleAudioComplete}
                helpAudioUrls={audioTrack.helpAudio}
                storySlug={storySlug}
                comicUrl={audioTrack.comicUrl}
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