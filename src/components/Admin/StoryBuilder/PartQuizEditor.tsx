import { useEffect, useState } from "react";
import {
  AdminStory,
  StoryPart,
  QuizQuestion,
  uploadPartAsset,
  saveQuiz,
} from "../../../services/adminStoryServices";
import AudioPreview from "./AudioPreview";

interface PartQuizEditorProps {
  token: string;
  story: AdminStory;
  part: StoryPart;
  onPartUpdated: (part: StoryPart) => void;
}

const MAX_QUESTIONS = 10;

const blankQuestion = (): QuizQuestion => ({
  question: "",
  options: ["", "", "", ""],
  correctAnswer: 0,
  referenceTime: 0,
  audio: { fast: "", slow: "" },
});

const PartQuizEditor = ({ token, story, part, onPartUpdated }: PartQuizEditorProps) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>(part.quiz);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setQuestions(part.quiz);
  }, [part]);

  const updateQuestion = (index: number, patch: Partial<QuizQuestion>) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };

  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex ? { ...q, options: q.options.map((o, j) => (j === optIndex ? value : o)) } : q
      )
    );
  };

  const addQuestion = () => {
    if (questions.length >= MAX_QUESTIONS) return;
    setQuestions([...questions, blankQuestion()]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleAudioUpload = async (
    qIndex: number,
    speed: "fast" | "slow",
    file: File | null
  ) => {
    if (!file) return;
    const key = `${qIndex}-${speed}`;
    setUploadingKey(key);
    setError("");
    try {
      const url = await uploadPartAsset(
        token,
        story._id,
        part.partNumber,
        file,
        speed === "fast" ? "quizFast" : "quizSlow",
        { index: qIndex }
      );
      // Functional update, not updateQuestion(..., {...questions[qIndex].audio}):
      // fast and slow are two independent pickers, so both can be in flight at
      // once, and the second one to resolve would otherwise merge into a
      // `questions` snapshot captured before the first one landed — silently
      // dropping the URL that had just been uploaded.
      setQuestions((prev) =>
        prev.map((q, i) => (i === qIndex ? { ...q, audio: { ...q.audio, [speed]: url } } : q))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingKey(null);
    }
  };

  const handleSave = async () => {
    setError("");
    for (const q of questions) {
      if (!q.question.trim()) return setError("Every question needs text.");
      if (q.options.some((o) => !o.trim())) return setError("Every question needs 4 options filled in.");
    }
    setSaving(true);
    try {
      const updated = await saveQuiz(token, story._id, part.partNumber, questions);
      onPartUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save quiz.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && <p className="text-red-600 text-sm">{error}</p>}

      {questions.map((q, qIndex) => (
        <div key={qIndex} className="bg-gray-50 rounded-lg border border-gray-200 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-black">Question {qIndex + 1}</span>
            <button
              type="button"
              onClick={() => removeQuestion(qIndex)}
              className="text-red-500 text-xs hover:text-red-700"
            >
              Remove
            </button>
          </div>

          <input
            type="text"
            value={q.question}
            onChange={(e) => updateQuestion(qIndex, { question: e.target.value })}
            placeholder="Question text"
            className="w-full text-black text-sm px-3 py-2 border border-gray-300 rounded-lg"
          />

          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-black">
            {/* Native file inputs always render their own "No file chosen"
                text next to whatever label you give them, even when a URL is
                already uploaded (a file input can never be pre-filled) — so
                the input is hidden and the whole label drives the picker,
                letting us show our own text instead ("Choose file"/"Replace")
                rather than a stale-looking "No file chosen".
                AudioPreview has to stay OUTSIDE the <label> for the same
                reason the input is inside it: a click anywhere in a label is
                forwarded to its control, so a play button nested in there
                would pop the file picker every time you tried to listen. */}
            {(["fast", "slow"] as const).map((speed) => (
              <div key={speed} className="flex items-center gap-1.5">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <span>
                    {speed === "fast" ? "Fast audio (plays first)" : "Slow audio (plays second)"}
                  </span>
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => handleAudioUpload(qIndex, speed, e.target.files?.[0] ?? null)}
                    disabled={uploadingKey === `${qIndex}-${speed}`}
                  />
                  <span className="text-blue-600 underline">
                    {uploadingKey === `${qIndex}-${speed}`
                      ? "Uploading..."
                      : q.audio[speed]
                      ? "Replace"
                      : "Choose file"}
                  </span>
                </label>
                {/* Replaces the old ✓, which only ever meant "this question
                    object has a non-empty string in it" — it stayed green for
                    a URL pointing at nothing. */}
                <AudioPreview url={q.audio[speed]} label={`Q${qIndex + 1} ${speed}`} />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {q.options.map((option, optIndex) => (
              <label key={optIndex} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${qIndex}`}
                  checked={q.correctAnswer === optIndex}
                  onChange={() => updateQuestion(qIndex, { correctAnswer: optIndex })}
                />
                <input
                  type="text"
                  value={option}
                  onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                  placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                  className="flex-1 text-black text-sm px-2 py-1.5 border border-gray-300 rounded-lg"
                />
              </label>
            ))}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={addQuestion}
          disabled={questions.length >= MAX_QUESTIONS}
          className="text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg px-4 py-2 disabled:opacity-50"
        >
          Add question ({questions.length}/{MAX_QUESTIONS})
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="text-sm bg-black text-white rounded-lg px-4 py-2 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save quiz"}
        </button>
      </div>
    </div>
  );
};

export default PartQuizEditor;
