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
import { resolveStory, findResolvedTrack, withLocalizedTitles } from "../modules/story/resolveStory";
import { useAppLocale } from "../types/storyGroups";
import { useVocabAudio } from "../components/Player/hooks/useVocabAudio";
import { VocabQuiz } from "../components/Player/Vocabulary/VocabQuiz";
import { PanelQuiz } from "../components/Player/PanelQuiz/PanelQuiz";
import {
  PracticeModal,
  type PracticeKind,
  type PracticeOption,
} from "../components/Player/Practice/PracticeModal";
import { questionsFromClips } from "../modules/comicPractice/panelQuizRounds";
import {
  isPanelQuizDone,
  markPanelQuizDone,
  passed as panelQuizPassed,
} from "../modules/comicPractice/panelQuizProgress";
import {
  fetchPublishedStory,
  PublishedStory,
} from "../services/storyServices";
import { AudioTrack } from "../types";
import { useListeningTimeSync } from "../hooks/useListeningTimeSync";
import { useVocabProgress } from "../components/Player/hooks/useVocabProgress";
import { getGuestStoryProgress, saveGuestQuizResult } from "../services/guestProgress";
import { fetchQuizQuestions } from "../services/quizServices";
import { preloadAudio } from "../services/preload";
import { QuizQuestion } from "../types/Quiz";

