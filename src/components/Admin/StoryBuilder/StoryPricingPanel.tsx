import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AdminStory, updateStoryMeta } from "../../../services/adminStoryServices";
import { SaveBar, Segmented } from "./studioUi";
import { fieldHint, fieldLabel, textInput, inputBase } from "./studioStyles";

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
 * Free parts and preview seconds are optional, and null is a real value
 * meaning "work it out from the length" — the first three parts free (every
 * part, on a story of three or fewer). No timed preview unless one is set
 * here. Almost every story should keep both on "Automatic" / "None"; they
 * exist for the one that should not follow the rule.
 *
 * Note 0 is NOT automatic. A freeParts of 0 means "nothing plays free", which
 * is a deliberate and different thing from leaving it to the rule. That is why
 * the form asks "automatic or a number?" first instead of reading a blank box.
 */
interface Props {
  token: string;
  story: AdminStory;
  onStoryUpdated: (story: AdminStory) => void;
}

/** What the form edits — strings for the number boxes so typing stays free. */
interface Draft {
  paid: boolean;
  ready: boolean;
  character: string;
  freeMode: "auto" | "custom";
  freeParts: string;
  previewMode: "none" | "custom";
  previewSeconds: string;
}

const isSet = (value: number | null | undefined): value is number => value !== null && value !== undefined;

const draftOf = (story: AdminStory): Draft => ({
  paid: story.paid !== false,
  ready: story.ready !== false,
  character: story.character ?? "",
  freeMode: isSet(story.freeParts) ? "custom" : "auto",
  freeParts: isSet(story.freeParts) ? String(story.freeParts) : "",
  previewMode: isSet(story.previewSeconds) ? "custom" : "none",
  previewSeconds: isSet(story.previewSeconds) ? String(story.previewSeconds) : "",
});

/** A whole number ≥ 0, or undefined when the box holds anything else. */
const wholeNumber = (field: string): number | undefined => {
  const trimmed = field.trim();
  if (trimmed === "") return undefined;
  const n = Number(trimmed);
  return Number.isInteger(n) && n >= 0 ? n : undefined;
};

