import { useEffect, useState } from "react";
import { AdminStory, updateStoryMeta } from "../../../services/adminStoryServices";

/**
 * What this story costs, and how much of it is free.
 *
 * This panel is the reason the catalog moved into the database. Prices used to
 * be literals in backend/src/config/priceCatalog.js, mirrored into the
 * frontend — which meant a story created here appeared in NO catalog, and the
 * server's paywall failed open on keys it did not recognise. The result was a
 * story that was free to every logged-out visitor and impossible to buy. Every
 * field below now has exactly one home: the story row.
 *
 * ── The empty-means-derive rule ─────────────────────────────────────────────
 *
 * Price, free parts and preview seconds are all optional, and blank is a real
 * value meaning "work it out from the length" — 29 ₽ a track, and the first
 * three parts free (every part, on a story of three or fewer). No timed
 * preview unless one is typed in here.
 * Almost every story should leave all three blank; they exist for the one that
 * should not follow the rule.
 *
 * Note 0 is NOT blank. A freeParts of 0 means "nothing plays free", which is a
 * deliberate and different thing from leaving it empty.
 */
interface Props {
  token: string;
  story: AdminStory;
  onStoryUpdated: (story: AdminStory) => void;
}

const TRACK_PRICE_MINOR = 2900;

/** "" for null/undefined, so a blank input round-trips back to "derive it". */
const toField = (value: number | null | undefined) =>
  value === null || value === undefined ? "" : String(value);

/** "" back to null. Anything unparseable is rejected by the caller. */
const toValue = (field: string): number | null | undefined => {
  const trimmed = field.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isInteger(n) && n >= 0 ? n : undefined;
};

const StoryPricingPanel = ({ token, story, onStoryUpdated }: Props) => {
  const [character, setCharacter] = useState(story.character ?? "");
  const [paid, setPaid] = useState(story.paid !== false);
  const [ready, setReady] = useState(story.ready !== false);
  const [priceMinor, setPriceMinor] = useState(toField(story.priceMinor));
  const [freeParts, setFreeParts] = useState(toField(story.freeParts));
  const [previewSeconds, setPreviewSeconds] = useState(toField(story.previewSeconds));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  // Switching stories in the rail reuses this component, so the fields have to
  // follow the story rather than keep the first one's values.
  useEffect(() => {
    setCharacter(story.character ?? "");
    setPaid(story.paid !== false);
    setReady(story.ready !== false);
    setPriceMinor(toField(story.priceMinor));
    setFreeParts(toField(story.freeParts));
    setPreviewSeconds(toField(story.previewSeconds));
    setError("");
    setSaved(false);
  }, [story._id, story.character, story.paid, story.ready, story.priceMinor, story.freeParts, story.previewSeconds]);

  const derivedPrice = story.totalParts * TRACK_PRICE_MINOR;
  const effectivePrice = priceMinor.trim() === "" ? derivedPrice : Number(priceMinor);

  const save = async () => {
    const price = toValue(priceMinor);
    const free = toValue(freeParts);
    const preview = toValue(previewSeconds);
    if (price === undefined) return setError("Price must be a whole number of kopecks, or blank.");
    if (free === undefined) return setError("Free parts must be a whole number, or blank.");
    if (preview === undefined) return setError("Preview seconds must be a whole number, or blank.");
    if (free !== null && free > story.totalParts) {
      return setError(`Free parts can't exceed the story's ${story.totalParts} parts.`);
    }

    setSaving(true);
    setError("");
    try {
      onStoryUpdated(
        await updateStoryMeta(token, story._id, {
          character: character.trim().toLowerCase(),
          paid,
          ready,
          priceMinor: price,
          freeParts: free,
          previewSeconds: preview,
        }),
      );
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save pricing.");
    } finally {
      setSaving(false);
    }
  };

  const field = "w-full text-black px-3 py-2 border border-gray-300 rounded-[3px] text-sm";
  const label = "block text-xs text-gray-500 mb-1";

  return (
    <div className="bg-white rounded-[3px] shadow p-4 border border-gray-200 space-y-4">
      <div>
        <h3 className="font-semibold text-black">Pricing &amp; access</h3>
        <p className="mt-0.5 text-xs text-gray-500">
          Leave a number blank to work it out from the story&apos;s length. These take effect as
          soon as the story is published.
        </p>
      </div>

      <label className="flex items-start gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={paid}
          onChange={(e) => setPaid(e.target.checked)}
          className="mt-0.5 h-4 w-4 cursor-pointer"
        />
        <span className="text-sm text-black">
          Sold for money
          <span className="block text-xs text-gray-500">
            Unticked, the whole story is free to everyone and it is left out of the character
            set — a bundle must not charge for something already given away.
          </span>
        </span>
      </label>

      {paid && (
        <>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={ready}
              onChange={(e) => setReady(e.target.checked)}
              className="mt-0.5 h-4 w-4 cursor-pointer"
            />
            <span className="text-sm text-black">
              Ready to sell
              <span className="block text-xs text-gray-500">
                Unticked, it appears in the shop as &ldquo;coming soon&rdquo; with no buy button.
                Use this until the audio is actually uploaded.
              </span>
            </span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Price (kopecks)</label>
              <input
                type="text"
                inputMode="numeric"
                value={priceMinor}
                onChange={(e) => setPriceMinor(e.target.value)}
                placeholder={`${derivedPrice} (29 ₽ × ${story.totalParts})`}
                className={field}
              />
              <p className="mt-1 text-[11px] text-gray-400">
                Shown to buyers as {(effectivePrice / 100).toFixed(0)} ₽
              </p>
            </div>

            <div>
              <label className={label}>Set / character</label>
              <input
                type="text"
                value={character}
                onChange={(e) => setCharacter(e.target.value)}
                placeholder="leo"
                className={field}
              />
              <p className="mt-1 text-[11px] text-gray-400">
                Sells through <code>set-{character.trim().toLowerCase() || "…"}</code>. Blank
                keeps it out of every bundle.
              </p>
            </div>

            <div>
              <label className={label}>Free parts</label>
              <input
                type="text"
                inputMode="numeric"
                value={freeParts}
                onChange={(e) => setFreeParts(e.target.value)}
                placeholder={`${Math.min(3, story.totalParts)} (from length)`}
                className={field}
              />
              <p className="mt-1 text-[11px] text-gray-400">Parts 1…n play in full. 0 means none.</p>
            </div>

            <div>
              <label className={label}>Preview seconds</label>
              <input
                type="text"
                inputMode="numeric"
                value={previewSeconds}
                onChange={(e) => setPreviewSeconds(e.target.value)}
                placeholder="none"
                className={field}
              />
              <p className="mt-1 text-[11px] text-gray-400">
                Part 1 stops after this long. Blank for no preview.
              </p>
            </div>
          </div>
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && !error && <p className="text-sm text-green-700">Saved.</p>}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="px-3 py-2 rounded-[3px] bg-black text-white text-sm disabled:opacity-50 cursor-pointer"
      >
        {saving ? "Saving…" : "Save pricing"}
      </button>
    </div>
  );
};

export default StoryPricingPanel;
