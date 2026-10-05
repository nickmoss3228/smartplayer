import { useMemo, useState } from "react";
import {
  AdminStory,
  StoryPart,
  VocabEntry,
  uploadPartAsset,
} from "../../../services/adminStoryServices";
import { cropAspect, gridBoxes, type Box } from "../../../modules/comicPractice/boxes";
import { matchPictureFiles } from "../../../modules/comicPractice/pictureFiles";
import BoxCanvas from "./BoxCanvas";

interface VocabPicturesPanelProps {
  token: string;
  story: AdminStory;
  part: StoryPart;
  kind: "vocab" | "phrasal";
  words: VocabEntry[];
  onWordsChange: (words: VocabEntry[]) => void;
}

const ACCEPTED = "image/jpeg,image/png,image/webp,image/avif,image/gif";

/**
 * Pictures for a part's words, two ways that cost one image generation each
 * rather than one per word:
 *
 *   - Name the files after the words ("flat.png", "local shop.jpg") and drop
 *     them all at once; each lands on its word.
 *   - Cut them out of one bigger image: the part's comic page, where most
 *     concrete words are already drawn, or a sheet made with one picture per
 *     word in a grid. Split the sheet as a grid and every word gets its cell.
 *
 * Changes stay in the word list until "Save" — the same as adding a word. The
 * uploaded files are in the bucket straight away either way.
 */
