import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AdminStory,
  StoryPart,
  savePanelQuiz,
  type PanelQuiz as PanelQuizData,
} from "../../../services/adminStoryServices";
import { useClipPlayer } from "../../../hooks/useClipPlayer";
import { gridBoxes, readingOrder, type Box } from "../../../modules/comicPractice/boxes";
import {
  assignmentsFromClips,
  clipsFromAssignments,
  questionsFromClips,
  segmentsFromMarkers,
} from "../../../modules/comicPractice/panelQuizRounds";
import { PanelQuiz } from "../../Player/PanelQuiz/PanelQuiz";
import BoxCanvas, { type BoxTone } from "./BoxCanvas";

interface PartPanelQuizEditorProps {
  token: string;
  story: AdminStory;
  part: StoryPart;
  onPartUpdated: (part: StoryPart) => void;
}

type Mode = "panels" | "match";

const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;

/**
 * A quiz as a string with its keys in one fixed order. jsonb hands objects
 * back with ITS key order ({ clips, panels }, { h, w, x, y }), so comparing
 * plain JSON.stringify output would call every freshly loaded quiz edited.
 */
const canonical = (quiz: PanelQuizData | null) =>
  JSON.stringify({
    panels: (quiz?.panels ?? []).map(({ x, y, w, h }) => [x, y, w, h]),
    clips: (quiz?.clips ?? []).map(({ start, end, panel }) => [start, end, panel]),
  });

/**
 * The "where did it happen?" game for one part, in two steps:
 *
 *   1. Panels — draw a box over each panel of the comic page.
 *   2. Lines  — the part's marker segments, one per line of audio. Play one,
 *               click the panel it happens in, and the next one plays.
 *
 * The lines come from the markers rather than being cut again here: they are
 * already the part's sentences, and the student hears exactly the stretches
 * the player repeats. A line left unmatched is simply not asked.
 */
