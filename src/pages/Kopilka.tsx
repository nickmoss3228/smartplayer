import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IoBookmark, IoBookmarkOutline, IoChevronBack, IoClose, IoVolumeHigh } from "react-icons/io5";
import { useAuth } from "../context/AuthContext";
import { useVocabProgress } from "../components/Player/hooks/useVocabProgress";
import { useVocabAudio } from "../components/Player/hooks/useVocabAudio";
import { WordBoard } from "../components/Player/Vocabulary/WordBoard";
import { useVocabBookmarks } from "../modules/vocab/vocabBookmarks";
import { JarDrawing } from "../modules/vocab/JarIcon";
import type { WindowWord } from "../modules/vocab/textShape";
import { lookupVocabPlaces, type VocabPlace } from "../services/vocabProgressServices";
import { buttonPrimary } from "../components/ui/buttonStyles";

const DIFFICULTY_ORDER: Record<string, number> = { easy: 0, medium: 1, hard: 2 };
const REVIEW_LIMIT = 21;

type Tab = "words" | "marks";

const bySpot = (a: VocabPlace, b: VocabPlace) =>
  (DIFFICULTY_ORDER[a.difficulty] ?? 9) - (DIFFICULTY_ORDER[b.difficulty] ?? 9) ||
  a.storyId.localeCompare(b.storyId) ||
  a.partNumber - b.partNumber;

interface Group {
  id: string;
  place: VocabPlace;
  rows: VocabPlace[];
}

