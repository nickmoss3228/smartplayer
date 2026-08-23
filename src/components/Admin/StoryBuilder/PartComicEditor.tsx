import { useEffect, useState } from "react";
import {
  AdminStory,
  StoryPart,
  uploadPartAsset,
  saveComic,
} from "../../../services/adminStoryServices";

interface PartComicEditorProps {
  token: string;
  story: AdminStory;
  part: StoryPart;
  onPartUpdated: (part: StoryPart) => void;
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
const PartComicEditor = ({ token, story, part, onPartUpdated }: PartComicEditorProps) => {
  const [comicUrl, setComicUrl] = useState<string | null>(part.comicUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setComicUrl(part.comicUrl ?? null);
    setError("");
    setNotice("");
  }, [part]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setNotice(
      file.size > HEAVY_FILE_BYTES
        ? `That page is ${formatSize(file.size)}. It will work, but students load it on a phone — consider flattening it first.`
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
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemove = async () => {
    if (!confirm(`Remove the comic page for part ${part.partNumber}?`)) return;
    setRemoving(true);
    setError("");
    setNotice("");
    try {
      const updated = await saveComic(token, story._id, part.partNumber, null);
      setComicUrl(null);
      onPartUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove the comic page.");
    } finally {
      setRemoving(false);
    }
  };

  const partsWithComics = story.parts.filter((p) => p.comicUrl).length;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-black mb-1">
          Part {part.partNumber} comic page
        </label>
        <input type="file" accept={ACCEPTED} onChange={handleUpload} disabled={uploading} />
        {uploading && <p className="text-xs text-gray-500 mt-1">Uploading...</p>}
        <p className="text-xs text-gray-400 mt-1">
          JPEG, PNG, WebP, AVIF or GIF. One page per part — it opens from the Comics button while
          this part is playing.
        </p>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {notice && <p className="text-amber-600 text-sm">{notice}</p>}

      {comicUrl ? (
        <div className="space-y-2">
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-2 inline-block max-w-full">
            <img
              src={comicUrl}
              alt={`Comic page for part ${part.partNumber}`}
              className="max-h-96 w-auto max-w-full rounded"
            />
          </div>
          <div className="flex items-center gap-3">
            <a
              href={comicUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-gray-500 hover:text-black underline"
            >
              Open full size
            </a>
            <button
              type="button"
              onClick={handleRemove}
              disabled={removing || uploading}
              className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
            >
              {removing ? "Removing..." : "Remove"}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg border border-dashed border-gray-300 p-8 text-center">
          <p className="text-sm text-gray-500">No comic page for this part yet.</p>
          <p className="text-xs text-gray-400 mt-1">
            Parts without one show the players an empty &ldquo;Comics&rdquo; placeholder.
          </p>
        </div>
      )}

      <p className="text-xs text-gray-400 border-t border-gray-100 pt-3">
        {partsWithComics}/{story.parts.length} parts in this story have a comic page.
      </p>
    </div>
  );
};

export default PartComicEditor;
