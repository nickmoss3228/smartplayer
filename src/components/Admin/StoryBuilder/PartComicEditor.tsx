import { useEffect, useMemo, useState } from "react";
import {
  AdminStory,
  StoryPart,
  uploadPartAsset,
  saveComic,
  getStory,
} from "../../../services/adminStoryServices";
import { IoImageOutline } from "react-icons/io5";
import { builtInComicFor } from "../../../modules/story/resolveStory";

interface PartComicEditorProps {
  token: string;
  story: AdminStory;
  part: StoryPart;
  onPartUpdated: (part: StoryPart) => void;
  /** Whole-story replacement, for edits that touch more than one part. */
  onStoryUpdated: (story: AdminStory) => void;
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
  onStoryUpdated,
}: PartComicEditorProps) => {
  const [comicUrl, setComicUrl] = useState<string | null>(part.comicUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [adopting, setAdopting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Artwork that already ships with the app for this exact part.
  //
  // A published story takes ALL its content from the database, comic pages
  // included, while an unpublished one falls back to the built-in files. So
  // the three original character stories — imported before the importer knew
  // about the comic manifest — read as "no comic" here and, worse, would lose
  // their artwork the moment anyone published them. This is the recovery
  // path: the pages exist, so offer them rather than asking for a re-upload.
  const builtIn = useMemo(
    () => builtInComicFor(story.difficulty, story.storyId, part.partNumber),
    [story.difficulty, story.storyId, part.partNumber],
  );
  const adoptable = useMemo(
    () =>
      story.parts.filter(
        (p) => !p.comicUrl && builtInComicFor(story.difficulty, story.storyId, p.partNumber),
      ),
    [story.parts, story.difficulty, story.storyId],
  );

  useEffect(() => {
    setComicUrl(part.comicUrl ?? null);
    setError("");
    setNotice("");
  }, [part]);

  const uploadFile = async (file: File) => {
    setError("");
    if (!file.type.startsWith("image/")) {
      setError(`${file.name} is not an image.`);
      return;
    }
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

  /** Save the built-in page(s) onto the story, so publishing keeps them. */
  const handleAdopt = async (targets: StoryPart[]) => {
    setAdopting(true);
    setError("");
    setNotice("");
    try {
      for (const target of targets) {
        const url = builtInComicFor(story.difficulty, story.storyId, target.partNumber);
        if (!url) continue;
        const saved = await saveComic(token, story._id, target.partNumber, url);
        if (target.partNumber === part.partNumber) setComicUrl(saved.comicUrl ?? null);
      }
      // Re-read rather than folding each saved part in as it arrives:
      // onPartUpdated merges into the story this render closed over, so a loop
      // of them would write every part on top of a snapshot taken before the
      // first save and keep only the last one.
      onStoryUpdated(await getStory(token, story._id));
      setNotice(
        targets.length === 1
          ? "Using the built-in page for this part."
          : `Using the built-in pages for ${targets.length} parts.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save the comic page.");
    } finally {
      setAdopting(false);
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
          className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-6 py-6 cursor-pointer transition-colors ${
            dragOver
              ? "border-amber-400 bg-amber-50"
              : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
          }`}
        >
          <IoImageOutline className="text-2xl text-gray-400" aria-hidden="true" />
          <span className="text-sm font-semibold text-black">
            {comicUrl ? "Replace" : "Drop"} the comic page for part {part.partNumber}
          </span>
          <span className="text-xs text-gray-500">
            or click to choose a file — JPEG, PNG, WebP, AVIF or GIF
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
        {uploading && <p className="text-xs text-gray-500 mt-1">Uploading…</p>}
        <p className="text-xs text-gray-400 mt-1">
          One page per part — it opens from the Comics button while this part is playing.
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
      ) : builtIn ? (
        <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
          <p className="text-sm font-semibold text-amber-900">
            This story already has artwork for part {part.partNumber}
          </p>
          <p className="text-xs text-amber-800 mt-1 leading-relaxed">
            It ships with the app, so students see it today. It is not saved on the story though,
            and a published story shows only what is saved here &mdash; so publishing as things
            stand would drop it.
          </p>
          <div className="flex items-start gap-3 mt-3">
            <img
              src={builtIn}
              alt={`Built-in comic page for part ${part.partNumber}`}
              className="w-32 rounded border border-amber-200 bg-white"
            />
            <div className="flex flex-col items-start gap-2">
              <button
                type="button"
                onClick={() => handleAdopt([part])}
                disabled={adopting}
                className="text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-3 py-1.5 disabled:opacity-50"
              >
                {adopting ? "Saving…" : "Use this page"}
              </button>
              {adoptable.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleAdopt(adoptable)}
                  disabled={adopting}
                  className="text-xs text-amber-800 underline hover:no-underline disabled:opacity-50"
                >
                  Use the built-in pages for all {adoptable.length} parts missing one
                </button>
              )}
              <span className="text-[11px] text-amber-700">
                Or upload your own above &mdash; that replaces it.
              </span>
            </div>
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