const Kopilka: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { learnedWords, markLearned } = useVocabProgress(!!user);
  const bookmarks = useVocabBookmarks();
  const { playVocabWord } = useVocabAudio("kopilka");

  const [tab, setTab] = useState<Tab>("words");
  const [places, setPlaces] = useState<VocabPlace[]>([]);
  const [lookedUp, setLookedUp] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const fetched = useRef<Set<string>>(new Set());
  // A request in flight is kept when more keys arrive (each request asks only
  // for keys nobody asked for yet, so dropping one would lose its keys for
  // good); only leaving the page discards answers.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const autoOpened = useRef(false);

  const ru = i18n.language.startsWith("ru");
  const pick = (v: { en: string; ru: string } | null | undefined) =>
    (ru ? v?.ru || v?.en : v?.en || v?.ru) ?? "";

  // One lookup for everything shown here. The learned set arrives on its own
  // schedule, so keys that show up later are fetched too, but never twice.
  const allKeys = useMemo(
    () => Array.from(new Set([...learnedWords, ...bookmarks.keys])),
    [learnedWords, bookmarks.keys],
  );
  useEffect(() => {
    if (!bookmarks.ready) return;
    const missing = allKeys.filter((k) => !fetched.current.has(k));
    if (missing.length === 0) {
      setLookedUp(true);
      return;
    }
    missing.forEach((k) => fetched.current.add(k));
    (async () => {
      try {
        const found = await lookupVocabPlaces(missing, localStorage.getItem("token"));
        if (!alive.current) return;
        setPlaces((prev) => [...prev, ...found]);
        setFailed(false);
      } catch {
        // Let a later visit (or a later key) try these again.
        missing.forEach((k) => fetched.current.delete(k));
        if (alive.current) setFailed(true);
      } finally {
        if (alive.current) setLookedUp(true);
      }
    })();
  }, [allKeys, bookmarks.ready]);

  const sortedPlaces = useMemo(() => [...places].sort(bySpot), [places]);

  const fromStories = useMemo(
    () => new Set(sortedPlaces.filter((p) => learnedWords.has(p.key)).map((p) => p.storyId)).size,
    [sortedPlaces, learnedWords],
  );

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>();
    for (const p of sortedPlaces) {
      if (!learnedWords.has(p.key)) continue;
      const id = `${p.storyId}#${p.partNumber}`;
      const g = map.get(id) ?? { id, place: p, rows: [] };
      g.rows.push(p);
      map.set(id, g);
    }
    return Array.from(map.values());
  }, [sortedPlaces, learnedWords]);

  // One place per bookmarked key, newest bookmark first; prefer a place with a clip.
  const markRows = useMemo(() => {
    const out: VocabPlace[] = [];
    for (const key of bookmarks.keys) {
      const own = places.filter((p) => p.key === key);
      const best = own.find((p) => p.audioUrl) ?? own[0];
      if (best) out.push(best);
    }
    return out;
  }, [places, bookmarks.keys]);

  const reviewWords = useMemo<WindowWord[]>(
    () =>
      markRows.slice(0, REVIEW_LIMIT).map((p) => ({
        key: p.key,
        word: p.word,
        audioKey: p.key,
        audioUrl: p.audioUrl ?? "",
        phrasal: p.kind === "phrasal",
      })),
    [markRows],
  );

  useEffect(() => {
    if (autoOpened.current || location.hash !== "#review") return;
    if (reviewWords.length === 0) return;
    autoOpened.current = true;
    setTab("marks");
    setReviewOpen(true);
  }, [location.hash, reviewWords.length]);

  useEffect(() => {
    if (!reviewOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setReviewOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reviewOpen]);

  const loading = !bookmarks.ready || !lookedUp;
  const learnedCount = learnedWords.size;
  const markCount = bookmarks.keys.length;

  const renderRow = (p: VocabPlace, showSpot = false) => {
    const marked = bookmarks.has(p.key);
    return (
      <li key={showSpot ? p.key : undefined} className="flex min-h-[50px] items-center gap-3 border-b border-line">
        <button
          type="button"
          onClick={() => p.audioUrl && playVocabWord(p.audioUrl)}
          disabled={!p.audioUrl}
          aria-label={t("wordGame.hear", { word: p.word })}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-ink text-white transition hover:opacity-90 disabled:opacity-45"
        >
          <IoVolumeHigh size={16} />
        </button>
        <div className="min-w-0 flex-1 py-2">
          <p className="m-0 truncate text-[15.5px] font-semibold text-ink">{p.word}</p>
          {showSpot && (
            <p className="m-0 truncate text-[12px] text-dim">
              {pick(p.storyTitle)} · {t("kopilka.part", { n: p.partNumber })}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => bookmarks.toggle(p.key)}
          aria-pressed={marked}
          aria-label={marked ? t("words.bookmarked") : t("words.bookmark")}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center text-ink"
        >
          {marked ? <IoBookmark size={20} /> : <IoBookmarkOutline size={20} />}
        </button>
      </li>
    );
  };

  const tabButton = (id: Tab, label: string, count: number) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      className={`-mb-px h-11 border-b-2 px-4 text-[14px] font-bold transition-colors ${
        tab === id ? "border-ink text-ink" : "border-transparent text-dim hover:text-ink"
      }`}
    >
      {label} · {count}
    </button>
  );

  const showReviewButton = tab === "marks" || markCount > 0;

  return (
    <div className="min-h-screen bg-room pt-20 pb-10 px-3 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label={t("kopilka.back")}
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-black/5"
          >
            <IoChevronBack size={22} />
          </button>
          <h1 className="m-0 text-2xl font-extrabold text-ink">{t("kopilka.title")}</h1>
        </div>

        <div className="mb-4 flex items-center gap-4 rounded-card border border-line bg-white p-4 sm:p-6">
          <JarDrawing fresh={3} className="h-[68px] w-[60px] flex-shrink-0" />
          <div className="min-w-0">
            <p className="m-0 text-2xl font-extrabold text-ink sm:text-3xl">
              {t("kopilka.words", { count: learnedCount })}
            </p>
            <p className="m-0 mt-1 text-[13px] text-dim">
              {t("kopilka.marks", { count: markCount })}
              {fromStories > 0 && <> · {t("kopilka.fromStories", { count: fromStories })}</>}
            </p>
          </div>
        </div>

        {!user && <p className="m-0 mb-4 text-[13px] text-dim">{t("kopilka.guestNote")}</p>}

        <div role="tablist" className="mb-2 flex border-b border-line">
          {tabButton("words", t("kopilka.tabWords"), learnedCount)}
          {tabButton("marks", t("kopilka.tabMarks"), markCount)}
        </div>

        <div className="rounded-card border border-line bg-white px-4 sm:px-6">
          {loading ? (
            <p className="m-0 py-6 text-[14px] text-dim">{t("kopilka.loading")}</p>
          ) : failed ? (
            <p role="alert" className="m-0 py-6 text-[14px] text-dim">
              {t("kopilka.error")}
            </p>
          ) : tab === "words" ? (
            groups.length === 0 ? (
              <p className="m-0 py-6 text-[14px] text-dim">{t("kopilka.emptyWords")}</p>
            ) : (
              groups.map((g) => (
                <section key={g.id} className="pt-4">
                  <h2 className="m-0 font-mono text-[10px] font-normal uppercase tracking-[0.16em] text-dim">
                    {pick(g.place.storyTitle)} · {t("kopilka.part", { n: g.place.partNumber })}
                    {g.place.partTitleLocalized && pick(g.place.partTitleLocalized)
                      ? ` · ${pick(g.place.partTitleLocalized)}`
                      : ""}
                  </h2>
                  <ul className="m-0 list-none p-0">
                    {g.rows.map((p) => (
                      <React.Fragment key={`${g.id}-${p.key}`}>{renderRow(p)}</React.Fragment>
                    ))}
                  </ul>
                </section>
              ))
            )
          ) : markRows.length === 0 ? (
            <p className="m-0 py-6 text-[14px] text-dim">{t("kopilka.emptyMarks")}</p>
          ) : (
            <ul className="m-0 list-none p-0">
              {markRows.map((p) => (
                renderRow(p, true)
              ))}
            </ul>
          )}
        </div>

        {showReviewButton && (
          <div className="sticky bottom-3 z-10 mt-4 sm:static">
            <button
              type="button"
              onClick={() => setReviewOpen(true)}
              disabled={reviewWords.length === 0}
              className={`${buttonPrimary} w-full sm:w-auto`}
            >
              {t("kopilka.repeatMarksCount", { count: markCount })}
            </button>
          </div>
        )}
      </div>

      {reviewOpen && (
        <div className="dialog-backdrop-in fixed inset-0 z-50 bg-black/70">
          <div className="mx-auto flex h-[100dvh] w-full max-w-[720px] flex-col p-3 sm:p-6">
            {/* Above the game, not over it: the game's own top row holds the jar. */}
            <button
              type="button"
              onClick={() => setReviewOpen(false)}
              aria-label={t("kopilka.close")}
              className="mb-1 flex h-11 w-11 shrink-0 items-center justify-center self-end rounded-full text-white hover:bg-white/10"
            >
              <IoClose size={24} />
            </button>
            <WordBoard
              words={reviewWords}
              onPlay={(_k, url) => playVocabWord(url)}
              learnedWords={learnedWords}
              onComplete={markLearned}
              eyebrow={t("kopilka.reviewEyebrow")}
              onClose={() => setReviewOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Kopilka;