// Whether a track's «Практика» button (the quiz and the practice games) stays
// unlocked persists across visits (not just the current session) once the
// student has heard the whole track once — otherwise navigating away and
// back would make them re-listen just to see the button again.
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
  const locale = useAppLocale();

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

  const { refreshStoryProgress, getStoryData, storyProgress, isInitialLoad } = useProgress();

  const navigate = useNavigate();

  const wavesurferRef = useRef<WaveSurferInstance | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState(level.toString());
  const [showQuiz, setShowQuiz] = useState(false);
  const [showPanelQuiz, setShowPanelQuiz] = useState(false);
  // The practice window: opens by itself when a part ends, and from «Практика».
  const [showPractice, setShowPractice] = useState(false);
  // Bumped when progress kept in this browser changes (a guest's quiz, the
  // comic game), so the ticks in the practice window are read again.
  const [localProgressTick, setLocalProgressTick] = useState(0);
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
    setShowPanelQuiz(false);
    setShowPractice(false);
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
  const { getCatalogStory, paywallEnabled, signupWallEnabled, catalogLoading } = useCatalog();
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
      (!paywallEnabled && (Boolean(user) || !signupWallEnabled))
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

  // Resolved once, from ONE source — the published story (see
  // modules/story/resolveStory.ts). Nothing plays until the server answers.
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

  const resolvedStory = useMemo(() => {
    const resolved = resolveStory(difficulty, storySlug, dbStory);
    // The header names the part in the reader's language, as the grid does.
    return { ...resolved, tracks: withLocalizedTitles(resolved, dbStory, locale) };
  }, [dbStory, difficulty, storySlug, locale]);
  const audioTracks = resolvedStory.tracks;
  const dbStoryLoading = !dbChecked;
  // The desktop header's eyebrow: the story's name, as the shelves show it.
  const storyTitle = dbStory?.localized?.title?.[locale]?.trim() || dbStory?.storyName;

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
    // The moment a part ends is when to offer what comes next.
    setShowPractice(true);
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
        setLocalProgressTick((n) => n + 1);
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

  // The comic game needs all three: the page to tap, the audio to play lines
  // from, and the game itself. A part missing any of them shows no button.
  const panelQuiz =
    audioTrack.panelQuiz && audioTrack.comicUrl && audioTrack.audio ? audioTrack.panelQuiz : null;

  // ── The practice window ───────────────────────────────────────────────
  // The context preloads progress only for the built-in story slugs; any
  // other story (the news shelf, a Builder story) is fetched here once, so
  // its quiz tick is right too.
  const progressKey = `${difficulty}:${resolvedStorySlug}`;
  useEffect(() => {
    if (!user || isInitialLoad || storyProgress[progressKey]) return;
    refreshStoryProgress(difficulty, resolvedStorySlug);
  }, [user, isInitialLoad, storyProgress, progressKey, difficulty, resolvedStorySlug, refreshStoryProgress]);

  const quizCount = dbStory?.parts.find((p) => p.partNumber === level)?.quiz?.length ?? 0;
  const comicQuestions = useMemo(() => (panelQuiz ? questionsFromClips(panelQuiz.clips).length : 0), [panelQuiz]);
  const completedParts = user ? getStoryData(difficulty, resolvedStorySlug).completedParts : null;

  // Only what this part has, the quiz first: a part with no quiz written, or
  // fewer than the word game's 4 words, or no comic game, offers no tile for
  // it. `done` is what puts the tick on a tile.
  const practiceOptions = useMemo<PracticeOption[]>(() => {
    const quizDone = (
      completedParts ?? getGuestStoryProgress(difficulty, resolvedStorySlug).completedParts
    ).includes(level);
    const options: PracticeOption[] = [];
    if (quizCount > 0) options.push({ kind: "quiz", count: quizCount, done: quizDone });
    if (allVocabWords.length >= 4) {
      options.push({
        kind: "words",
        count: allVocabWords.length,
        done: allVocabWords.every((w) => learnedWords.has((w.audioKey ?? w.word).toLowerCase())),
      });
    }
    if (comicQuestions > 0) {
      options.push({
        kind: "comic",
        count: comicQuestions,
        done: isPanelQuizDone(difficulty, resolvedStorySlug, level),
      });
    }
    return options;
    // localProgressTick is not read inside: it is the signal to read this
    // browser's storage again after the guest quiz or the comic game wrote to it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizCount, completedParts, allVocabWords, learnedWords, comicQuestions, difficulty, resolvedStorySlug, level, localProgressTick]);

  const practiceKinds = useMemo(() => practiceOptions.map((o) => o.kind), [practiceOptions]);
  const practicesDone = practiceOptions.filter((o) => o.done).length;

  const openPractice = useCallback(() => setShowPractice(true), []);
  const closePractice = useCallback(() => setShowPractice(false), []);
  const handlePickPractice = useCallback((kind: PracticeKind) => {
    setShowPractice(false);
    if (kind === "quiz") setShowQuiz(true);
    else if (kind === "words") setShowVocabQuiz(true);
    else setShowPanelQuiz(true);
  }, []);

  const handlePanelQuizFinish = useCallback(
    (score: number, total: number) => {
      if (!panelQuizPassed(score, total)) return;
      markPanelQuizDone(difficulty, resolvedStorySlug, level);
      setLocalProgressTick((n) => n + 1);
    },
    [difficulty, resolvedStorySlug, level],
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 dialog-backdrop-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-[3px] bg-white p-7 text-center shadow-xl dialog-panel-in">
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
              className="mb-3 w-full cursor-pointer rounded-[3px] bg-gray-900 py-3 font-semibold text-white transition-opacity hover:opacity-90"
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
        {/* No backdrop-blur on this panel: behind it is only the static theme
            gradient, which a blur leaves looking the same, but on a phone the
            panel is the whole screen and the waveform redraws inside it every
            frame of playback — so the compositor re-blurred the full screen
            60 times a second for no visible difference.
            From md up the panel has a height (it used to be h-auto inside an
            h-dvh overflow-hidden page, so a part with many words simply lost
            its last rows off the bottom edge); what is inside scrolls. The
            player is capped at 760 px so it stays a compact instrument; the
            comic game is not, because its page is portrait and every pixel of
            height is a bigger panel to tap. */}
        <div
          className={`relative w-full h-full max-w-[1100px] md:w-[calc(100%-3rem)] ${
            showPanelQuiz && panelQuiz
              ? "md:h-[calc(100dvh-2rem)]"
              : "md:h-[calc(100dvh-4rem)] lg:h-[min(760px,calc(100dvh-4rem))]"
          } mx-auto md:gap-4 md:px-8 md:pt-5 md:pb-7 bg-white/15 rounded-[3px] md:rounded-card text-center animate-fade-in flex flex-col overflow-hidden`}
        >
          {/* ── TOP ZONE: back button, title, feedback — fixed height, never shrinks.
              Phone: title centred between two pinned buttons. Desktop: one
              left-aligned row, with the story and part above the title. ── */}
          <div className="shrink-0 relative flex items-center justify-center min-h-[52px] px-2 md:justify-start md:gap-2 md:px-0">
            <button
              onClick={() =>
                showQuiz
                  ? setShowQuiz(false)
                  : showVocabQuiz
                    ? setShowVocabQuiz(false)
                    : showPanelQuiz
                      ? setShowPanelQuiz(false)
                      : navigate(backPath)
              }
              aria-label={t("player.back")}
              className="absolute left-3 flex items-center gap-1.5 text-black/60 cursor-pointer hover:text-black transition-colors text-sm md:static md:-ml-2.5 md:h-10 md:w-10 md:shrink-0 md:justify-center md:rounded-full md:hover:bg-black/5"
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

            <div className="min-w-0 md:flex-1 md:text-left">
              <p className="hidden md:block truncate font-mono text-[10px] uppercase tracking-[0.16em] text-black/55">
                {storyTitle ? `${storyTitle} · ` : ""}
                {t("player.partOf", { n: level, total: audioTracks.length })}
              </p>
              <h1 className="text-lg text-black font-bold px-10 truncate md:px-0 md:text-[22px] md:font-extrabold md:leading-tight md:tracking-tight">
                {audioTrack.title}
              </h1>
            </div>

            <button
              onClick={handleOpenFeedback}
              aria-label={t("controls.feedback", "Send feedback")}
              className="absolute right-3 p-2 rounded-full text-black/50 hover:text-black/80 active:scale-95 transition-all cursor-pointer md:static md:-mr-2 md:ml-auto md:shrink-0"
            >
              <IoChatbubbleEllipsesOutline className="w-6 h-6" />
            </button>
          </div>

          {/* ── MIDDLE + BOTTOM: everything else lives inside WaveformPlayer now ── */}
          {showQuiz ? (
            <div className="flex-1 min-h-0 overflow-y-auto pb-[180px] md:pb-6 flex flex-col justify-center md:justify-center-safe">
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
          ) : showPanelQuiz && panelQuiz ? (
            <div className="flex-1 min-h-0">
              <PanelQuiz
                comicUrl={audioTrack.comicUrl ?? ""}
                audioUrl={audioTrack.audio}
                quiz={panelQuiz}
                onClose={() => setShowPanelQuiz(false)}
                onFinish={handlePanelQuizFinish}
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
                trackTitle={audioTrack.title}
                hasListenedFully={hasListenedFully}
                practices={practiceKinds}
                practicesDone={practicesDone}
                onOpenPractice={openPractice}
                learnedWords={learnedWords}
              />
            </div>
          )}
        </div>
      </div>
      {showFeedback && <FeedbackModal onClose={handleCloseFeedback} />}
      {showPractice && practiceOptions.length > 0 && (
        <PracticeModal
          part={level}
          nextPart={level < audioTracks.length ? level + 1 : null}
          options={practiceOptions}
          onPick={handlePickPractice}
          onClose={closePractice}
        />
      )}
    </div>
  );
});

Player.displayName = "Player";
export default Player;