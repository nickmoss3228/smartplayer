import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { IoTrashOutline } from "react-icons/io5";
import { AdminStory, deleteStory, updateStoryMeta } from "../../../services/adminStoryServices";
import type { StoryCategory } from "../../../types/storyGroups";
import StoryCoverEditor from "./StoryCoverEditor";
import CastEditor from "./CastEditor";
import StoryPricingPanel from "./StoryPricingPanel";
import { SaveBar, Segmented, SettingsSection } from "./studioUi";
import { LOCALES, fieldHint, fieldLabel, microLabel, smallButton, textArea, textInput, inputBase } from "./studioStyles";

/**
 * Everything about a set that is not one part: what students read on its card,
 * the card image, the cast, who can listen, and deleting it. One page of
 * stacked cards with a contents list beside it, each card saving on its own,
 * instead of an "Edit" toggle and three collapsed links.
 */

interface StorySettingsProps {
  token: string;
  story: AdminStory;
  onStoryUpdated: (story: AdminStory) => void;
  onDeleted: () => void;
}

interface DetailsDraft {
  storyName: string;
  characterIcon: string;
  category: StoryCategory;
  title: { en: string; ru: string };
  description: { en: string; ru: string };
}

const detailsOf = (story: AdminStory): DetailsDraft => ({
  storyName: story.storyName,
  characterIcon: story.characterIcon,
  category: story.category ?? "general",
  title: { en: story.localized?.title?.en ?? "", ru: story.localized?.title?.ru ?? "" },
  description: { en: story.localized?.description?.en ?? "", ru: story.localized?.description?.ru ?? "" },
});

