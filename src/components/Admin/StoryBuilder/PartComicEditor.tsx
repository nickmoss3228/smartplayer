import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AdminStory,
  StoryPart,
  uploadPartAsset,
  saveComic,
} from "../../../services/adminStoryServices";
import { IoImageOutline } from "react-icons/io5";

interface PartComicEditorProps {
  token: string;
  story: AdminStory;
  part: StoryPart;
  onPartUpdated: (part: StoryPart) => void;
  /** Whole-story replacement, for edits that touch more than one part. */
}

// Roughly what a full comic page from the built-in stories weighs (~270 KB).
// Not a hard limit — the upload middleware caps at 25 MB — just the point past
// which a page is worth flattening before it goes to every student on a phone.
const HEAVY_FILE_BYTES = 600 * 1024;

const ACCEPTED = "image/jpeg,image/png,image/webp,image/avif,image/gif";

function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;
}

// One comic page per part, matching how the built-in stories work: the comic
// is the same scene as the audio, so it belongs next to the audio rather than
// in a separate per-story gallery.
const PartComicEditor = ({
  token,
  story,
  part,
  onPartUpdated,
}: PartComicEditorProps) => {
  const { t } = useTranslation("studio");
  const [comicUrl, setComicUrl] = useState<string | null>(part.comicUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setComicUrl(part.comicUrl ?? null);
    setError("");
    setNotice("");
  }, [part]);

  const uploadFile = async (file: File) => {
    setError("");
    if (!file.type.startsWith("image/")) {
      setError(t("content.comic.notImage", { name: file.name }));
      return;
    }
    setNotice(
      file.size > HEAVY_FILE_BYTES
        ? t("content.comic.heavy", { size: formatSize(file.size) })
        : ""
    );

    // Show the picked file straight away from a local blob, the same way the
    // audio editor does, so the admin can confirm they grabbed the right page
    // without waiting on the round trip to Yandex.
    const localUrl = URL.createObjectURL(file);
    setComicUrl(localUrl);

    setUploading(true);
    try {
      const url = await uploadPartAsset(token, story._id, part.partNumber, file, "comic");
      URL.revokeObjectURL(localUrl);
      setComicUrl(url);
      const updated = await saveComic(token, story._id, part.partNumber, url);
      onPartUpdated(updated);
    } catch (err) {
      // Drop the local preview too — leaving it up would imply the page saved.
      URL.revokeObjectURL(localUrl);
      setComicUrl(part.comicUrl ?? null);
      setError(err instanceof Error ? err.message : t("content.comic.uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm(t("content.comic.confirmRemove", { n: part.partNumber }))) return;
    setRemoving(true);
    setError("");
    setNotice("");
    try {
      const updated = await saveComic(token, story._id, part.partNumber, null);
      setComicUrl(null);
      onPartUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("content.comic.removeFailed"));
    } finally {
      setRemoving(false);
    }
  };

  const partsWithComics = story.parts.filter((p) => p.comicUrl).length;

  return (
    <div className="space-y-4">
      <div>
        {/* Matches the audio panel's drop zone rather than a bare file input:
            these two uploads are the same job, and one of them looking like an
            unstyled browser control made the page read as half-finished. */}
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void uploadFile(file);
          }}
          className={`flex flex-col items-center justify-center gap-1 rounded-[3px] border-2 border-dashed px-6 py-6 cursor-pointer transition-colors ${
            dragOver
              ? "border-amber-400 bg-amber-50"
              : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
          }`}
        >
          <IoImageOutline className="text-2xl text-gray-400" aria-hidden="true" />
          <span className="text-sm font-semibold text-black">
            {t(comicUrl ? "content.comic.dropReplace" : "content.comic.dropNew", { n: part.partNumber })}
          </span>
          <span className="text-xs text-gray-500">
            {t("content.comic.orClick")}
          </span>
          <input
            type="file"
            accept={ACCEPTED}
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadFile(file);
              e.target.value = "";
            }}
          />
        </label>
        {uploading && <p className="text-xs text-gray-500 mt-1">{t("common.uploading")}</p>}
        <p className="text-xs text-gray-400 mt-1">
          {t("content.comic.onePerPart")}
        </p>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {notice && <p className="text-amber-600 text-sm">{notice}</p>}

      {comicUrl ? (
        <div className="space-y-2">
          <div className="bg-gray-50 rounded-[3px] border border-gray-200 p-2 inline-block max-w-full">
            <img
              src={comicUrl}
              alt={t("content.comic.alt", { n: part.partNumber })}
              className="max-h-96 w-auto max-w-full rounded-[3px]"
            />
          </div>
          <div className="flex items-center gap-3">
            <a
              href={comicUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-gray-500 hover:text-black underline"
            >
              {t("content.comic.openFull")}
            </a>
            <button
              type="button"
              onClick={handleRemove}
              disabled={removing || uploading}
              className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
            >
              {removing ? t("common.removing") : t("common.remove")}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-[3px] border border-dashed border-gray-300 p-8 text-center">
          <p className="text-sm text-gray-500">{t("content.comic.empty")}</p>
          <p className="text-xs text-gray-400 mt-1">
            {t("content.comic.emptyHint")}
          </p>
        </div>
      )}

      <p className="text-xs text-gray-400 border-t border-gray-100 pt-3">
        {t("content.comic.summary", { count: partsWithComics, total: story.parts.length })}
      </p>
    </div>
  );
};

export default PartComicEditor;
