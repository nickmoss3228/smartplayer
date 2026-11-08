import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { IoAdd, IoRemove } from "react-icons/io5";
import { AdminStory, Difficulty, createStory } from "../../../services/adminStoryServices";
import { MAX_PARTS, validPartCount } from "../../../types/content";
import { buttonPrimary, buttonSecondary } from "../../ui/buttonStyles";
import { Segmented } from "./studioUi";
import { LOCALES, fieldHint, fieldLabel, microLabel, textArea, textInput, inputBase } from "./studioStyles";

interface NewStoryFormProps {
  token: string;
  onCreated: (story: AdminStory) => void;
  onCancel: () => void;
}

/** Lowercase letters, digits and dashes — the shape every built-in set id has. */
const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/['’]/g, "")
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

const SLUG = /^[a-z0-9][a-z0-9-]*$/;

/**
 * Three questions, top to bottom: which level, what students read, and how
 * many parts. The internal name and the set id are worked out from the
 * English title and only need touching when the guess is wrong.
 */
const NewStoryForm = ({ token, onCreated, onCancel }: NewStoryFormProps) => {
  const { t } = useTranslation("studio");
  const itemWord = "part";
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  // What students read, per language. Asked for here so a new story never
  // reaches the shelf showing its internal name in place of a title.
  const [title, setTitle] = useState({ en: "", ru: "" });
  const [description, setDescription] = useState({ en: "", ru: "" });
  // Both follow the English title until someone types in them.
  const [storyName, setStoryName] = useState<string | null>(null);
  const [storyId, setStoryId] = useState<string | null>(null);
  const [characterIcon, setCharacterIcon] = useState("📖");
  const [totalParts, setTotalParts] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const nameValue = storyName ?? (title.en.trim() || title.ru.trim());
  const idValue = storyId ?? slugify(nameValue);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!nameValue.trim()) return setError(t("newSet.errNoTitle"));
    if (!SLUG.test(idValue)) return setError(t("newSet.errBadId"));
    if (!validPartCount(totalParts)) return setError(t(`newSet.errCount.${itemWord}`, { max: MAX_PARTS }));

    setSubmitting(true);
    try {
      const story = await createStory(token, {
        difficulty,
        storyId: idValue,
        storyName: nameValue.trim(),
        // The pre-localization fallback, for anything that still reads it.
        description: description.en.trim() || description.ru.trim(),
        localized: {
          title: { en: title.en.trim(), ru: title.ru.trim() },
          description: { en: description.en.trim(), ru: description.ru.trim() },
        },
        characterIcon: characterIcon.trim() || "📖",
        totalParts,
      });
      onCreated(story);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("newSet.errCreate"));
    } finally {
      setSubmitting(false);
    }
  };

  const step = "flex h-11 w-11 items-center justify-center rounded-[3px] border border-line-strong bg-white text-ink hover:border-ink disabled:opacity-40";
  const sectionCard = "rounded-card border border-line bg-white p-5 sm:p-6";
  const sectionTitle = "mb-4 flex items-baseline gap-3 text-lg font-bold text-ink";
  const number = "font-mono text-sm font-semibold text-dim";

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-5" aria-label={t("newSet.titleStory")}>
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-ink">{t("newSet.titleStory")}</h2>
        <p className="mt-1 text-sm text-dim">{t("newSet.intro")}</p>
      </div>

      <section className={sectionCard} aria-labelledby="new-level">
        <h3 id="new-level" className={sectionTitle}><span className={number}>1</span>{t("newSet.level")}</h3>
        <Segmented
          label={t("newSet.difficulty")}
          name="difficulty"
          value={difficulty}
          onChange={setDifficulty}
          options={[
            { value: "easy", label: t("common.difficulty.easy") },
            { value: "medium", label: t("common.difficulty.medium") },
            { value: "hard", label: t("common.difficulty.hard") },
          ]}
        />
      </section>

      <section className={sectionCard} aria-labelledby="new-text">
        <h3 id="new-text" className={sectionTitle}><span className={number}>2</span>{t("newSet.whatStudentsRead")}</h3>
        <div className="grid gap-5 md:grid-cols-2">
          {LOCALES.map(({ id }) => (
            <div key={id} className="min-w-0 space-y-4">
              <p className={microLabel}>{t(`common.languages.${id}`)}</p>
              <div>
                <label htmlFor={`new-title-${id}`} className={fieldLabel}>{t("newSet.title")}</label>
                <input id={`new-title-${id}`} type="text" value={title[id]}
                  onChange={(e) => setTitle((prev) => ({ ...prev, [id]: e.target.value }))} className={textInput} />
              </div>
              <div>
                <label htmlFor={`new-description-${id}`} className={fieldLabel}>{t("newSet.description")} <span className="font-normal text-dim">{t("newSet.optional")}</span></label>
                <textarea id={`new-description-${id}`} rows={2} value={description[id]}
                  onChange={(e) => setDescription((d) => ({ ...d, [id]: e.target.value }))} className={textArea} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={sectionCard} aria-labelledby="new-parts">
        <h3 id="new-parts" className={sectionTitle}><span className={number}>3</span>{t(`newSet.count.${itemWord}`)}</h3>
        <label htmlFor="new-count" className={fieldLabel}>{t("newSet.howMany")}</label>
        <div className="flex items-center gap-2">
          <button type="button" className={step} aria-label={t(`newSet.fewer.${itemWord}`)} disabled={totalParts <= 1}
            onClick={() => setTotalParts((n) => Math.max(1, n - 1))}><IoRemove aria-hidden="true" /></button>
          <input id="new-count" type="number" min={1} max={MAX_PARTS} step={1} value={totalParts}
            onChange={(e) => setTotalParts(Math.round(Number(e.target.value)) || 1)}
            aria-label={t("newSet.initialCount")} className={`${inputBase} w-20 text-center`} />
          <button type="button" className={step} aria-label={t(`newSet.more.${itemWord}`)} disabled={totalParts >= MAX_PARTS}
            onClick={() => setTotalParts((n) => Math.min(MAX_PARTS, n + 1))}><IoAdd aria-hidden="true" /></button>
        </div>
        <p className={fieldHint}>{t(`newSet.countHint.${itemWord}`, { max: MAX_PARTS })}</p>
      </section>

      <details className={`${sectionCard} group`} open={storyName !== null || storyId !== null}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <span>
            <span className="block text-base font-bold text-ink">{t("newSet.internal")}</span>
            <span className="block text-sm text-dim">
              {nameValue ? <>«{nameValue}» · <span className="font-mono">{idValue || "—"}</span></> : t("newSet.fromTitle")}
            </span>
          </span>
          <span className="text-sm font-semibold text-ink group-open:hidden">{t("newSet.change")}</span>
        </summary>
        <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <div>
            <label htmlFor="new-name" className={fieldLabel}>{t("newSet.internalName")}</label>
            <input id="new-name" type="text" value={nameValue} aria-label={t("newSet.internalName")}
              onChange={(e) => setStoryName(e.target.value)} className={textInput} />
            <p className={fieldHint}>{t("newSet.internalNameHint")}</p>
          </div>
          <div>
            <label htmlFor="new-id" className={fieldLabel}>{t("newSet.setId")}</label>
            <input id="new-id" type="text" value={idValue} aria-label={t("newSet.setId")}
              onChange={(e) => setStoryId(e.target.value.toLowerCase())} className={`${textInput} font-mono`} />
            <p className={fieldHint}>{t("newSet.setIdHint")}</p>
          </div>
          <div>
            <label htmlFor="new-icon" className={fieldLabel}>{t("newSet.icon")}</label>
            <input id="new-icon" type="text" value={characterIcon} aria-label={t("newSet.iconLabel")}
              onChange={(e) => setCharacterIcon(e.target.value)} className={`${inputBase} w-20 text-center`} />
            <p className={fieldHint}>{t("newSet.iconHint")}</p>
          </div>
        </div>
      </details>

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <p className="text-sm text-dim">
          <Trans t={t} i18nKey="newSet.summary" values={{ level: t(`common.difficulty.${difficulty}`), items: t("common.parts", { count: totalParts }) }} components={{ b: <span className="font-semibold text-ink" /> }} />
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className={buttonSecondary}>{t("common.cancel")}</button>
          <button type="submit" disabled={submitting} className={buttonPrimary}>{submitting ? t("newSet.creating") : t("newSet.create")}</button>
        </div>
      </div>
    </form>
  );
};

export default NewStoryForm;
