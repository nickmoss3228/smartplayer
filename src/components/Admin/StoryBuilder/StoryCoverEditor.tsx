import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { IoCloudUploadOutline, IoImageOutline, IoTrashOutline } from "react-icons/io5";
import {
  AdminStory,
  uploadStoryCover,
  clearStoryCover,
} from "../../../services/adminStoryServices";
import { smallButton } from "./studioStyles";

/**
 * The 4:5 card art shown in the story list.
 *
 * Story-level rather than per-part — a story has one card, whatever its part
 * count — so it lives in Set settings rather than in the part tabs.
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
  const { t } = useTranslation("studio");
  const [busy, setBusy] = useState<"upload" | "clear" | null>(null);
  const [error, setError] = useState("");
  // Size in bytes of an oversized upload; the sentence is built at render so it follows the language.
  const [heavySize, setHeavySize] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setError("");
    setHeavySize(null);
  }, [story._id]);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    if (!ACCEPTED.split(",").includes(file.type)) {
      setError(t("settings.cover.badType"));
      return;
    }
    setError("");
    setHeavySize(file.size > HEAVY_FILE_BYTES ? file.size : null);
    setBusy("upload");
    try {
      onStoryUpdated(await uploadStoryCover(token, story._id, file));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("settings.cover.uploadFailed"));
    } finally {
      setBusy(null);
      // Let the same file be picked again after a failure — without this the
      // input holds the old value and onChange never fires a second time.
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleClear = async () => {
    if (!confirm(t("settings.cover.confirmRemove"))) return;
    setBusy("clear");
    setError("");
    setHeavySize(null);
    try {
      onStoryUpdated(await clearStoryCover(token, story._id));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("settings.cover.removeFailed"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid gap-5 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-start">
      {/* The card at roughly the size it has in the students' list. */}
      <figure className="w-40">
        <div className="relative grid aspect-[4/5] place-items-center overflow-hidden rounded-card border border-line bg-room">
          {story.coverUrl ? (
            <img src={story.coverUrl} alt={t("settings.cover.alt", { name: story.storyName })} className="h-full w-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-2 px-3 text-center text-xs text-dim">
              <IoImageOutline size={28} aria-hidden="true" />
              {t("settings.cover.noImage")}
            </span>
          )}
          {busy === "upload" && <span className="absolute inset-0 grid place-items-center bg-white/80 text-sm font-semibold text-ink">{t("common.uploading")}</span>}
        </div>
        <figcaption className="mt-2 text-xs text-dim">{t("settings.cover.caption")}</figcaption>
      </figure>

      <div className="min-w-0 space-y-3">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); void handleFile(e.dataTransfer.files?.[0] ?? null); }}
          className={`flex flex-col items-center justify-center gap-2 rounded-tile border-2 border-dashed px-4 py-6 text-center transition-colors ${dragging ? "border-ink bg-room" : "border-line-strong"}`}
        >
          <IoCloudUploadOutline size={26} className="text-dim" aria-hidden="true" />
          <p className="text-sm text-ink">{t("settings.cover.drop")}</p>
          <label className={`${smallButton} cursor-pointer ${busy ? "pointer-events-none opacity-45" : ""}`}>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED}
              className="sr-only"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              disabled={busy !== null}
            />
            {story.coverUrl ? t("settings.cover.chooseNew") : t("settings.cover.choose")}
          </label>
          <p className="text-xs text-dim">{t("settings.cover.spec")}</p>
        </div>

        {!story.coverUrl && (
          <p className="text-xs text-dim">{t("settings.cover.fallback")}</p>
        )}

        {story.coverUrl && (
          <button type="button" onClick={handleClear} disabled={busy !== null} className={`${smallButton} text-red-700`}>
            <IoTrashOutline aria-hidden="true" />
            {busy === "clear" ? t("common.removing") : t("settings.cover.remove")}
          </button>
        )}

        {heavySize !== null && <p className="text-xs text-amber-800">{t("settings.cover.heavy", { size: formatSize(heavySize) })}</p>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      </div>
    </div>
  );
};

export default StoryCoverEditor;