const PartPanelQuizEditor = ({ token, story, part, onPartUpdated }: PartPanelQuizEditorProps) => {
  const saved = part.panelQuiz ?? null;
  const [panels, setPanels] = useState<Box[]>(saved?.panels ?? []);
  const [assignments, setAssignments] = useState<(number | null)[] | null>(null);
  const [orphans, setOrphans] = useState(0);
  const [mode, setMode] = useState<Mode>(saved ? "match" : "panels");
  const [selected, setSelected] = useState<number | null>(null);
  const [active, setActive] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [gridRows, setGridRows] = useState(3);
  const [gridCols, setGridCols] = useState(2);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedNote, setSavedNote] = useState("");
  const [trying, setTrying] = useState(false);

  const { state, duration, play, stop } = useClipPlayer(part.audioUrl ?? "");
  const markerTimes = useMemo(() => part.timeMarkers.map((m) => m.time), [part.timeMarkers]);
  // Until the audio's length is known the last line has no end; wait for it
  // (or for the audio to fail, and go without that line) before matching.
  const lengthKnown = duration !== null || state === "error";
  const segments = useMemo(
    () => (lengthKnown ? segmentsFromMarkers(markerTimes, duration) : []),
    [lengthKnown, markerTimes, duration],
  );

  useEffect(() => {
    if (!lengthKnown || assignments !== null) return;
    const read = assignmentsFromClips(segments, saved?.clips ?? []);
    setAssignments(read.assignments);
    setOrphans(read.orphans);
  }, [lengthKnown, segments, saved, assignments]);

  const draft = useMemo(
    () => ({ panels, clips: assignments ? clipsFromAssignments(segments, assignments) : [] }),
    [panels, assignments, segments],
  );
  const dirty = canonical(draft) !== canonical(saved);

  // ── panels ───────────────────────────────────────────────────────────────

  /** Applies a new panel list given where each old panel went (null: deleted). */
  const remapPanels = (next: Box[], newIndexOf: (old: number) => number | null) => {
    setPanels(next);
    setAssignments((a) => a && a.map((p) => (p === null ? null : newIndexOf(p))));
  };

  const deletePanel = (index: number) => {
    remapPanels(
      panels.filter((_, i) => i !== index),
      (old) => (old === index ? null : old > index ? old - 1 : old),
    );
    setSelected(null);
  };

  const sortPanels = () => {
    const order = readingOrder(panels);
    remapPanels(
      order.map((i) => panels[i]),
      (old) => order.indexOf(old),
    );
    setSelected(null);
  };

  const applyGrid = () => {
    if (panels.length && !confirm("Replace the panels with an even grid? Lines matched to panels are unmatched.")) {
      return;
    }
    remapPanels(gridBoxes(gridRows, gridCols), () => null);
    setSelected(null);
  };

  useEffect(() => {
    if (mode !== "panels" || selected === null) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        deletePanel(selected);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ── lines ────────────────────────────────────────────────────────────────

  const playSegment = useCallback(
    (i: number) => {
      const s = segments[i];
      if (s) play(s.start, s.end);
    },
    [segments, play],
  );

  const goTo = (i: number, withSound = autoPlay) => {
    if (i < 0 || i >= segments.length) return;
    setActive(i);
    if (withSound) playSegment(i);
    else stop();
  };

  const assign = (panel: number | null) => {
    if (!assignments) return;
    setAssignments(assignments.map((p, i) => (i === active ? panel : p)));
    if (active + 1 < segments.length) goTo(active + 1);
    else stop();
  };

  useEffect(() => {
    if (mode !== "match" || !assignments) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (/^[1-9]$/.test(e.key) && Number(e.key) <= panels.length) assign(Number(e.key) - 1);
      else if (e.key === "0" || e.key === "Backspace") assign(null);
      else if (e.key === " ") playSegment(active);
      else if (e.key === "ArrowDown") goTo(active + 1);
      else if (e.key === "ArrowUp") goTo(active - 1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ── save ─────────────────────────────────────────────────────────────────

  const handleSave = async (remove = false) => {
    if (remove && !confirm(`Remove the comic quiz from part ${part.partNumber}?`)) return;
    setSaving(true);
    setError("");
    setSavedNote("");
    try {
      const updated = await savePanelQuiz(token, story._id, part.partNumber, remove ? null : draft);
      onPartUpdated(updated);
      if (remove) {
        setPanels([]);
        setAssignments(segments.map(() => null));
      }
      setOrphans(0);
      setSavedNote(remove ? "Removed." : "Saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  // ── what is missing ──────────────────────────────────────────────────────

  const missing = [
    !part.comicUrl && "a comic page",
    !part.audioUrl && "audio",
    part.timeMarkers.length < 2 && "at least two markers",
  ].filter(Boolean);
  if (missing.length) {
    return (
      <div className="bg-gray-50 rounded-[3px] border border-dashed border-gray-300 p-8 text-center">
        <p className="text-sm text-gray-600">This part needs {missing.join(", ")} before it can have a comic quiz.</p>
        <p className="text-xs text-gray-400 mt-1">
          The game plays the part&apos;s marker lines and asks which panel of the comic page each one happens in.
        </p>
      </div>
    );
  }

  const linesPerPanel = panels.map((_, i) => (assignments ?? []).filter((p) => p === i).length);
  const matchedCount = draft.clips.length;
  const questionCount = questionsFromClips(draft.clips).length;
  const activePanel = assignments?.[active] ?? null;

  const tone = (i: number): BoxTone => {
    if (mode === "panels") return selected === i ? "selected" : "default";
    if (activePanel === i) return "accent";
    return linesPerPanel[i] > 0 ? "done" : "default";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["panels", "match"] as const).map((m, n) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setSelected(null);
              stop();
            }}
            disabled={m === "match" && panels.length === 0}
            className={`text-sm rounded-[3px] px-3 py-1.5 border disabled:opacity-40 ${
              mode === m ? "bg-black text-white border-black" : "bg-white text-gray-700 border-gray-300 hover:border-gray-500"
            }`}
          >
            {n + 1}. {m === "panels" ? `Panels (${panels.length})` : `Lines → panels (${matchedCount}/${segments.length})`}
          </button>
        ))}
        <span className="text-xs text-gray-500 ml-2">
          {mode === "panels"
            ? "Drag on the page to add a panel; drag a panel to move it, its corners to resize; Delete removes the selected one."
            : "Click a line to hear it, then click its panel — the next line plays. Keys: 1–9 panel, 0 none, space replay, ↑↓."}
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        <div className="shrink-0 max-w-full">
          <BoxCanvas
            src={part.comicUrl!}
            boxes={panels}
            selected={mode === "panels" ? selected : null}
            onSelect={setSelected}
            onDraw={
              mode === "panels"
                ? (box) => {
                    setPanels([...panels, box]);
                    setSelected(panels.length);
                  }
                : undefined
            }
            onBoxesChange={mode === "panels" ? setPanels : undefined}
            onBoxClick={mode === "match" ? (i) => assign(i) : undefined}
            label={(i) => (mode === "match" ? `${i + 1} · ${linesPerPanel[i]}` : `${i + 1}`)}
            tone={tone}
          />
        </div>

        <div className="flex-1 min-w-0 space-y-3 w-full">
          {mode === "panels" ? (
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-gray-600">Even grid</span>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={gridRows}
                  onChange={(e) => setGridRows(Math.min(6, Math.max(1, Number(e.target.value) || 1)))}
                  className="w-14 text-black px-2 py-1 border border-gray-300 rounded-[3px]"
                  aria-label="Rows"
                />
                <span className="text-gray-400">rows ×</span>
                <input
                  type="number"
                  min={1}
                  max={4}
                  value={gridCols}
                  onChange={(e) => setGridCols(Math.min(4, Math.max(1, Number(e.target.value) || 1)))}
                  className="w-14 text-black px-2 py-1 border border-gray-300 rounded-[3px]"
                  aria-label="Columns"
                />
                <span className="text-gray-400">columns</span>
                <button
                  type="button"
                  onClick={applyGrid}
                  className="text-xs bg-white border border-gray-300 hover:border-gray-500 rounded-[3px] px-2 py-1 text-gray-700"
                >
                  Apply
                </button>
              </div>
              <p className="text-xs text-gray-400">
                A starting point for regular pages — then drag the edges onto the real gutters.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={sortPanels}
                  disabled={panels.length < 2}
                  className="text-xs bg-white border border-gray-300 hover:border-gray-500 rounded-[3px] px-2 py-1 text-gray-700 disabled:opacity-40"
                >
                  Number in reading order
                </button>
                <button
                  type="button"
                  onClick={() => selected !== null && deletePanel(selected)}
                  disabled={selected === null}
                  className="text-xs bg-white border border-gray-300 hover:border-red-400 rounded-[3px] px-2 py-1 text-red-600 disabled:opacity-40"
                >
                  Delete panel {selected !== null ? selected + 1 : ""}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Panels don&apos;t all need lines — one with none still counts as a wrong answer to tap.
              </p>
            </div>
          ) : !assignments ? (
            <p className="text-sm text-gray-500">Loading the audio to measure the last line…</p>
          ) : (
            <>
              {/* The game is only as clear as its lines. "I am 22 years old"
                  happens in no panel; asked anyway, the student cannot know
                  what the question is about. */}
              <p className="text-xs text-gray-600 bg-amber-50 border border-amber-200 rounded-[3px] px-2 py-1.5">
                Match only lines that describe something <b>drawn</b> in a panel — leave the rest on
                &ldquo;no panel&rdquo;, they are not asked. Neighbouring lines on the same panel are asked
                as one question.
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input type="checkbox" checked={autoPlay} onChange={(e) => setAutoPlay(e.target.checked)} />
                  Play the next line after each match
                </label>
                <span className="text-xs text-gray-500">
                  {matchedCount} line{matchedCount === 1 ? "" : "s"} → {questionCount} question
                  {questionCount === 1 ? "" : "s"}
                </span>
              </div>
              {orphans > 0 && (
                <p className="text-xs text-amber-700">
                  {orphans} saved line{orphans === 1 ? "" : "s"} no longer line{orphans === 1 ? "s" : ""} up with a
                  marker (the markers moved) and will be dropped on save.
                </p>
              )}
              <ol className="max-h-[60vh] overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-[3px]">
                {segments.map((s, i) => {
                  const panel = assignments[i];
                  const isActive = i === active;
                  return (
                    <li
                      key={s.start}
                      onClick={() => goTo(i, true)}
                      className={`flex items-center gap-3 px-3 py-1.5 text-sm cursor-pointer ${
                        isActive ? "bg-sky-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <span className={`w-6 text-right font-mono text-xs ${isActive ? "text-sky-700" : "text-gray-400"}`}>
                        {i + 1}
                      </span>
                      <span className="font-mono text-xs text-gray-500 w-28">
                        {formatTime(s.start)}–{formatTime(s.end)}
                      </span>
                      {isActive && state === "playing" && <span className="text-xs text-sky-700">▶ playing</span>}
                      {i > 0 && panel !== null && assignments[i - 1] === panel && (
                        <span className="text-xs text-gray-400">↳ asked with the line above</span>
                      )}
                      <span className="ml-auto flex items-center gap-1">
                        {panel === null ? (
                          <span className="text-xs text-gray-300">no panel</span>
                        ) : (
                          <>
                            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-[2px] px-1.5">
                              panel {panel + 1}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAssignments(assignments.map((p, j) => (j === i ? null : p)));
                              }}
                              className="text-xs text-gray-400 hover:text-red-600 px-1"
                              aria-label={`Unmatch line ${i + 1}`}
                            >
                              ×
                            </button>
                          </>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </>
          )}
        </div>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3">
        <button
          type="button"
          onClick={() => handleSave(false)}
          disabled={saving || !dirty || panels.length === 0 || matchedCount === 0}
          title={matchedCount === 0 ? "Match at least one line to a panel first" : undefined}
          className="text-sm bg-black text-white rounded-[3px] px-4 py-2 disabled:opacity-40"
        >
          {saving ? "Saving..." : "Save comic quiz"}
        </button>
        <button
          type="button"
          onClick={() => {
            stop();
            setTrying(true);
          }}
          disabled={panels.length === 0 || matchedCount === 0}
          className="text-sm bg-white border border-gray-300 hover:border-gray-500 rounded-[3px] px-4 py-2 text-gray-700 disabled:opacity-40"
        >
          Try it
        </button>
        {saved && (
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={saving}
            className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
          >
            Remove from this part
          </button>
        )}
        <span className="text-xs text-gray-500">
          {dirty ? "Unsaved changes" : savedNote || (saved ? "Saved — students see it after the part ends" : "Not made yet")}
        </span>
      </div>

      {trying && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setTrying(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-3xl h-[85vh] rounded-[3px] bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 p-3 flex flex-col"
          >
            <button
              type="button"
              onClick={() => setTrying(false)}
              className="self-end text-sm text-black/70 hover:text-black px-2"
            >
              Close
            </button>
            <div className="flex-1 min-h-0">
              <PanelQuiz
                comicUrl={part.comicUrl!}
                audioUrl={part.audioUrl!}
                quiz={draft}
                onClose={() => setTrying(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartPanelQuizEditor;
