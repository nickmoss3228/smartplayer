import { useEffect, useMemo, useState } from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { IoAddOutline, IoArrowDown, IoArrowUp, IoTrashOutline } from "react-icons/io5";
import {
  AdminStory,
  CastMember,
  saveStoryCast,
  uploadCastPortrait,
} from "../../../services/adminStoryServices";
import { themes } from "../../../modules/levelprogress/themes.levelprogress";
import { CastAvatar } from "../../../modules/cast/CastAvatar";
import { SaveBar } from "./studioUi";
import { LOCALES, fieldHint, fieldLabel, microLabel, smallButton, textArea, textInput, inputBase } from "./studioStyles";

/**
 * The story's characters — the row of faces on its level page, and the sheet
 * that opens from it. Each one is revealed to a student when they reach the
 * part the character first appears in; until then the page shows a silhouette
 * and "part N".
 *
 * Saved whole: the list is sent in this order and replaces what was there.
 */

// Mirrors CAST_LIMITS in backend/src/controllers/story.controller.js, which
// refuses anything longer; these just stop the admin typing past it.
const LIMITS = { members: 12, name: 40, role: 80, bio: 600 };
// Same rule as CAST_KEY_PATTERN in backend/src/db/repos/stories.repo.ts.
const KEY_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/;

const ACCEPTED = "image/jpeg,image/png,image/webp,image/avif,image/gif";

type Pair = { en: string; ru: string };

interface DraftMember {
  /** React's key only — the character's own `key` can be edited. */
  uid: number;
  key: string;
  /** Until the admin types a key, it follows the English name. */
  keyEdited: boolean;
  name: Pair;
  role: Pair;
  bio: Pair;
  imageUrl: string | null;
  firstPart: number;
}

let nextUid = 1;

const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

const toDraft = (cast: CastMember[] | undefined): DraftMember[] =>
  (cast ?? []).map((m) => ({
    uid: nextUid++,
    key: m.key,
    keyEdited: true,
    name: { ...m.name },
    role: { ...m.role },
    bio: { ...m.bio },
    imageUrl: m.imageUrl,
    firstPart: m.firstPart,
  }));

const trimPair = (p: Pair): Pair => ({ en: p.en.trim(), ru: p.ru.trim() });

const fromDraft = (draft: DraftMember[]): CastMember[] =>
  draft.map((m) => ({
    key: m.key.trim().toLowerCase(),
    name: trimPair(m.name),
    role: trimPair(m.role),
    bio: trimPair(m.bio),
    imageUrl: m.imageUrl,
    firstPart: m.firstPart,
  }));

/** What is wrong with the list as it stands, or "" — checked before saving. */
const problemWith = (cast: CastMember[], t: TFunction): string => {
  const seen = new Set<string>();
  for (const [i, m] of cast.entries()) {
    if (!m.name.en && !m.name.ru) return t("settings.cast.needsName", { n: i + 1 });
    if (!KEY_PATTERN.test(m.key)) return t("settings.cast.badKey", { n: i + 1 });
    if (seen.has(m.key)) return t("settings.cast.dupKey", { n: i + 1, key: m.key });
    seen.add(m.key);
  }
  return "";
};

interface CastEditorProps {
  token: string;
  story: AdminStory;
  onStoryUpdated: (story: AdminStory) => void;
}

