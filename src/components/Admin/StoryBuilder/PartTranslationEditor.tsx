import { useEffect, useState } from "react";
import { AdminStory, StoryPart, saveTranslation } from "../../../services/adminStoryServices";

/**
 * The part's transcript in Russian, for the PDF handout, which sets it beside
 * the English paragraph for paragraph. So the one thing worth checking here is
 * that both have the same number of paragraphs.
 */

interface PartTranslationEditorProps {
  token: string;
  story: AdminStory;
  part: StoryPart;
  onPartUpdated: (part: StoryPart) => void;
}

// Mirrors the backend's cap (the same as a transcript's).
const MAX_LENGTH = 20000;

/** Paragraphs the way the server reads them: [stage directions] gone, blank lines separate. */
const countParagraphs = (raw: string | null | undefined): number =>
  (raw ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/\[[^\]\n]*\]/g, " ")
    .split(/\n[ \t]*\n/)
    .filter((paragraph) => paragraph.trim()).length;

const PartTranslationEditor = ({ token, story, part, onPartUpdated }: PartTranslationEditorProps) => {
  const savedText = part.translation ?? "";

  const [text, setText] = useState(savedText);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // A save hands back a new part, and with it a new baseline.
  useEffect(() => {
    setText(savedText);
  }, [savedText]);

  const dirty = text !== savedText;
  const translationCount = countParagraphs(text);
  const transcriptCount = countParagraphs(part.transcript);
  const mismatch = translationCount > 0 && translationCount !== transcriptCount;

  const save = async (value: string | null) => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const latest = await saveTranslation(token, story._id, part.partNumber, value?.trim() ? value : null);
      onPartUpdated(latest);
      setNotice(value?.trim() ? "Saved." : "Cleared.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save the translation.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 mt-8 pt-6 border-t border-gray-200">
      <label className="block max-w-3xl">
        <span className="block text-sm font-semibold text-black mb-1">Russian translation</span>
        <span className="block text-xs text-gray-500 mb-1">
          The transcript in Russian, for the PDF handout. A blank line starts a new paragraph; keep
          the paragraphs in step with the transcript above, because the PDF prints them side by side.
        </span>
        <textarea
          value={text}
          maxLength={MAX_LENGTH}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          className="w-full text-black px-3 py-1.5 border border-gray-300 rounded-[3px] text-sm"
        />
        <span className="flex justify-between gap-2 text-xs">
          <span className={mismatch ? "text-signal-ink" : "text-gray-500"}>
            {translationCount === 0
              ? "No translation yet."
              : mismatch
                ? `${translationCount} paragraphs here, ${transcriptCount} in the transcript. They will not line up in the PDF.`
                : `${translationCount} paragraphs, matching the transcript.`}
          </span>
          <span className="text-gray-400">
            {text.length} / {MAX_LENGTH}
          </span>
        </span>
      </label>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {notice && <p className="text-green-700 text-sm">{notice}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => save(text)}
          disabled={saving || !dirty}
          className="text-sm bg-black text-white rounded-[3px] px-4 py-1.5 disabled:opacity-40"
        >
          {saving ? "Saving…" : dirty ? "Save" : "Saved"}
        </button>
        {dirty && (
          <button
            type="button"
            onClick={() => setText(savedText)}
            disabled={saving}
            className="text-sm text-gray-500 hover:text-black"
          >
            Discard changes
          </button>
        )}
        {savedText && (
          <button
            type="button"
            onClick={() => {
              setText("");
              save(null);
            }}
            disabled={saving}
            className="text-sm text-gray-500 hover:text-black"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
};

export default PartTranslationEditor;
