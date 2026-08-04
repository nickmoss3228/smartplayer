import { useEffect, useState } from "react";
import {
  AdminStory,
  StoryPart,
  VocabEntry,
  uploadPartAsset,
  saveVocabulary,
  savePhrasalVerbs,
} from "../../../services/adminStoryServices";

interface PartVocabWordsEditorProps {
  token: string;
  story: AdminStory;
  part: StoryPart;
  kind: "vocab" | "phrasal";
  onPartUpdated: (part: StoryPart) => void;
}

// Filename must be an English word/phrase — it's also used as the progress
// key (see backend/src/models/User.js's learnedWords), matching the
// convention the legacy Vocabulary.ts audioKey already follows.
const ENGLISH_KEY_PATTERN = /^[a-zA-Z0-9 _-]+$/;

// Shared by both "regular vocabulary" and "phrasal verbs" — the app treats
// them as two distinct dictionaries (see Vocabulary.ts's trackVocabulary vs
// trackPhrasalVerbs), so this is instantiated twice with a different `kind`
// rather than one merged list.
const PartVocabWordsEditor = ({ token, story, part, kind, onPartUpdated }: PartVocabWordsEditorProps) => {
  const listKey = kind === "vocab" ? "vocabulary" : "phrasalVerbs";
  const [words, setWords] = useState<VocabEntry[]>(part[listKey]);
  const [audioKeyInput, setAudioKeyInput] = useState("");
  const [wordInput, setWordInput] = useState("");
  const [definitionInput, setDefinitionInput] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setWords(part[listKey]);
  }, [part, listKey]);

  const handleAdd = async () => {
    setError("");
    if (!pendingFile) return setError("Choose an audio file first.");
    if (!ENGLISH_KEY_PATTERN.test(audioKeyInput.trim())) {
      return setError("The filename/key must be in English letters, numbers, spaces, - or _.");
    }
    if (!wordInput.trim()) return setError("Enter the Russian text to display.");
    const audioKey = audioKeyInput.trim().toLowerCase();
    if (words.some((w) => w.audioKey.toLowerCase() === audioKey)) {
      return setError("That key is already used in this part.");
    }

    setUploading(true);
    try {
      const audioUrl = await uploadPartAsset(token, story._id, part.partNumber, pendingFile, kind, {
        audioKey,
      });
      setWords([...words, { audioKey, word: wordInput.trim(), definition: definitionInput.trim(), audioUrl }]);
      setAudioKeyInput("");
      setWordInput("");
      setDefinitionInput("");
      setPendingFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (index: number) => setWords(words.filter((_, i) => i !== index));

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const updated =
        kind === "vocab"
          ? await saveVocabulary(token, story._id, part.partNumber, words)
          : await savePhrasalVerbs(token, story._id, part.partNumber, words);
      onPartUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 space-y-2">
        <div className="text-sm font-semibold text-black">Add a word</div>
        <input
          type="file"
          accept="audio/*"
          onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
          className="block text-xs"
        />
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={audioKeyInput}
            onChange={(e) => setAudioKeyInput(e.target.value)}
            placeholder="English key/filename (e.g. flat)"
            className="flex-1 text-black text-sm px-3 py-2 border border-gray-300 rounded-lg"
          />
          <input
            type="text"
            value={wordInput}
            onChange={(e) => setWordInput(e.target.value)}
            placeholder="Russian text (e.g. квартира)"
            className="flex-1 text-black text-sm px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <input
          type="text"
          value={definitionInput}
          onChange={(e) => setDefinitionInput(e.target.value)}
          placeholder="Definition (optional)"
          className="w-full text-black text-sm px-3 py-2 border border-gray-300 rounded-lg"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={uploading}
          className="text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-4 py-2 disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Add word"}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {words.length > 0 && (
        <div className="space-y-1">
          {words.map((w, i) => (
            <div key={i} className="flex items-center gap-3 text-sm bg-gray-50 rounded px-3 py-2">
              <span className="font-semibold text-black">{w.word}</span>
              <span className="text-gray-500">{w.audioKey}</span>
              {w.definition && <span className="text-gray-400 truncate">{w.definition}</span>}
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="ml-auto text-red-500 text-xs hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="text-sm bg-black text-white rounded-lg px-4 py-2 disabled:opacity-50"
      >
        {saving ? "Saving..." : `Save ${kind === "vocab" ? "vocabulary" : "phrasal verbs"}`}
      </button>
    </div>
  );
};

export default PartVocabWordsEditor;
