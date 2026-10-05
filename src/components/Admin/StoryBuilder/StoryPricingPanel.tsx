import { useEffect, useState } from "react";
import { AdminStory, updateStoryMeta } from "../../../services/adminStoryServices";

/**
 * Whether this story is behind the subscription, and how much of it is free.
 *
 * There is no per-story price: stories are not sold one at a time. A paid
 * story is inside its level's subscription and the all-levels one, whatever
 * it is — so the only commercial choice left here is paid or free.
 *
 * This panel is the reason the catalog moved into the database. A story
 * created here used to appear in NO catalog, and the server's paywall failed
 * open on keys it did not recognise. Every field below now has exactly one
 * home: the story row.
 *
 * ── The empty-means-derive rule ─────────────────────────────────────────────
 *
 * Free parts and preview seconds are optional, and blank is a real value
 * meaning "work it out from the length" — the first three parts free (every
 * part, on a story of three or fewer). No timed preview unless one is typed in
 * here. Almost every story should leave both blank; they exist for the one
 * that should not follow the rule.
 *
 * Note 0 is NOT blank. A freeParts of 0 means "nothing plays free", which is a
 * deliberate and different thing from leaving it empty.
 */
interface Props {
  token: string;
  story: AdminStory;
  onStoryUpdated: (story: AdminStory) => void;
}

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
    setFreeParts(toField(story.freeParts));
    setPreviewSeconds(toField(story.previewSeconds));
    setError("");
    setSaved(false);
  }, [story._id, story.character, story.paid, story.ready, story.freeParts, story.previewSeconds]);

  const save = async () => {
    const free = toValue(freeParts);
    const preview = toValue(previewSeconds);
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
          freeParts: free,
          previewSeconds: preview,
        }),
      );
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save access settings.");
    } finally {
      setSaving(false);
    }
  };

  const field = "w-full text-black px-3 py-2 border border-gray-300 rounded-[3px] text-sm";
  const label = "block text-xs text-gray-500 mb-1";

  return (
    <div className="bg-white rounded-[3px] shadow p-4 border border-gray-200 space-y-4">
      <div>
        <h3 className="font-semibold text-black">Access</h3>
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
          Behind the subscription
          <span className="block text-xs text-gray-500">
            Ticked, it is inside its level&apos;s subscription and the all-levels one. Unticked,
            the whole story is free to everyone and in no subscription.
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
              Released
              <span className="block text-xs text-gray-500">
                Unticked, the shop counts it as &ldquo;coming soon&rdquo;; a level with nothing
                released is not sold. Use this until the audio is actually uploaded.
              </span>
            </span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Character</label>
              <input
                type="text"
                value={character}
                onChange={(e) => setCharacter(e.target.value)}
                placeholder="leo"
                className={field}
              />
              <p className="mt-1 text-[11px] text-gray-400">
                Who the story is about. Names the level in the shop.
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
        {saving ? "Saving…" : "Save access"}
      </button>
    </div>
  );
};

export default StoryPricingPanel;