const CastEditor = ({ token, story, onStoryUpdated }: CastEditorProps) => {
  const { t } = useTranslation("studio");
  const baseline = useMemo(() => toDraft(story.cast), [story.cast]);
  const [draft, setDraft] = useState<DraftMember[]>(baseline);
  const [saving, setSaving] = useState(false);
  const [uploadingUid, setUploadingUid] = useState<number | null>(null);
  const [error, setError] = useState("");
  // Which note sits by the Save bar. A key, not a sentence, so it survives a language switch.
  const [notice, setNotice] = useState<"" | "saved" | "portrait">("");
  const [openUid, setOpenUid] = useState<number | null>(null);

  // A save hands back a new story, and with it a new baseline.
  useEffect(() => {
    setDraft(baseline);
  }, [baseline]);
  useEffect(() => {
    setError("");
    setNotice("");
  }, [story._id]);

  const cast = fromDraft(draft);
  const dirty = JSON.stringify(cast) !== JSON.stringify(fromDraft(baseline));
  const problem = problemWith(cast, t);
  const accent = themes[story.difficulty]?.accent ?? themes.easy.accent;

  const update = (uid: number, change: (m: DraftMember) => DraftMember) =>
    setDraft((d) => d.map((m) => (m.uid === uid ? change(m) : m)));

  const setText = (uid: number, field: "name" | "role" | "bio", locale: "en" | "ru", value: string) =>
    update(uid, (m) => {
      const next = { ...m, [field]: { ...m[field], [locale]: value } };
      // The key follows the English name until someone edits it by hand.
      if (field === "name" && locale === "en" && !m.keyEdited) next.key = slugify(value);
      return next;
    });

  const move = (uid: number, by: -1 | 1) =>
    setDraft((d) => {
      const i = d.findIndex((m) => m.uid === uid);
      const j = i + by;
      if (i < 0 || j < 0 || j >= d.length) return d;
      const next = [...d];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const add = () => {
    const uid = nextUid++;
    setDraft((d) => [
      ...d,
      {
        uid,
        key: "",
        keyEdited: false,
        name: { en: "", ru: "" },
        role: { en: "", ru: "" },
        bio: { en: "", ru: "" },
        imageUrl: null,
        firstPart: 1,
      },
    ]);
    setOpenUid(uid);
  };

  const handlePortrait = async (member: DraftMember, file: File) => {
    const key = member.key.trim().toLowerCase();
    if (!KEY_PATTERN.test(key)) {
      setError(t("settings.cast.portraitNeedsKey"));
      return;
    }
    setError("");
    setUploadingUid(member.uid);
    try {
      const url = await uploadCastPortrait(token, story._id, key, file);
      update(member.uid, (m) => ({ ...m, imageUrl: url }));
      setNotice("portrait");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("settings.cast.portraitFailed"));
    } finally {
      setUploadingUid(null);
    }
  };

  const save = async () => {
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      onStoryUpdated(await saveStoryCast(token, story._id, cast));
      setNotice("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("settings.cast.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const parts = Array.from({ length: story.totalParts }, (_, i) => i + 1);
  const full = draft.length >= LIMITS.members;
  const addButton = (
    <button type="button" onClick={add} disabled={full} className={smallButton}>
      <IoAddOutline aria-hidden="true" />
      {full ? t("settings.cast.addCharacterMax", { max: LIMITS.members }) : t("settings.cast.addCharacter")}
    </button>
  );
  const iconButton =
    "inline-flex min-h-11 min-w-11 items-center justify-center text-dim hover:text-ink disabled:opacity-30 disabled:hover:text-dim";

  return (
    <div>
      {!story.published && <p className="mb-3 text-xs text-dim">{t("settings.cast.draftNote")}</p>}

      {draft.length === 0 ? (
        <div className="rounded-tile border border-dashed border-line-strong p-6 text-center">
          <p className="mb-3 text-sm text-dim">{t("settings.cast.empty")}</p>
          {addButton}
        </div>
      ) : (
        <>
          <ul className="divide-y divide-line rounded-tile border border-line">
            {draft.map((member, i) => {
              const shown = fromDraft([member])[0];
              const keyBad = shown.key !== "" && !KEY_PATTERN.test(shown.key);
              const open = openUid === member.uid;
              const toggle = () => setOpenUid(open ? null : member.uid);
              const hasName = shown.name.en || shown.name.ru;
              const uploading = uploadingUid === member.uid;
              const avatarCard = {
                key: shown.key || `new-${member.uid}`,
                locked: false,
                firstPart: shown.firstPart,
                name: shown.name.en || shown.name.ru || "?",
                role: "",
                bio: "",
                imageUrl: shown.imageUrl,
              };
              return (
                <li key={member.uid}>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                    <button
                      type="button"
                      onClick={toggle}
                      aria-expanded={open}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      {/* As students will see it, once revealed. */}
                      <CastAvatar card={avatarCard} accent={accent} size={44} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-ink">
                          {hasName ? (
                            <>
                              {shown.name.en}
                              {shown.name.en && shown.name.ru && " "}
                              {shown.name.ru && <span className="font-normal text-dim">{shown.name.ru}</span>}
                            </>
                          ) : (
                            t("settings.cast.unnamed")
                          )}
                        </span>
                        {shown.role.en && <span className="block truncate text-xs text-dim">{shown.role.en}</span>}
                      </span>
                    </button>
                    <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-xs text-dim">
                      {t("settings.cast.fromPart", { n: shown.firstPart })}
                    </span>
                    <div className="ml-auto flex shrink-0 items-center">
                      <button
                        type="button"
                        onClick={() => move(member.uid, -1)}
                        disabled={i === 0}
                        aria-label={t("settings.cast.moveUp")}
                        className={iconButton}
                      >
                        <IoArrowUp aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(member.uid, 1)}
                        disabled={i === draft.length - 1}
                        aria-label={t("settings.cast.moveDown")}
                        className={iconButton}
                      >
                        <IoArrowDown aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDraft((d) => d.filter((m) => m.uid !== member.uid));
                          if (open) setOpenUid(null);
                        }}
                        aria-label={t("settings.cast.removeCharacter")}
                        className={`${iconButton} hover:text-red-700`}
                      >
                        <IoTrashOutline aria-hidden="true" />
                      </button>
                      <button type="button" onClick={toggle} className={`${smallButton} ml-1`}>
                        {open ? t("common.done") : t("common.edit")}
                      </button>
                    </div>
                  </div>

                  {open && (
                    <div className="space-y-5 bg-room/50 p-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        {LOCALES.map(({ id }) => (
                          <div key={id} className="min-w-0 space-y-3">
                            <h4 className={microLabel}>{t(`common.languages.${id}`)}</h4>
                            <label className="block">
                              <span className={fieldLabel}>{t("settings.cast.name")}</span>
                              <input
                                type="text"
                                value={member.name[id]}
                                maxLength={LIMITS.name}
                                onChange={(e) => setText(member.uid, "name", id, e.target.value)}
                                className={textInput}
                              />
                            </label>
                            <label className="block">
                              <span className={fieldLabel}>{t("settings.cast.role")}</span>
                              <input
                                type="text"
                                value={member.role[id]}
                                maxLength={LIMITS.role}
                                onChange={(e) => setText(member.uid, "role", id, e.target.value)}
                                className={textInput}
                              />
                              <span className={`${fieldHint} block`}>{t("settings.cast.roleHint")}</span>
                            </label>
                            <label className="block">
                              <span className={fieldLabel}>{t("settings.cast.about")}</span>
                              <textarea
                                value={member.bio[id]}
                                maxLength={LIMITS.bio}
                                onChange={(e) => setText(member.uid, "bio", id, e.target.value)}
                                rows={3}
                                className={textArea}
                              />
                              <span className={`${fieldHint} block`}>
                                {member.bio[id].length}/{LIMITS.bio}
                              </span>
                            </label>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
                        <label className="block">
                          <span className={fieldLabel}>{t("settings.cast.firstPart")}</span>
                          <select
                            value={member.firstPart}
                            onChange={(e) => update(member.uid, (m) => ({ ...m, firstPart: Number(e.target.value) }))}
                            className={`${inputBase} w-auto`}
                          >
                            {parts.map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                        </label>

                        <div>
                          <span className={fieldLabel}>{t("settings.cast.portrait")}</span>
                          <div className="flex flex-wrap items-center gap-3">
                            <CastAvatar card={avatarCard} accent={accent} size={64} />
                            <div className="flex flex-wrap items-center gap-2">
                              <label
                                className={`${smallButton} cursor-pointer has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-45`}
                              >
                                <input
                                  type="file"
                                  accept={ACCEPTED}
                                  className="sr-only"
                                  disabled={uploadingUid !== null}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) void handlePortrait(member, file);
                                    e.target.value = "";
                                  }}
                                />
                                {uploading ? t("common.uploading") : member.imageUrl ? t("common.replace") : t("common.upload")}
                              </label>
                              {story.coverUrl && member.imageUrl !== story.coverUrl && (
                                <button
                                  type="button"
                                  onClick={() => update(member.uid, (m) => ({ ...m, imageUrl: story.coverUrl ?? null }))}
                                  className={smallButton}
                                >
                                  {t("settings.cast.useCard")}
                                </button>
                              )}
                              {member.imageUrl && (
                                <button
                                  type="button"
                                  onClick={() => update(member.uid, (m) => ({ ...m, imageUrl: null }))}
                                  className={smallButton}
                                >
                                  {t("common.remove")}
                                </button>
                              )}
                            </div>
                          </div>
                          {!member.imageUrl && (
                            <p className={fieldHint}>{t("settings.cast.portraitHint")}</p>
                          )}
                        </div>
                      </div>

                      <details>
                        <summary className="cursor-pointer text-sm font-semibold text-ink">{t("settings.cast.advanced")}</summary>
                        <label className="mt-3 block max-w-xs">
                          <span className={fieldLabel}>{t("settings.cast.key")}</span>
                          <input
                            type="text"
                            value={member.key}
                            maxLength={40}
                            onChange={(e) => update(member.uid, (m) => ({ ...m, key: e.target.value, keyEdited: true }))}
                            placeholder={t("settings.cast.keyPlaceholder")}
                            className={`${textInput} font-mono ${keyBad ? "!border-red-400" : ""}`}
                          />
                          <span className={`${fieldHint} block`}>
                            {t("settings.cast.keyHint")}
                          </span>
                        </label>
                      </details>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="mt-3">{addButton}</div>
        </>
      )}

      <div className="mt-5 space-y-2 border-t border-line pt-4">
        {notice === "portrait" && (
          <p className="text-xs text-dim">{t("settings.cast.portraitUploaded")}</p>
        )}
        <SaveBar
          dirty={dirty}
          saving={saving}
          saved={notice === "saved"}
          error={error || (dirty ? problem : "")}
          onSave={save}
          onDiscard={() => {
            setDraft(baseline);
            setError("");
          }}
          saveLabel={t("settings.cast.save")}
        />
      </div>
    </div>
  );
};

export default CastEditor;
