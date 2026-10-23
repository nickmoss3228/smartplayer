import { useEffect, useMemo, useState } from "react";
import {
  AdminStory,
  StoryPart,
  TranscriptReport,
  VocabEntry,
  previewTranscript,
  savePhrasalVerbs,
  saveTranscript,
  saveVocabulary,
} from "../../../services/adminStoryServices";

/**
 * What is said in this part, pasted as plain text. The player's word window
 * draws a page of dots from its shape and puts each word where it is said; the
 * report below shows which words were found, and lets an author pin a word to
 * exact text when automatic matching misses (the key "start up" where the story
 * says "didn't start").
 */

interface PartTranscriptEditorProps {
  token: string;
  story: AdminStory;
  part: StoryPart;
  onPartUpdated: (part: StoryPart) => void;
}

// Mirrors the backend's cap on a transcript.
const MAX_LENGTH = 20000;
const PREVIEW_DELAY_MS = 500;

/** Anchors in list order, blank where none is set. */
interface Anchors {
  vocab: string[];
  phrasal: string[];
}

const anchorsOf = (part: StoryPart): Anchors => ({
  vocab: part.vocabulary.map((v) => v.anchor ?? ""),
  phrasal: part.phrasalVerbs.map((v) => v.anchor ?? ""),
});

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

const withAnchors = (entries: VocabEntry[], anchors: string[]): VocabEntry[] =>
  entries.map((entry, i) => ({ ...entry, anchor: anchors[i]?.trim() || null }));

const PartTranscriptEditor = ({ token, story, part, onPartUpdated }: PartTranscriptEditorProps) => {
  const savedText = part.transcript ?? "";
  const baselineAnchors = useMemo(() => anchorsOf(part), [part]);

  const [text, setText] = useState(savedText);
  const [anchors, setAnchors] = useState<Anchors>(baselineAnchors);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [report, setReport] = useState<TranscriptReport | null>(null);
  const [previewError, setPreviewError] = useState("");

  // A save hands back a new part, and with it a new baseline.
  useEffect(() => {
    setText(savedText);
  }, [savedText]);
  useEffect(() => {
    setAnchors(baselineAnchors);
  }, [baselineAnchors]);

  const anchorsChanged =
    !sameList(anchors.vocab, baselineAnchors.vocab) || !sameList(anchors.phrasal, baselineAnchors.phrasal);
  const dirty = text !== savedText || anchorsChanged;

  const rows = useMemo(
    () => [
      ...part.vocabulary.map((entry, index) => ({ entry, list: "vocab" as const, index })),
      ...part.phrasalVerbs.map((entry, index) => ({ entry, list: "phrasal" as const, index })),
    ],
    [part.vocabulary, part.phrasalVerbs],
  );

  // Live report: the server does the matching, so the answer here is the one
  // the player will get. Debounced; a slower earlier answer is dropped.
  useEffect(() => {
    if (!text.trim()) {
      setReport(null);
      setPreviewError("");
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const words = rows.map(({ entry, list, index }) => ({
          audioKey: entry.audioKey,
          anchor: anchors[list][index]?.trim() || null,
        }));
        const result = await previewTranscript(token, story._id, part.partNumber, text, words);
        if (cancelled) return;
        setReport(result.report);
        setPreviewError("");
      } catch (err) {
        if (cancelled) return;
        setPreviewError(err instanceof Error ? err.message : "Could not check the transcript.");
      }
    }, PREVIEW_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [text, anchors, rows, token, story._id, part.partNumber]);

  const matchFor = (audioKey: string) => report?.matches.find((m) => m.key === audioKey.toLowerCase());
  const placed = rows.filter(({ entry }) => matchFor(entry.audioKey)).length;

  const setAnchor = (list: "vocab" | "phrasal", index: number, value: string) =>
    setAnchors((a) => ({ ...a, [list]: a[list].map((x, i) => (i === index ? value : x)) }));

  const save = async () => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      let latest = (await saveTranscript(token, story._id, part.partNumber, text.trim() ? text : null)).part;
      if (anchorsChanged) {
        latest = await saveVocabulary(token, story._id, part.partNumber, withAnchors(latest.vocabulary, anchors.vocab));
        latest = await savePhrasalVerbs(
          token,
          story._id,
          part.partNumber,
          withAnchors(latest.phrasalVerbs, anchors.phrasal),
        );
      }
      onPartUpdated(latest);
      setNotice(text.trim() ? "Saved." : "Cleared.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save the transcript.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <label className="block max-w-3xl">
        <span className="block text-xs text-gray-500 mb-1">
          Paste what is said in this part. [Stage directions] in square brackets are ignored. A blank
          line starts a new paragraph. The player never shows this text, only its shape.
        </span>
        <textarea
          value={text}
          maxLength={MAX_LENGTH}
          onChange={(e) => setText(e.target.value)}
          rows={16}
          className="w-full text-black px-3 py-1.5 border border-gray-300 rounded-[3px] text-sm"
        />
        <span className="block text-xs text-gray-400 text-right">
          {text.length} / {MAX_LENGTH}
        </span>
      </label>

      <div className="bg-white rounded-[3px] border border-gray-200 p-3 max-w-3xl space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-sm font-semibold text-black">Words in this part</div>
          <div className="text-xs text-gray-500">
            {rows.length === 0
              ? "No words yet"
              : report
                ? `${placed} of ${rows.length} words placed`
                : "Paste a transcript to see where the words land"}
          </div>
        </div>
        {previewError && <p className="text-red-600 text-xs">{previewError}</p>}
        {rows.length > 0 && (
          <ul className="divide-y divide-gray-100">
            {rows.map(({ entry, list, index }) => {
              const match = matchFor(entry.audioKey);
              return (
                <li key={`${list}:${index}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5 text-sm">
                  <span className="text-black w-40 truncate">{entry.word}</span>
                  <span className="font-mono text-xs text-gray-500 w-40 truncate">{entry.audioKey}</span>
                  <span className="text-xs flex-1 min-w-[8rem]">
                    {!report ? null : match ? (
                      <span className="text-gray-700">&ldquo;{match.text}&rdquo;</span>
                    ) : (
                      <span className="text-signal-ink">not found</span>
                    )}
                  </span>
                  <input
                    type="text"
                    value={anchors[list][index] ?? ""}
                    onChange={(e) => setAnchor(list, index, e.target.value)}
                    placeholder="exact text in the transcript"
                    className="w-56 text-black px-2 py-1 border border-gray-300 rounded-[3px] text-xs"
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {notice && <p className="text-green-700 text-sm">{notice}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          className="text-sm bg-black text-white rounded-[3px] px-4 py-1.5 disabled:opacity-40"
        >
          {saving ? "Saving…" : dirty ? "Save" : "Saved"}
        </button>
        {dirty && (
          <button
            type="button"
            onClick={() => {
              setText(savedText);
              setAnchors(baselineAnchors);
            }}
            disabled={saving}
            className="text-sm text-gray-500 hover:text-black"
          >
            Discard changes
          </button>
        )}
      </div>
    </div>
  );
};

export default PartTranscriptEditor;
