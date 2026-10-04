import { useEffect, useMemo, useState } from "react";
import { IoArrowDown, IoArrowUp, IoTrashOutline } from "react-icons/io5";
import {
  AdminStory,
  CastMember,
  saveStoryCast,
  uploadCastPortrait,
} from "../../../services/adminStoryServices";
import { themes } from "../../../modules/levelprogress/themes.levelprogress";
import { CastAvatar } from "../../../modules/cast/CastAvatar";

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

const LOCALES: { id: "en" | "ru"; label: string }[] = [
  { id: "en", label: "English" },
  { id: "ru", label: "Русский" },
];

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
const problemWith = (cast: CastMember[]): string => {
  const seen = new Set<string>();
  for (const [i, m] of cast.entries()) {
    const at = `Character ${i + 1}`;
    if (!m.name.en && !m.name.ru) return `${at} needs a name.`;
    if (!KEY_PATTERN.test(m.key)) return `${at}: the key must be lowercase letters, digits and dashes.`;
    if (seen.has(m.key)) return `${at}: the key "${m.key}" is already used.`;
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
  const baseline = useMemo(() => toDraft(story.cast), [story.cast]);
  const [draft, setDraft] = useState<DraftMember[]>(baseline);
  const [saving, setSaving] = useState(false);
  const [uploadingUid, setUploadingUid] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

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
  const problem = problemWith(cast);
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

  const add = () =>
    setDraft((d) => [
      ...d,
      {
        uid: nextUid++,
        key: "",
        keyEdited: false,
        name: { en: "", ru: "" },
        role: { en: "", ru: "" },
        bio: { en: "", ru: "" },
        imageUrl: null,
        firstPart: 1,
      },
    ]);

  const handlePortrait = async (member: DraftMember, file: File) => {
    const key = member.key.trim().toLowerCase();
    if (!KEY_PATTERN.test(key)) {
      setError("Give the character a name (or a key) before uploading a portrait — the key names the file.");
      return;
    }
    setError("");
    setUploadingUid(member.uid);
    try {
      const url = await uploadCastPortrait(token, story._id, key, file);
      update(member.uid, (m) => ({ ...m, imageUrl: url }));
      setNotice("Portrait uploaded — save the cast to put it on the page.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Portrait upload failed.");
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
      setNotice("Cast saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save the cast.");
    } finally {
      setSaving(false);
    }
  };

  const parts = Array.from({ length: story.totalParts }, (_, i) => i + 1);

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 max-w-2xl">
        Shown as a row of faces under the story title on the level page. A character stays a
        silhouette (&ldquo;part N&rdquo;) until the student reaches the part they first appear in.
        Order here is the order on the page.
      </p>

      {!story.published && (
        <div className="bg-white rounded-[3px] border border-gray-200 p-3 text-xs text-gray-600 max-w-2xl">
          This story is a draft, so students do not see its cast yet.
        </div>
      )}

      {draft.map((member, i) => {
        const shown = fromDraft([member])[0];
        const keyBad = shown.key !== "" && !KEY_PATTERN.test(shown.key);
        return (
          <div key={member.uid} className="bg-white rounded-[3px] border border-gray-200 p-3 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* As students will see it, once revealed. */}
              <CastAvatar
                card={{
                  key: shown.key || `new-${member.uid}`,
                  locked: false,
                  firstPart: shown.firstPart,
                  name: shown.name.en || shown.name.ru || "?",
                  role: "",
                  bio: "",
                  imageUrl: shown.imageUrl,
                }}
                accent={accent}
                size={56}
              />

              <label className="text-xs text-gray-500">
                Key
                <input
                  type="text"
                  value={member.key}
                  maxLength={40}
                  onChange={(e) => update(member.uid, (m) => ({ ...m, key: e.target.value, keyEdited: true }))}
                  placeholder="e.g. leo"
                  className={`ml-2 w-32 text-black px-2 py-1 border rounded-[3px] text-sm font-mono ${
                    keyBad ? "border-red-400" : "border-gray-300"
                  }`}
                />
              </label>

              <label className="text-xs text-gray-500">
                First appears in part
                <select
                  value={member.firstPart}
                  onChange={(e) => update(member.uid, (m) => ({ ...m, firstPart: Number(e.target.value) }))}
                  className="ml-2 text-black px-2 py-1 border border-gray-300 rounded-[3px] text-sm"
                >
                  {parts.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>

              <div className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(member.uid, -1)}
                  disabled={i === 0}
                  aria-label="Move up"
                  className="p-1.5 text-gray-500 hover:text-black disabled:opacity-30"
                >
                  <IoArrowUp />
                </button>
                <button
                  type="button"
                  onClick={() => move(member.uid, 1)}
                  disabled={i === draft.length - 1}
                  aria-label="Move down"
                  className="p-1.5 text-gray-500 hover:text-black disabled:opacity-30"
                >
                  <IoArrowDown />
                </button>
                <button
                  type="button"
                  onClick={() => setDraft((d) => d.filter((m) => m.uid !== member.uid))}
                  aria-label="Remove character"
                  className="p-1.5 text-red-500 hover:text-red-700"
                >
                  <IoTrashOutline />
                </button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {LOCALES.map(({ id, label }) => (
                <fieldset key={id} className="rounded-[3px] border border-gray-200 p-3 space-y-2 min-w-0">
                  <legend className="font-mono text-[11px] uppercase tracking-[0.18em] text-gray-500 px-1">
                    {label}
                  </legend>
                  <label className="block">
                    <span className="block text-xs text-gray-500 mb-1">Name</span>
                    <input
                      type="text"
                      value={member.name[id]}
                      maxLength={LIMITS.name}
                      onChange={(e) => setText(member.uid, "name", id, e.target.value)}
                      className="w-full text-black px-3 py-1.5 border border-gray-300 rounded-[3px] text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-xs text-gray-500 mb-1">
                      Role <span className="text-gray-400">— one line under the name</span>
                    </span>
                    <input
                      type="text"
                      value={member.role[id]}
                      maxLength={LIMITS.role}
                      onChange={(e) => setText(member.uid, "role", id, e.target.value)}
                      className="w-full text-black px-3 py-1.5 border border-gray-300 rounded-[3px] text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-xs text-gray-500 mb-1">
                      About <span className="text-gray-400">— {member.bio[id].length}/{LIMITS.bio}</span>
                    </span>
                    <textarea
                      value={member.bio[id]}
                      maxLength={LIMITS.bio}
                      onChange={(e) => setText(member.uid, "bio", id, e.target.value)}
                      rows={3}
                      className="w-full text-black px-3 py-1.5 border border-gray-300 rounded-[3px] text-sm"
                    />
                  </label>
                </fieldset>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="text-gray-500">Portrait:</span>
              <label className="cursor-pointer text-blue-600 underline">
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
                {uploadingUid === member.uid ? "Uploading…" : member.imageUrl ? "Replace" : "Upload"}
              </label>
              {story.coverUrl && member.imageUrl !== story.coverUrl && (
                <button
                  type="button"
                  onClick={() => update(member.uid, (m) => ({ ...m, imageUrl: story.coverUrl ?? null }))}
                  className="text-blue-600 underline"
                >
                  Use the story&rsquo;s card image
                </button>
              )}
              {member.imageUrl && (
                <button
                  type="button"
                  onClick={() => update(member.uid, (m) => ({ ...m, imageUrl: null }))}
                  className="text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              )}
              {!member.imageUrl && <span className="text-gray-400">none — shows the first letter</span>}
            </div>
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={add}
          disabled={draft.length >= LIMITS.members}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-[3px] hover:border-black disabled:opacity-40"
        >
          Add character{draft.length >= LIMITS.members ? ` (max ${LIMITS.members})` : ""}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          className="px-4 py-1.5 text-sm bg-black text-white rounded-[3px] disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save cast"}
        </button>
        {dirty && (
          <button
            type="button"
            onClick={() => {
              setDraft(baseline);
              setError("");
            }}
            className="text-sm text-gray-500 hover:text-black"
          >
            Discard changes
          </button>
        )}
      </div>

      {(error || (dirty && problem)) && <p className="text-sm text-red-600">{error || problem}</p>}
      {notice && !error && <p className="text-sm text-green-700">{notice}</p>}
    </div>
  );
};

export default CastEditor;
