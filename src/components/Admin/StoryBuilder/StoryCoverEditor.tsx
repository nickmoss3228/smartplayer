import { useEffect, useRef, useState } from "react";
import {
  AdminStory,
  uploadStoryCover,
  clearStoryCover,
} from "../../../services/adminStoryServices";

/**
 * The 4:5 card art shown in the story list.
 *
 * Story-level rather than per-part — a story has one card, whatever its part
 * count — so it lives beside the name and shelf rather than in the part tabs.
 *
 * Without a cover the card falls back to the built-in artwork for that slug if
 * there is one, and otherwise to the halftone + emoji placeholder. That
 * fallback is why publishing used to *lose* the artwork: a published DB story
 * replaces its static entry outright, and the DB copy had nowhere to carry a
 * cover.
 */

// The generated covers are 480x600 at ~50 KB (scripts/make-covers.py). Not a
// hard limit — the upload middleware caps at 25 MB — just the point past which
// a card is worth shrinking before it loads in a grid on a phone.
const HEAVY_FILE_BYTES = 400 * 1024;

const ACCEPTED = "image/jpeg,image/png,image/webp,image/avif,image/gif";

const formatSize = (bytes: number): string =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;

interface StoryCoverEditorProps {
  token: string;
  story: AdminStory;
  onStoryUpdated: (story: AdminStory) => void;
}

const StoryCoverEditor = ({ token, story, onStoryUpdated }: StoryCoverEditorProps) => {
  const [busy, setBusy] = useState<"upload" | "clear" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setError("");
    setNotice("");
  }, [story._id]);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setError("");
    setNotice(
      file.size > HEAVY_FILE_BYTES
        ? `That file is ${formatSize(file.size)}. It will work, but the covers that ship with the app are around 50 KB — consider shrinking it.`
        : "",
    );
    setBusy("upload");
    try {
      onStoryUpdated(await uploadStoryCover(token, story._id, file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cover upload failed.");
    } finally {
      setBusy(null);
      // Let the same file be picked again after a failure — without this the
      // input holds the old value and onChange never fires a second time.
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleClear = async () => {
    setBusy("clear");
    setError("");
    setNotice("");
    try {
      onStoryUpdated(await clearStoryCover(token, story._id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove the cover.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex items-start gap-3">
      <div className="w-20 shrink-0 aspect-[4/5] rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
        {story.coverUrl ? (
          <img src={story.coverUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-[10px] text-gray-400 text-center px-1">No cover</span>
        )}
      </div>

      <div className="min-w-0">
        <div className="text-sm font-semibold text-black">Card image</div>
        <p className="text-xs text-gray-500 mb-2">
          Shown on the story list. 4:5 works best. Without one the card uses the built-in
          artwork for this story, or an emoji placeholder.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <label className="cursor-pointer text-xs text-blue-600 underline">
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              disabled={busy !== null}
            />
            {busy === "upload" ? "Uploading…" : story.coverUrl ? "Replace" : "Choose image"}
          </label>

          {story.coverUrl && (
            <button
              type="button"
              onClick={handleClear}
              disabled={busy !== null}
              className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
            >
              {busy === "clear" ? "Removing…" : "Remove"}
            </button>
          )}
        </div>

        {notice && <p className="text-amber-600 text-xs mt-1">{notice}</p>}
        {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
      </div>
    </div>
  );
};

export default StoryCoverEditor;