const StoryPricingPanel = ({ token, story, onStoryUpdated }: Props) => {
  const { t } = useTranslation("studio");
  const [draft, setDraft] = useState<Draft>(() => draftOf(story));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  // A saved story (or another set opened in the same pane) is the new baseline.
  useEffect(() => {
    setDraft(draftOf(story));
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story._id, story.character, story.paid, story.ready, story.freeParts, story.previewSeconds]);
  useEffect(() => setSaved(false), [story._id]);

  const baseline = draftOf(story);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setSaved(false);
    setError("");
  };

  const total = story.totalParts;
  const autoFree = Math.min(3, total);
  const customFree = wholeNumber(draft.freeParts);
  const customPreview = wholeNumber(draft.previewSeconds);
  const freeCount = draft.freeMode === "auto" ? autoFree : Math.min(customFree ?? 0, total);

  const problem = !draft.paid
    ? ""
    : draft.freeMode === "custom" && customFree === undefined
      ? t("settings.access.freeCountInvalid")
      : draft.freeMode === "custom" && customFree !== undefined && customFree > total
        ? t("settings.access.freeCountTooMany", { count: total })
        : draft.previewMode === "custom" && !customPreview
          ? t("settings.access.previewInvalid")
          : "";

  const save = async () => {
    if (problem) return setError(problem);
    setSaving(true);
    setError("");
    try {
      onStoryUpdated(
        await updateStoryMeta(token, story._id, {
          character: draft.character.trim().toLowerCase(),
          paid: draft.paid,
          ready: draft.ready,
          freeParts: draft.freeMode === "auto" ? null : customFree ?? null,
          previewSeconds: draft.previewMode === "none" ? null : customPreview ?? null,
        }),
      );
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("settings.access.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  // The whole form, said back as one plain paragraph.
  const summary: string[] = !draft.paid
    ? [t("settings.access.summary.allFree", { count: total })]
    : [
        freeCount > 1
          ? t("settings.access.summary.freeRange", { from: 1, to: freeCount })
          : freeCount === 1
            ? t("settings.access.summary.freeOne", { n: 1 })
            : t("settings.access.summary.freeNone"),
        freeCount >= total
          ? t("settings.access.summary.everyPartFree")
          : freeCount + 1 === total
            ? t("settings.access.summary.paidOne", { n: total })
            : t("settings.access.summary.paidRange", { from: freeCount + 1, to: total }),
        ...(draft.previewMode === "custom" && customPreview ? [t("settings.access.summary.preview", { count: customPreview })] : []),
        draft.ready ? t("settings.access.summary.onSale") : t("settings.access.summary.comingSoon"),
      ];

  return (
    <div className="space-y-6">
      <div className="rounded-tile border border-line bg-room px-4 py-3" aria-live="polite">
        <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.16em] text-dim">{t("settings.access.summaryTitle")}</p>
        <p className="text-sm leading-relaxed text-ink">{summary.join(" ")}</p>
        {!story.published && <p className="mt-1 text-xs text-dim">{t("settings.access.summary.takesEffect")}</p>}
      </div>

      <Segmented
        label={t("settings.access.whoCanListen")}
        name={`access-${story._id}`}
        value={draft.paid ? "paid" : "free"}
        onChange={(value) => set("paid", value === "paid")}
        options={[
          { value: "paid", label: t("settings.access.subscribers"), hint: t("settings.access.subscribersHint") },
          { value: "free", label: t("settings.access.everyone"), hint: t("settings.access.everyoneHint") },
        ]}
      />

      {draft.paid && (
        <>
          <Segmented
            label={t("settings.access.inShop")}
            name={`ready-${story._id}`}
            value={draft.ready ? "ready" : "soon"}
            onChange={(value) => set("ready", value === "ready")}
            options={[
              { value: "ready", label: t("settings.access.onSale"), hint: t("settings.access.onSaleHint") },
              { value: "soon", label: t("settings.access.soon"), hint: t("settings.access.soonHint") },
            ]}
          />

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <Segmented
                label={t("settings.access.freeParts")}
                name={`free-${story._id}`}
                value={draft.freeMode}
                onChange={(value) => set("freeMode", value)}
                options={[
                  { value: "auto", label: t("settings.access.auto"), hint: autoFree === total ? t("settings.access.autoAll", { count: total }) : t("settings.access.autoRange", { to: autoFree }) },
                  { value: "custom", label: t("settings.access.setNumber") },
                ]}
              />
              {draft.freeMode === "custom" && (
                <div>
                  <label htmlFor={`free-n-${story._id}`} className="sr-only">{t("settings.access.freeNumberLabel")}</label>
                  <div className="flex items-center gap-2">
                    <input id={`free-n-${story._id}`} type="number" min={0} max={total} step={1} inputMode="numeric"
                      value={draft.freeParts} onChange={(e) => set("freeParts", e.target.value)} className={`${inputBase} w-28`} />
                    <span className="text-sm text-dim">{t("settings.access.ofParts", { count: total })}</span>
                  </div>
                  <p className={fieldHint}>{t("settings.access.zeroHint")}</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Segmented
                label={t("settings.access.timedPreview")}
                name={`preview-${story._id}`}
                value={draft.previewMode}
                onChange={(value) => set("previewMode", value)}
                options={[
                  { value: "none", label: t("settings.access.previewNone"), hint: t("settings.access.recommended") },
                  { value: "custom", label: t("settings.access.previewCustom") },
                ]}
              />
              {draft.previewMode === "custom" && (
                <div>
                  <label htmlFor={`preview-n-${story._id}`} className="sr-only">{t("settings.access.previewLabel")}</label>
                  <div className="flex items-center gap-2">
                    <input id={`preview-n-${story._id}`} type="number" min={1} step={1} inputMode="numeric" placeholder="30"
                      value={draft.previewSeconds} onChange={(e) => set("previewSeconds", e.target.value)} className={`${inputBase} w-28`} />
                    <span className="text-sm text-dim">{t("settings.access.seconds")}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="max-w-sm">
            <label htmlFor={`character-${story._id}`} className={fieldLabel}>{t("settings.access.mainCharacter")}</label>
            <input id={`character-${story._id}`} type="text" value={draft.character} onChange={(e) => set("character", e.target.value)}
              placeholder="leo" className={textInput} />
            <p className={fieldHint}>{t("settings.access.mainCharacterHint")}</p>
          </div>
        </>
      )}

      <div className="border-t border-line pt-4">
        <SaveBar dirty={dirty} saving={saving} saved={saved} error={error || (dirty ? problem : "")} onSave={save}
          onDiscard={() => { setDraft(baseline); setError(""); }} saveLabel={t("settings.access.save")} />
      </div>
    </div>
  );
};

export default StoryPricingPanel;
