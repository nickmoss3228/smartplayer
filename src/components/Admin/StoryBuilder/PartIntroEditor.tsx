import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { IoEyeOutline, IoImageOutline } from "react-icons/io5";
import {
  AdminStory,
  PartIntro,
  StoryPart,
  savePartIntro,
  uploadPartAsset,
} from "../../../services/adminStoryServices";
import {
  formatPreviewDuration,
  partPreviewCard,
  type PreviewLocale,
} from "../../../modules/storypreview/partPreview";
import { StoryPreviewModal } from "../../../modules/storypreview/StoryPreviewModal";
import { themes } from "../../../modules/levelprogress/themes.levelprogress";

/**
 * The card the level page opens when a student taps this part — title,
 * description, grammar points and a tip, in both languages side by side.
 *
 * Both columns on one screen rather than a language switch: a card written in
 * one language and forgotten in the other is the gap this exists to close, and
 * it is only visible when the two sit next to each other.
 */

interface PartIntroEditorProps {
  token: string;
  story: AdminStory;
  part: StoryPart;
  onPartUpdated: (part: StoryPart) => void;
}

// Mirrors INTRO_LIMITS in backend/src/controllers/story.controller.js, which
// refuses anything longer; these just stop the admin typing past it.
const LIMITS = { title: 120, description: 1000, tip: 500, grammarLine: 200, grammarLines: 8 };

const LOCALES: { id: PreviewLocale; label: string }[] = [
  { id: "en", label: "English" },
  { id: "ru", label: "Русский" },
];

const ACCEPTED = "image/jpeg,image/png,image/webp,image/avif,image/gif";

/** The form's own shape: grammar is edited as one point per line. */
interface Draft {
  title: Record<PreviewLocale, string>;
  description: Record<PreviewLocale, string>;
  grammar: Record<PreviewLocale, string>;
  tip: Record<PreviewLocale, string>;
  imageUrl: string | null;
}

const toDraft = (intro: PartIntro | null): Draft => ({
  title: { en: intro?.title.en ?? "", ru: intro?.title.ru ?? "" },
  description: { en: intro?.description.en ?? "", ru: intro?.description.ru ?? "" },
  grammar: { en: (intro?.grammar.en ?? []).join("\n"), ru: (intro?.grammar.ru ?? []).join("\n") },
  tip: { en: intro?.tip.en ?? "", ru: intro?.tip.ru ?? "" },
  imageUrl: intro?.imageUrl ?? null,
});

const grammarLines = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const fromDraft = (draft: Draft, durationSeconds: number | null): PartIntro => ({
  title: { en: draft.title.en.trim(), ru: draft.title.ru.trim() },
  description: { en: draft.description.en.trim(), ru: draft.description.ru.trim() },
  grammar: { en: grammarLines(draft.grammar.en), ru: grammarLines(draft.grammar.ru) },
  tip: { en: draft.tip.en.trim(), ru: draft.tip.ru.trim() },
  imageUrl: draft.imageUrl,
  durationSeconds,
});

const sameDraft = (a: Draft, b: Draft) => JSON.stringify(a) === JSON.stringify(b);