function DetailsForm({ token, story, onStoryUpdated }: Pick<StorySettingsProps, "token" | "story" | "onStoryUpdated">) {
  const { t } = useTranslation("studio");
  const [draft, setDraft] = useState(() => detailsOf(story));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const baseline = detailsOf(story);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);

  useEffect(() => {
    setDraft(detailsOf(story));
    setSaved(false);
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story._id]);

  const edit = (change: (d: DetailsDraft) => DetailsDraft) => {
    setDraft(change);
    setSaved(false);
    setError("");
  };

  const save = async () => {
    if (!draft.storyName.trim()) return setError(t("settings.details.nameEmpty"));
    setSaving(true);
    setError("");
    try {
      const updated = await updateStoryMeta(token, story._id, {
        storyName: draft.storyName.trim(),
        localized: {
          title: { en: draft.title.en.trim(), ru: draft.title.ru.trim() },
          description: { en: draft.description.en.trim(), ru: draft.description.ru.trim() },
        },
        characterIcon: draft.characterIcon.trim() || "📖",
        category: draft.category,
      });
      onStoryUpdated(updated);
      setDraft(detailsOf(updated));
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("settings.details.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const fallback = draft.storyName.trim() || story.storyName;

  return (
    <div className="space-y-6">
      {/* What students read on the story list and the level page, per
          language. An empty title falls back to the internal name, which is
          how an English reader once ended up looking at a Russian title. */}
      <div className="grid gap-5 md:grid-cols-2">
        {LOCALES.map(({ id }) => (
          <div key={id} className="min-w-0 space-y-4 rounded-tile border border-line p-4">
            <p className={microLabel}>{t(`common.languages.${id}`)}</p>
            <div>
              <label htmlFor={`title-${id}`} className={fieldLabel}>{t("settings.details.titleLabel")}</label>
              <input id={`title-${id}`} type="text" value={draft.title[id]}
                onChange={(e) => edit((d) => ({ ...d, title: { ...d.title, [id]: e.target.value } }))}
                placeholder={fallback} className={textInput} />
              {!draft.title[id].trim() && <p className={`${fieldHint} text-amber-800`}>{t("settings.details.emptyWarning", { fallback })}</p>}
            </div>
            <div>
              <label htmlFor={`description-${id}`} className={fieldLabel}>{t("settings.details.descriptionLabel")}</label>
              <textarea id={`description-${id}`} rows={3} value={draft.description[id]}
                onChange={(e) => edit((d) => ({ ...d, description: { ...d.description, [id]: e.target.value } }))}
                className={textArea} />
              <p className={fieldHint}>{t("settings.details.descriptionHint")}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <label htmlFor="internal-name" className={fieldLabel}>{t("settings.details.internalName")}</label>
          <input id="internal-name" type="text" value={draft.storyName}
            onChange={(e) => edit((d) => ({ ...d, storyName: e.target.value }))} className={textInput} />
          <p className={fieldHint}>{t("settings.details.internalNameHint")}</p>
        </div>
        <Segmented
          label={t("settings.details.shelf")}
          name={`shelf-${story._id}`}
          value={draft.category}
          onChange={(category) => edit((d) => ({ ...d, category }))}
          options={[
            { value: "general", label: t("settings.details.shelfStories") },
            { value: "news", label: t("settings.details.shelfNews") },
          ]}
        />
      </div>

      <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
        <div>
          <label htmlFor="list-icon" className={fieldLabel}>{t("settings.details.icon")}</label>
          <input id="list-icon" type="text" value={draft.characterIcon}
            onChange={(e) => edit((d) => ({ ...d, characterIcon: e.target.value }))} className={`${inputBase} w-20 text-center`} />
        </div>
        <dl className="flex flex-wrap gap-x-8 gap-y-2 pb-2 text-sm">
          <div><dt className={microLabel}>{t("settings.details.level")}</dt><dd className="font-semibold text-ink">{t(`common.difficulty.${story.difficulty}`)}</dd></div>
          <div><dt className={microLabel}>{t("settings.details.setId")}</dt><dd className="font-mono text-ink">{story.storyId}</dd></div>
        </dl>
        <p className="basis-full text-xs text-dim">{t("settings.details.iconHint")}</p>
      </div>

      <div className="border-t border-line pt-4">
        <SaveBar dirty={dirty} saving={saving} saved={saved} error={error} onSave={save}
          onDiscard={() => { setDraft(baseline); setError(""); }} />
      </div>
    </div>
  );
}

export default function StorySettings({ token, story, onStoryUpdated, onDeleted }: StorySettingsProps) {
  const { t } = useTranslation("studio");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const castCount = story.cast?.length ?? 0;
  const freeSummary = story.paid === false ? t("settings.nav.freeForAll") : story.ready === false ? t("settings.nav.subscribersSoon") : t("settings.nav.subscribers");
  const castStatus = castCount ? t("settings.nav.characters", { count: castCount }) : t("settings.nav.none");
  const coverStatus = story.coverUrl ? t("settings.nav.set") : t("settings.nav.none");
  const parts = t("common.parts", { count: story.parts.length });

  const sections = [
    { id: "set-details", title: t("settings.details.title"), status: story.localized?.title?.en && story.localized?.title?.ru ? t("settings.nav.bothLanguages") : t("settings.nav.titleMissing") },
    { id: "set-cover", title: t("settings.cover.title"), status: coverStatus },
    { id: "set-cast", title: t("settings.cast.title"), status: castStatus },
    { id: "set-access", title: t("settings.access.title"), status: freeSummary },
    { id: "set-delete", title: t("settings.delete.title"), status: "" },
  ];

  const handleDelete = async () => {
    if (!confirm(t("settings.delete.confirm", { name: story.storyName, parts }))) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteStory(token, story._id);
      onDeleted();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t("settings.delete.failed"));
      setDeleting(false);
    }
  };

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
      <nav aria-label={t("settings.nav.label")} className="hidden lg:block">
        <ul className="sticky top-20 space-y-1">
          {sections.map((section) => (
            <li key={section.id}>
              <button type="button" onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="block w-full rounded-tile px-3 py-2 text-left hover:bg-white">
                <span className={`block text-sm font-semibold ${section.id === "set-delete" ? "text-red-700" : "text-ink"}`}>{section.title}</span>
                {section.status && <span className="block text-xs text-dim">{section.status}</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0 space-y-6">
        <SettingsSection id="set-details" title={t("settings.details.title")} description={t("settings.details.description")}>
          <DetailsForm token={token} story={story} onStoryUpdated={onStoryUpdated} />
        </SettingsSection>

        <SettingsSection id="set-cover" title={t("settings.cover.title")} description={t("settings.cover.description")}
          status={coverStatus}>
          <StoryCoverEditor token={token} story={story} onStoryUpdated={onStoryUpdated} />
        </SettingsSection>

        <SettingsSection id="set-cast" title={t("settings.cast.title")}
          description={t("settings.cast.description")}
          status={castStatus}>
          <CastEditor token={token} story={story} onStoryUpdated={onStoryUpdated} />
        </SettingsSection>

        <SettingsSection id="set-access" title={t("settings.access.title")} description={t("settings.access.description")}
          status={freeSummary}>
          <StoryPricingPanel token={token} story={story} onStoryUpdated={onStoryUpdated} />
        </SettingsSection>

        <section id="set-delete" aria-labelledby="set-delete-title" className="scroll-mt-24 rounded-card border border-red-200 bg-white px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 id="set-delete-title" className="text-lg font-bold text-red-800">{t("settings.delete.title")}</h3>
              <p className="mt-0.5 text-sm text-dim">{t("settings.delete.description", { parts })}</p>
            </div>
            <button type="button" onClick={handleDelete} disabled={deleting} className={`${smallButton} border-red-300 text-red-700 hover:border-red-700`}>
              <IoTrashOutline aria-hidden="true" />{deleting ? t("common.deleting") : t("settings.delete.title")}
            </button>
          </div>
          {deleteError && <p role="alert" className="mt-2 text-sm text-red-700">{deleteError}</p>}
        </section>
      </div>
    </div>
  );
}