const VocabPicturesPanel = ({ token, story, part, kind, words, onWordsChange }: VocabPicturesPanelProps) => {
  const comicUrl = part.comicUrl ?? null;
  const [uploadedSheets, setUploadedSheets] = useState<string[]>([]);
  const sources = useMemo(() => {
    const fromWords = words.flatMap((w) => (w.image?.box ? [w.image.url] : []));
    const all = [...(comicUrl ? [comicUrl] : []), ...fromWords, ...uploadedSheets];
    return [...new Set(all)];
  }, [comicUrl, words, uploadedSheets]);

  const [source, setSource] = useState<string | null>(sources[0] ?? null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  // Which word the next drawn box is for: to start with, the first with none.
  const [target, setTarget] = useState<number | null>(() => {
    const i = words.findIndex((w) => !w.image);
    return i === -1 ? null : i;
  });
  const [gridRows, setGridRows] = useState(3);
  const [gridCols, setGridCols] = useState(4);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const imageKind = kind === "vocab" ? "vocabImage" : "phrasalImage";

  // ── one file per word, matched by name ───────────────────────────────────

  const uploadBatch = async (files: File[]) => {
    setError("");
    setMessage("");
    const { matched, unmatched } = matchPictureFiles(files, words.map((w) => w.audioKey));
    if (matched.size === 0) {
      setError(`None of those files is named after a word in this list (e.g. "${words[0]?.audioKey ?? "flat"}.png").`);
      return;
    }
    setBusy(`Uploading ${matched.size} picture${matched.size === 1 ? "" : "s"}…`);
    const urls = new Map<string, string>();
    const failed: string[] = [];
    try {
      for (const [audioKey, file] of matched) {
        try {
          urls.set(audioKey, await uploadPartAsset(token, story._id, part.partNumber, file, imageKind, { audioKey }));
        } catch {
          failed.push(file.name);
        }
      }
    } finally {
      setBusy("");
    }
    onWordsChange(
      words.map((w) => (urls.has(w.audioKey) ? { ...w, image: { url: urls.get(w.audioKey)!, box: null, aspect: null } } : w)),
    );
    setMessage(
      [
        `Attached ${urls.size} picture${urls.size === 1 ? "" : "s"} — save the list to keep them.`,
        unmatched.length ? `No word called: ${unmatched.map((f) => f.name).join(", ")}.` : "",
        failed.length ? `Upload failed: ${failed.join(", ")}.` : "",
      ]
        .filter(Boolean)
        .join(" "),
    );
  };

  // ── cutting out of a page or a sheet ─────────────────────────────────────

  const uploadSheet = async (file: File) => {
    setError("");
    setBusy("Uploading the sheet…");
    try {
      const url = await uploadPartAsset(token, story._id, part.partNumber, file, "pictureSheet");
      setUploadedSheets((s) => [...s, url]);
      setSource(url);
      setNatural(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy("");
    }
  };

  // The words cut from the current source, and where each sits in `words`.
  const onSource = words.flatMap((w, i) => (source && w.image?.box && w.image.url === source ? [i] : []));
  const crop = (box: Box) =>
    natural && source ? { url: source, box, aspect: cropAspect(box, natural.w, natural.h) } : null;

  const handleDraw = (box: Box) => {
    if (target === null) {
      setError("Pick the word this picture is for first.");
      return;
    }
    setError("");
    const image = crop(box);
    if (!image) return;
    const next = words.map((w, i) => (i === target ? { ...w, image } : w));
    onWordsChange(next);
    // On to the next word still without one, so a sheet is cut in one pass.
    const order = [...next.keys()].slice(target + 1).concat([...next.keys()].slice(0, target + 1));
    setTarget(order.find((i) => !next[i].image) ?? null);
  };

  const applyGrid = () => {
    if (!source || !natural) return;
    const cells = gridBoxes(gridRows, gridCols);
    const without = [...words.keys()].filter((i) => !words[i].image);
    if (without.length === 0) {
      setError("Every word already has a picture. Remove one to re-cut it.");
      return;
    }
    const assigned = new Map(without.slice(0, cells.length).map((wordIndex, n) => [wordIndex, cells[n]]));
    onWordsChange(words.map((w, i) => (assigned.has(i) ? { ...w, image: crop(assigned.get(i)!) } : w)));
    setMessage(
      `Cut ${assigned.size} cell${assigned.size === 1 ? "" : "s"} for the words without a picture, in list order.` +
        (without.length > cells.length ? ` ${without.length - cells.length} still have none.` : ""),
    );
    setTarget(null);
  };

  const pictureCount = words.filter((w) => w.image).length;

  return (
    <details className="group bg-gray-50 rounded-[3px] border border-gray-200" open={pictureCount > 0 || undefined}>
      <summary className="cursor-pointer list-none select-none px-3 py-2 text-sm font-semibold text-black flex items-center gap-2">
        <span className="text-gray-400 group-open:rotate-90 transition-transform">▸</span>
        Pictures — {pictureCount}/{words.length} words have one
        <span className="font-normal text-xs text-gray-500">
          (stored with the words for a picture game — the player does not show them yet)
        </span>
      </summary>

      <div className="px-3 pb-3 space-y-4">
        {words.length === 0 ? (
          <p className="text-xs text-gray-500">Add words first.</p>
        ) : (
          <>
            <div className="space-y-1">
              <div className="text-xs font-semibold text-gray-700">Many at once — named after the words</div>
              <label className="flex flex-col items-center justify-center gap-0.5 rounded-[3px] border-2 border-dashed border-gray-300 bg-white px-4 py-3 cursor-pointer hover:border-gray-400">
                <span className="text-sm text-black">Choose pictures for several words</span>
                <span className="text-xs text-gray-500">
                  file names = the English keys: {words.slice(0, 3).map((w) => `"${w.audioKey}.png"`).join(", ")}…
                </span>
                <input
                  type="file"
                  accept={ACCEPTED}
                  multiple
                  className="sr-only"
                  disabled={Boolean(busy)}
                  onChange={(e) => {
                    const files = [...(e.target.files ?? [])];
                    e.target.value = "";
                    if (files.length) void uploadBatch(files);
                  }}
                />
              </label>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-700">Cut out of one image</div>
              <div className="flex flex-wrap items-center gap-2">
                {sources.map((url, n) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => {
                      setSource(url);
                      setNatural(null);
                    }}
                    className={`text-xs rounded-[3px] px-2 py-1 border ${
                      source === url ? "bg-black text-white border-black" : "bg-white text-gray-700 border-gray-300"
                    }`}
                  >
                    {url === comicUrl ? "Comic page" : `Sheet ${n + (comicUrl ? 0 : 1)}`}
                  </button>
                ))}
                <label className="text-xs rounded-[3px] px-2 py-1 border border-dashed border-gray-400 text-gray-600 cursor-pointer hover:border-gray-600">
                  + Upload a picture sheet
                  <input
                    type="file"
                    accept={ACCEPTED}
                    className="sr-only"
                    disabled={Boolean(busy)}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) void uploadSheet(file);
                    }}
                  />
                </label>
              </div>

              {source && (
                <>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-gray-600">Next box is for</span>
                    <select
                      value={target ?? ""}
                      onChange={(e) => setTarget(e.target.value === "" ? null : Number(e.target.value))}
                      className="text-black text-xs px-2 py-1 border border-gray-300 rounded-[3px] bg-white"
                    >
                      <option value="">— pick a word —</option>
                      {words.map((w, i) => (
                        <option key={w.audioKey} value={i}>
                          {w.image ? "✓ " : ""}
                          {w.audioKey} — {w.word}
                        </option>
                      ))}
                    </select>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-600">or split as a grid</span>
                    <input
                      type="number"
                      min={1}
                      max={8}
                      value={gridRows}
                      onChange={(e) => setGridRows(Math.min(8, Math.max(1, Number(e.target.value) || 1)))}
                      className="w-12 text-black px-1.5 py-0.5 border border-gray-300 rounded-[3px]"
                      aria-label="Rows"
                    />
                    ×
                    <input
                      type="number"
                      min={1}
                      max={8}
                      value={gridCols}
                      onChange={(e) => setGridCols(Math.min(8, Math.max(1, Number(e.target.value) || 1)))}
                      className="w-12 text-black px-1.5 py-0.5 border border-gray-300 rounded-[3px]"
                      aria-label="Columns"
                    />
                    <button
                      type="button"
                      onClick={applyGrid}
                      disabled={!natural}
                      className="bg-white border border-gray-300 hover:border-gray-500 rounded-[3px] px-2 py-0.5 text-gray-700 disabled:opacity-40"
                    >
                      Fill the words without a picture
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">
                    Drag a box around the word&apos;s picture. Drag a box to move it, its corners to resize.
                  </p>
                  <BoxCanvas
                    key={source}
                    src={source}
                    boxes={onSource.map((i) => words[i].image!.box!)}
                    selected={target !== null && onSource.includes(target) ? onSource.indexOf(target) : null}
                    onSelect={(j) => j !== null && setTarget(onSource[j])}
                    onDraw={handleDraw}
                    onBoxesChange={(boxes) =>
                      onWordsChange(
                        words.map((w, i) => {
                          const j = onSource.indexOf(i);
                          return j === -1 || boxes[j] === w.image?.box ? w : { ...w, image: crop(boxes[j]) ?? w.image };
                        }),
                      )
                    }
                    label={(j) => words[onSource[j]].audioKey}
                    onNaturalSize={(w, h) => setNatural({ w, h })}
                    maxHeightClass="max-h-[60vh]"
                  />
                </>
              )}
            </div>
          </>
        )}

        {busy && <p className="text-xs text-gray-500">{busy}</p>}
        {message && <p className="text-xs text-emerald-700">{message}</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </details>
  );
};

export default VocabPicturesPanel;