const PartIntroEditor = ({ token, story, part, onPartUpdated }: PartIntroEditorProps) => {
  const { i18n } = useTranslation();

  const saved = part.intro ?? null;
  const baseline = useMemo(() => toDraft(saved), [saved]);

  const [draft, setDraft] = useState<Draft>(baseline);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [previewLocale, setPreviewLocale] = useState<PreviewLocale | null>(null);

  // A save hands back a new part, and with it a new baseline.
  useEffect(() => {
    setDraft(baseline);
  }, [baseline]);

  // How long the part is, read from the audio itself rather than typed, so the
  // card's "~2 min 14 sec" cannot drift from the recording it describes. Only
  // the metadata is fetched, not the file.
  const [measured, setMeasured] = useState<number | null>(null);
  useEffect(() => {
    setMeasured(null);
    if (!part.audioUrl) return;
    const audio = new Audio();
    audio.preload = "metadata";
    const onLoaded = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) setMeasured(Math.round(audio.duration));
    };
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.src = part.audioUrl;
    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeAttribute("src");
      audio.load();
    };
  }, [part.audioUrl]);

  const durationSeconds = measured ?? saved?.durationSeconds ?? null;
  // A replaced recording makes the saved length wrong; saving again fixes it.
  const staleDuration = Boolean(saved && measured && saved.durationSeconds !== measured);
  const dirty = !sameDraft(draft, baseline) || staleDuration;

  const tooManyGrammar = LOCALES.find(
    ({ id }) => grammarLines(draft.grammar[id]).length > LIMITS.grammarLines,
  );
  const longGrammar = LOCALES.find(({ id }) =>
    grammarLines(draft.grammar[id]).some((line) => line.length > LIMITS.grammarLine),
  );
  const grammarProblem = tooManyGrammar
    ? `${tooManyGrammar.label}: at most ${LIMITS.grammarLines} grammar points.`
    : longGrammar
      ? `${longGrammar.label}: a grammar point is longer than ${LIMITS.grammarLine} characters.`
      : "";

  const setField = (field: "title" | "description" | "grammar" | "tip", locale: PreviewLocale, value: string) =>
    setDraft((d) => ({ ...d, [field]: { ...d[field], [locale]: value } }));

  const save = async (intro: PartIntro | null, message: string) => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      onPartUpdated(await savePartIntro(token, story._id, part.partNumber, intro));
      setNotice(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save the preview card.");
    } finally {
      setSaving(false);
    }
  };

  const handleImage = async (file: File) => {
    setError("");
    setUploading(true);
    try {
      const url = await uploadPartAsset(token, story._id, part.partNumber, file, "intro");
      setDraft((d) => ({ ...d, imageUrl: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  // What the header image will be, in the dialog's own order.
  const effectiveImage = draft.imageUrl || part.comicUrl || story.coverUrl || "";
  const imageSource = draft.imageUrl
    ? "Its own image"
    : part.comicUrl
      ? "This part's comic page"
      : story.coverUrl
        ? "The story's card image"
        : "No image yet — the card shows the level colour";

  // The dialog exactly as the level page will draw it, from the form as it
  // stands — unsaved edits included, so the check comes before the save.
  const previewCard = useMemo(() => {
    if (!previewLocale) return null;
    return partPreviewCard({
      difficulty: story.difficulty,
      story,
      part: { ...part, intro: fromDraft(draft, durationSeconds) },
      locale: previewLocale,
      t: i18n.getFixedT(previewLocale),
    });
  }, [previewLocale, story, part, draft, durationSeconds, i18n]);

  const storyTitle = (locale: PreviewLocale) =>
    story.localized?.title?.[locale]?.trim() || story.storyName;
  const storyDescription = (locale: PreviewLocale) =>
    story.localized?.description?.[locale]?.trim() || story.description;

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 max-w-2xl">
        Opens when a student taps part {part.partNumber} on the level page, before they start
        listening. Anything left empty is filled in for them: the title from the part name, the
        description from the story&rsquo;s.
      </p>

      {/* A draft is invisible to students, its cards included. Said here so an
          edit that "did nothing" is not a mystery. */}
      {!story.published && (
        <div className="bg-gray-50 rounded-[3px] border border-gray-200 p-3 text-xs text-gray-600 max-w-2xl">
          This story is a draft, so students do not see this card yet. It goes live when the story
          is published.
          &ldquo;See it as students do&rdquo; below shows it now.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {LOCALES.map(({ id, label }) => (
          <fieldset key={id} className="bg-white rounded-[3px] border border-gray-200 p-3 space-y-3 min-w-0">
            <legend className="font-mono text-[11px] uppercase tracking-[0.18em] text-gray-500 px-1">
              {label}
            </legend>

            <label className="block">
              <span className="block text-xs text-gray-500 mb-1">Title</span>
              <input
                type="text"
                value={draft.title[id]}
                maxLength={LIMITS.title}
                onChange={(e) => setField("title", id, e.target.value)}
                placeholder={part.title?.trim() || `${storyTitle(id)} — ${part.partNumber}`}
                className="w-full text-black px-3 py-1.5 border border-gray-300 rounded-[3px] text-sm"
              />
            </label>

            <label className="block">
              <span className="block text-xs text-gray-500 mb-1">What happens in this part</span>
              <textarea
                value={draft.description[id]}
                maxLength={LIMITS.description}
                onChange={(e) => setField("description", id, e.target.value)}
                placeholder={storyDescription(id) || "Empty: the dialog shows the story description."}
                rows={4}
                className="w-full text-black px-3 py-1.5 border border-gray-300 rounded-[3px] text-sm"
              />
            </label>

            <label className="block">
              <span className="block text-xs text-gray-500 mb-1">
                Grammar points <span className="text-gray-400">— one per line</span>
              </span>
              <textarea
                value={draft.grammar[id]}
                onChange={(e) => setField("grammar", id, e.target.value)}
                placeholder={"Past Simple (he went, she saw)\nArticles (a / the)"}
                rows={4}
                className="w-full text-black px-3 py-1.5 border border-gray-300 rounded-[3px] text-sm font-mono"
              />
            </label>

            <label className="block">
              <span className="block text-xs text-gray-500 mb-1">Tip</span>
              <textarea
                value={draft.tip[id]}
                maxLength={LIMITS.tip}
                onChange={(e) => setField("tip", id, e.target.value)}
                placeholder="What to listen out for"
                rows={2}
                className="w-full text-black px-3 py-1.5 border border-gray-300 rounded-[3px] text-sm"
              />
            </label>
          </fieldset>
        ))}
      </div>

      <div className="flex flex-wrap items-start gap-4 bg-white rounded-[3px] border border-gray-200 p-3">
        <div className="w-40 aspect-[680/208] shrink-0 rounded-[3px] overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
          {effectiveImage ? (
            <img src={effectiveImage} alt="" className="w-full h-full object-cover" />
          ) : (
            <IoImageOutline className="text-2xl text-gray-400" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 space-y-1">
          <div className="text-sm font-semibold text-black">Header image</div>
          <p className="text-xs text-gray-500">{imageSource}</p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer text-xs text-blue-600 underline">
              <input
                type="file"
                accept={ACCEPTED}
                className="sr-only"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImage(file);
                  e.target.value = "";
                }}
              />
              {uploading ? "Uploading…" : draft.imageUrl ? "Replace" : "Use a different image"}
            </label>
            {draft.imageUrl && (
              <button
                type="button"
                onClick={() => setDraft((d) => ({ ...d, imageUrl: null }))}
                className="text-xs text-gray-500 hover:text-black"
              >
                {part.comicUrl ? "Use the comic page instead" : "Remove"}
              </button>
            )}
          </div>
        </div>
        <div className="text-xs text-gray-500 md:ml-auto">
          <div className="text-sm font-semibold text-black">Length</div>
          {durationSeconds
            ? `${formatPreviewDuration(durationSeconds, i18n.getFixedT("en"))}${measured ? " — measured from the audio" : ""}`
            : part.audioUrl
              ? "Measuring…"
              : "Upload this part's audio to show it"}
          {staleDuration && (
            <p className="text-amber-700 mt-0.5">The audio changed since this was saved — save to update.</p>
          )}
        </div>
      </div>

      {grammarProblem && <p className="text-red-600 text-sm">{grammarProblem}</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {notice && <p className="text-emerald-700 text-sm">{notice}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => save(fromDraft(draft, durationSeconds), "Saved — this is what students see now.")}
          disabled={saving || uploading || !dirty || Boolean(grammarProblem)}
          className="text-sm bg-black text-white rounded-[3px] px-4 py-1.5 disabled:opacity-40"
        >
          {saving ? "Saving…" : dirty ? "Save" : "Saved"}
        </button>
        {dirty && (
          <button
            type="button"
            onClick={() => setDraft(baseline)}
            disabled={saving}
            className="text-sm text-gray-500 hover:text-black"
          >
            Discard changes
          </button>
        )}

        <span className="inline-flex items-center gap-1 text-xs text-gray-500 ml-auto">
          <IoEyeOutline aria-hidden="true" />
          See it as students do:
          {LOCALES.map(({ id }) => (
            <button
              key={id}
              type="button"
              onClick={() => setPreviewLocale(id)}
              className="font-mono uppercase text-blue-600 underline px-0.5"
            >
              {id}
            </button>
          ))}
        </span>

        {saved && (
          <button
            type="button"
            onClick={() => {
              const question = `Clear the preview card for part ${part.partNumber}? Students will see the part name and the story description.`;
              if (confirm(question)) {
                void save(null, "Cleared.");
              }
            }}
            disabled={saving}
            className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 w-full text-left"
          >
            Clear this card
          </button>
        )}
      </div>

      <StoryPreviewModal
        isOpen={previewCard !== null}
        preview={previewCard}
        theme={themes[story.difficulty] ?? themes.easy}
        onClose={() => setPreviewLocale(null)}
        onStart={() => setPreviewLocale(null)}
      />
    </div>
  );
};

export default PartIntroEditor;
