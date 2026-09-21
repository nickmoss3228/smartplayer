// db/repos/stories.repo.ts
//
// DB-backed stories from the admin Story Builder, and the two identity-keyed
// side tables (markers, visibility) that deliberately outlive them.
//
// ── The aggregate ──────────────────────────────────────────────────────────
//
// A Story in Mongo was one document three levels deep:
//
//   story -> parts[] -> { vocabulary[], phrasalVerbs[], quiz[], timeMarkers[] }
//
// and story.controller.js edited it by mutating the document and calling
// save(). Here it is five tables, so a save is a transaction. `replaceParts`
// below does the whole thing as delete-then-insert inside one transaction,
// which is the honest translation of "save() replaced the array wholesale" —
// and, unlike save(), cannot leave a story half-written if the process dies.
//
// The volume makes this affordable: ~16 stories, ≤20 parts each, ≤10 quiz
// questions per part. Nothing here needs to be clever.

import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { db } from "../client.js";
import { newId } from "../ids.js";
import {
  partMarkers,
  story,
  storyPart,
  storyPartMarker,
  storyPartQuiz,
  storyPartVocab,
  storyVisibility,
} from "../schema.js";
import type { Tx } from "../client.js";
import type { Difficulty, Story } from "../schema.js";

// ── The shape the Story Builder and the player both speak ───────────────────
//
// Deliberately the SAME shape the Mongoose document had, so controllers and the
// frontend contract do not change with the storage. The mapping between this
// and the five tables lives here and nowhere else.

export interface TimeMarker {
  time: number;
  label?: string;
  color?: string;
}

export interface VocabEntry {
  word: string;
  definition?: string;
  audioKey: string;
  audioUrl?: string | null;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  referenceTime?: number;
  audio?: { fast: string | null; slow: string | null };
}

export interface StoryPartInput {
  partNumber: number;
  title?: string;
  audioUrl?: string | null;
  helpAudio?: string[];
  comicUrl?: string | null;
  timeMarkers?: TimeMarker[];
  vocabulary?: VocabEntry[];
  phrasalVerbs?: VocabEntry[];
  quiz?: QuizQuestion[];
}

export interface StoryAggregate extends Story {
  parts: Required<StoryPartInput>[];
}

// ── Reads ───────────────────────────────────────────────────────────────────

export async function findByIdentity(
  difficulty: Difficulty,
  storyId: string,
  tx: Tx = db(),
): Promise<Story | null> {
  const [row] = await tx
    .select()
    .from(story)
    .where(and(eq(story.difficulty, difficulty), eq(story.storyId, storyId)));
  return row ?? null;
}

/**
 * A PUBLISHED story by slug. The player-facing reads all go through this: a
 * draft must never shadow the built-in static version of a story, so an
 * unpublished row is invisible here (see helpers/storyLookup.js).
 */
export async function findPublishedByIdentity(
  difficulty: Difficulty,
  storyId: string,
  tx: Tx = db(),
): Promise<Story | null> {
  const [row] = await tx
    .select()
    .from(story)
    .where(and(eq(story.difficulty, difficulty), eq(story.storyId, storyId), eq(story.published, true)));
  return row ?? null;
}

/**
 * A published story with all of its parts, vocab, quiz and markers.
 *
 * Returns null for a `contentSource: 'builtin'` row. Such a row is a CATALOG
 * entry — it prices leo/maya/daniel and carries the title an admin edited —
 * but its audio, comics and quizzes still live in src/assets and quizData.js.
 * Handing back its (empty) parts would blank the story: comic pages gone,
 * quizzes gone. Null sends every caller to the static files, which is where
 * that content actually is. See helpers/storyLookup.js.
 */
export async function loadPublishedAggregate(
  difficulty: Difficulty,
  storyId: string,
  tx: Tx = db(),
): Promise<StoryAggregate | null> {
  const head = await findPublishedByIdentity(difficulty, storyId, tx);
  if (!head || head.contentSource !== "db") return null;
  return loadAggregate(head.id, tx);
}

export async function findByPk(id: string, tx: Tx = db()): Promise<Story | null> {
  const [row] = await tx.select().from(story).where(eq(story.id, id));
  return row ?? null;
}

export async function list(
  options: { difficulty?: Difficulty; publishedOnly?: boolean } = {},
  tx: Tx = db(),
): Promise<Story[]> {
  const filters = [];
  if (options.difficulty) filters.push(eq(story.difficulty, options.difficulty));
  if (options.publishedOnly) filters.push(eq(story.published, true));

  return tx
    .select()
    .from(story)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(asc(story.storyId));
}

/**
 * Load a story with everything hanging off it.
 *
 * Four queries rather than one giant join: joining parts to three independent
 * child collections multiplies rows (10 vocab x 10 quiz x 8 markers = 800 rows
 * for one part) and then needs de-duplicating in JavaScript. Four small
 * indexed reads assembled in memory is both faster and comprehensible.
 */
export async function loadAggregate(id: string, tx: Tx = db()): Promise<StoryAggregate | null> {
  const head = await findByPk(id, tx);
  if (!head) return null;

  const parts = await tx
    .select()
    .from(storyPart)
    .where(eq(storyPart.storyPk, id))
    .orderBy(asc(storyPart.partNumber));

  const partIds = parts.map((p) => p.id);
  if (partIds.length === 0) return { ...head, parts: [] };

  const vocabQuery = () =>
    tx
      .select()
      .from(storyPartVocab)
      .where(inArray(storyPartVocab.partPk, partIds))
      .orderBy(asc(storyPartVocab.ordinal));
  const quizQuery = () =>
    tx
      .select()
      .from(storyPartQuiz)
      .where(inArray(storyPartQuiz.partPk, partIds))
      .orderBy(asc(storyPartQuiz.ordinal));
  const markerQuery = () =>
    tx
      .select()
      .from(storyPartMarker)
      .where(inArray(storyPartMarker.partPk, partIds))
      .orderBy(asc(storyPartMarker.ordinal));

  // Concurrent on the pool, sequential inside a transaction. A transaction is
  // ONE connection, and overlapping queries on a single pg client are
  // deprecated (removed in pg@9) — this path runs inside mutateStory's lock.
  const [vocabRows, quizRows, markerRows] =
    tx === db()
      ? await Promise.all([vocabQuery(), quizQuery(), markerQuery()])
      : [await vocabQuery(), await quizQuery(), await markerQuery()];

  const byPart = <T extends { partPk: string }>(rows: T[], partPk: string) =>
    rows.filter((r) => r.partPk === partPk);

  return {
    ...head,
    parts: parts.map((part) => ({
      partNumber: part.partNumber,
      title: part.title,
      audioUrl: part.audioUrl,
      helpAudio: part.helpAudio,
      comicUrl: part.comicUrl,
      timeMarkers: byPart(markerRows, part.id).map((m) => ({
        time: m.time,
        label: m.label,
        color: m.color,
      })),
      vocabulary: byPart(vocabRows, part.id)
        .filter((v) => v.kind === "vocabulary")
        .map(toVocabEntry),
      phrasalVerbs: byPart(vocabRows, part.id)
        .filter((v) => v.kind === "phrasal")
        .map(toVocabEntry),
      quiz: byPart(quizRows, part.id).map((q) => ({
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        referenceTime: q.referenceTime,
        audio: { fast: q.audioFast, slow: q.audioSlow },
      })),
    })),
  };
}

function toVocabEntry(row: {
  word: string;
  definition: string;
  audioKey: string;
  audioUrl: string | null;
}): VocabEntry {
  return {
    word: row.word,
    definition: row.definition,
    audioKey: row.audioKey,
    audioUrl: row.audioUrl,
  };
}

/**
 * Every vocabulary key the DB knows about — the anti-fraud catalogue.
 *
 * Was `Story.distinct("parts.vocabulary.audioKey")`, a distinct over a doubly
 * nested array. Now an index-only scan of one column. Keep the 5-minute cache
 * and stampede collapse in helpers/vocabKeyCatalog.js: this is cheap, but it
 * runs on a request path and cheap is not free.
 */
export async function distinctVocabKeys(
  kind: "vocabulary" | "phrasal",
  tx: Tx = db(),
): Promise<string[]> {
  const rows = await tx
    .selectDistinct({ audioKey: storyPartVocab.audioKey })
    .from(storyPartVocab)
    .where(eq(storyPartVocab.kind, kind));
  return rows.map((r) => r.audioKey);
}

// ── Writes ──────────────────────────────────────────────────────────────────

export async function upsertHead(
  input: Omit<Story, "id" | "createdAt" | "updatedAt"> & { id?: string },
  tx: Tx = db(),
): Promise<Story> {
  const { id: providedId, ...values } = input;

  const [row] = await tx
    .insert(story)
    .values({ id: providedId ?? newId(), ...values })
    .onConflictDoUpdate({
      target: [story.difficulty, story.storyId],
      set: { ...values, updatedAt: new Date() },
    })
    .returning();

  if (!row) throw new Error("[stories] upsertHead wrote no row");
  return row;
}

/**
 * Replace every part of a story, and everything hanging off those parts.
 *
 * MUST run in a transaction — pass one in. The delete and the re-insert are
 * not independently meaningful, and a crash between them leaves a published
 * story with no content at all.
 *
 * The child rows go with the parts by ON DELETE CASCADE, so this deletes one
 * level and the database handles the rest.
 */
export async function replaceParts(
  storyPk: string,
  parts: readonly StoryPartInput[],
  tx: Tx,
): Promise<void> {
  await tx.delete(storyPart).where(eq(storyPart.storyPk, storyPk));
  if (parts.length === 0) return;

  const partRows = parts.map((part) => ({
    id: newId(),
    storyPk,
    partNumber: part.partNumber,
    title: part.title ?? "",
    audioUrl: part.audioUrl ?? null,
    helpAudio: part.helpAudio ?? [],
    comicUrl: part.comicUrl ?? null,
  }));

  await tx.insert(storyPart).values(partRows);

  const vocabRows = parts.flatMap((part, i) => {
    const partPk = partRows[i]!.id;
    const of = (entries: readonly VocabEntry[] | undefined, kind: "vocabulary" | "phrasal") =>
      (entries ?? []).map((entry, ordinal) => ({
        id: newId(),
        partPk,
        kind,
        ordinal,
        word: entry.word,
        definition: entry.definition ?? "",
        audioKey: entry.audioKey,
        audioUrl: entry.audioUrl ?? null,
      }));
    return [...of(part.vocabulary, "vocabulary"), ...of(part.phrasalVerbs, "phrasal")];
  });

  const quizRows = parts.flatMap((part, i) =>
    (part.quiz ?? []).map((q, ordinal) => ({
      id: newId(),
      partPk: partRows[i]!.id,
      ordinal,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      referenceTime: q.referenceTime ?? 0,
      audioFast: q.audio?.fast ?? null,
      audioSlow: q.audio?.slow ?? null,
    })),
  );

  const markerRows = parts.flatMap((part, i) =>
    (part.timeMarkers ?? []).map((m, ordinal) => ({
      id: newId(),
      partPk: partRows[i]!.id,
      ordinal,
      time: m.time,
      label: m.label ?? "",
      color: m.color ?? "red",
    })),
  );

  if (vocabRows.length) await tx.insert(storyPartVocab).values(vocabRows);
  if (quizRows.length) await tx.insert(storyPartQuiz).values(quizRows);
  if (markerRows.length) await tx.insert(storyPartMarker).values(markerRows);
}

export async function setPublished(
  id: string,
  published: boolean,
  tx: Tx = db(),
): Promise<number> {
  const result = await tx
    .update(story)
    .set({ published, updatedAt: new Date() })
    .where(eq(story.id, id));
  return result.rowCount ?? 0;
}

export async function remove(id: string, tx: Tx = db()): Promise<number> {
  // Parts and their children cascade. part_markers and story_visibility do
  // NOT — they have no foreign key here precisely so that deleting a story
  // cannot destroy hand-placed markers. See the schema.
  const result = await tx.delete(story).where(eq(story.id, id));
  return result.rowCount ?? 0;
}

// ── part_markers: the durable copy ──────────────────────────────────────────

/**
 * Remember a part's markers.
 *
 * An empty list is stored as readily as a full one: clearing markers is a real
 * edit, and refusing to record it would resurrect deleted markers on the next
 * import. Protection against ACCIDENTAL loss belongs at the restore end, which
 * only ever fills a gap — see helpers/markerRestore.js.
 */
export async function rememberMarkers(
  difficulty: Difficulty,
  storyId: string,
  partNumber: number,
  timeMarkers: readonly TimeMarker[] = [],
  tx: Tx = db(),
): Promise<void> {
  await tx
    .insert(partMarkers)
    .values({ difficulty, storyId, partNumber, timeMarkers: [...timeMarkers] })
    .onConflictDoUpdate({
      target: [partMarkers.difficulty, partMarkers.storyId, partMarkers.partNumber],
      set: { timeMarkers: [...timeMarkers], updatedAt: new Date() },
    });
}

/** Previously saved markers for a story, as partNumber -> markers. */
export async function recallMarkers(
  difficulty: Difficulty,
  storyId: string,
  tx: Tx = db(),
): Promise<Record<number, TimeMarker[]>> {
  const rows = await tx
    .select()
    .from(partMarkers)
    .where(and(eq(partMarkers.difficulty, difficulty), eq(partMarkers.storyId, storyId)));

  return Object.fromEntries(rows.map((r) => [r.partNumber, r.timeMarkers]));
}

// ── story_visibility ────────────────────────────────────────────────────────

export async function setHidden(
  difficulty: Difficulty,
  storyId: string,
  hidden: boolean,
  tx: Tx = db(),
): Promise<void> {
  await tx
    .insert(storyVisibility)
    .values({ difficulty, storyId, hidden })
    .onConflictDoUpdate({
      target: [storyVisibility.difficulty, storyVisibility.storyId],
      set: { hidden, updatedAt: new Date() },
    });
}

/**
 * Slugs hidden for a difficulty.
 *
 * An absent row means visible, so a new story appears without needing a row,
 * and losing this table makes everything visible rather than making the app
 * look empty.
 */
export async function hiddenStoryIds(
  difficulty: Difficulty,
  tx: Tx = db(),
): Promise<string[]> {
  const rows = await tx
    .select({ storyId: storyVisibility.storyId })
    .from(storyVisibility)
    .where(and(eq(storyVisibility.difficulty, difficulty), eq(storyVisibility.hidden, true)));
  return rows.map((r) => r.storyId);
}

// ── The Story Builder's JSON ────────────────────────────────────────────────
//
// The admin Story Builder and the public story endpoints were written against
// the Mongoose document: `_id`, and `localized` as a nested object. These map
// the tables to exactly that shape and back, so the frontend contract does not
// move with the storage.

const STORY_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

type FullPart = Required<StoryPartInput>;

export interface StoryJson {
  _id: string;
  difficulty: string;
  storyId: string;
  storyName: string;
  description: string;
  localized: { title: { en: string; ru: string }; description: { en: string; ru: string } };
  characterIcon: string;
  totalParts: number;
  category: string | null;
  coverUrl: string | null;
  published: boolean;
  // Catalog. See the `story` table in schema.ts for what each one decides.
  contentSource: "db" | "builtin";
  character: string;
  paid: boolean;
  ready: boolean;
  priceMinor: number | null;
  freeParts: number | null;
  previewSeconds: number | null;
  createdAt: Date;
  updatedAt: Date;
  parts?: FullPart[];
}

export interface StoryWriteInput {
  difficulty: Difficulty;
  storyId: string;
  storyName: string;
  description?: string;
  localized?: { title?: { en?: string; ru?: string }; description?: { en?: string; ru?: string } };
  characterIcon?: string;
  totalParts: number;
  category?: string | null;
  coverUrl?: string | null;
  published?: boolean;
  // Catalog — all optional, all defaulted in headColumns().
  contentSource?: "db" | "builtin";
  character?: string;
  paid?: boolean;
  ready?: boolean;
  priceMinor?: number | null;
  freeParts?: number | null;
  previewSeconds?: number | null;
  parts: StoryPartInput[];
}

export function toStoryJson(head: Story, parts?: FullPart[]): StoryJson {
  return {
    _id: head.id,
    difficulty: head.difficulty,
    storyId: head.storyId,
    storyName: head.storyName,
    description: head.description,
    localized: {
      title: { en: head.titleEn, ru: head.titleRu },
      description: { en: head.descriptionEn, ru: head.descriptionRu },
    },
    characterIcon: head.characterIcon,
    totalParts: head.totalParts,
    category: head.category,
    coverUrl: head.coverUrl,
    published: head.published,
    contentSource: head.contentSource as "db" | "builtin",
    character: head.character,
    paid: head.paid,
    ready: head.ready,
    priceMinor: head.priceMinor,
    freeParts: head.freeParts,
    previewSeconds: head.previewSeconds,
    createdAt: head.createdAt,
    updatedAt: head.updatedAt,
    ...(parts ? { parts } : {}),
  };
}

/**
 * Update ONLY the catalog columns of a story, by slug.
 *
 * Deliberately narrow. The seed scripts need to fix a story's pricing without
 * going near its content, its text, or its content_source — a story whose parts
 * were imported into the builder must keep them, and an upsert of the whole row
 * would rewrite fields the admin panel owns.
 */
export async function setCatalogFields(
  difficulty: Difficulty,
  storyId: string,
  fields: Partial<{
    character: string;
    paid: boolean;
    ready: boolean;
    priceMinor: number | null;
    freeParts: number | null;
    previewSeconds: number | null;
    published: boolean;
  }>,
  tx: Tx = db(),
): Promise<Story | null> {
  if (Object.keys(fields).length === 0) return null;
  const [row] = await tx
    .update(story)
    .set({ ...fields, updatedAt: new Date() })
    .where(and(eq(story.difficulty, difficulty), eq(story.storyId, storyId)))
    .returning();
  return row ?? null;
}

/**
 * Every story the catalog should price, in the shape config/priceCatalog.js's
 * buildCatalog() expects.
 *
 * `published` is the switch: an unpublished story is a draft, and a draft is
 * not in the catalog at all — not sold, not listed, and (because accessFor
 * refuses what the catalog does not know) not playable. That is what makes the
 * Story Builder's publish toggle the single act that puts a story in front of
 * learners.
 */
export async function catalogRows(tx: Tx = db()): Promise<
  {
    key: string;
    character: string;
    parts: number;
    category: string;
    ready: boolean;
    paid: boolean;
    priceMinor: number | null;
    freeParts: number | null;
    previewSeconds: number | null;
  }[]
> {
  const rows = await tx
    .select({
      difficulty: story.difficulty,
      storyId: story.storyId,
      character: story.character,
      totalParts: story.totalParts,
      category: story.category,
      ready: story.ready,
      paid: story.paid,
      priceMinor: story.priceMinor,
      freeParts: story.freeParts,
      previewSeconds: story.previewSeconds,
    })
    .from(story)
    .where(eq(story.published, true))
    .orderBy(asc(story.difficulty), asc(story.storyId));

  return rows.map((r) => ({
    key: `${r.difficulty}/${r.storyId}`,
    character: r.character,
    parts: r.totalParts,
    category: r.category ?? "general",
    ready: r.ready,
    paid: r.paid,
    priceMinor: r.priceMinor,
    freeParts: r.freeParts,
    previewSeconds: r.previewSeconds,
  }));
}

function headColumns(input: StoryWriteInput | StoryJson) {
  return {
    difficulty: input.difficulty as Difficulty,
    storyId: input.storyId,
    storyName: input.storyName,
    description: input.description ?? "",
    titleEn: input.localized?.title?.en ?? "",
    titleRu: input.localized?.title?.ru ?? "",
    descriptionEn: input.localized?.description?.en ?? "",
    descriptionRu: input.localized?.description?.ru ?? "",
    characterIcon: input.characterIcon ?? "📖",
    totalParts: input.totalParts,
    category: input.category ?? null,
    coverUrl: input.coverUrl ?? null,
    published: Boolean(input.published),
    // Catalog. `??` throughout, never `||`: 0 is a legitimate freeParts (a
    // story that gives nothing away) and would otherwise collapse to "derive
    // it", quietly handing out the length-based 3 free parts instead.
    contentSource: input.contentSource ?? "db",
    character: input.character ?? "",
    paid: input.paid ?? true,
    ready: input.ready ?? true,
    priceMinor: input.priceMinor ?? null,
    freeParts: input.freeParts ?? null,
    previewSeconds: input.previewSeconds ?? null,
  };
}

/**
 * The trims and defaults Mongoose applied on save (`trim: true` on part title,
 * vocab word and audioKey). Applied on every write so a Builder save and an
 * import store the same thing.
 */
function normalizeParts(parts: readonly StoryPartInput[]): StoryPartInput[] {
  const vocab = (list: readonly VocabEntry[] | undefined) =>
    (list ?? []).map((entry) => ({
      word: String(entry.word ?? "").trim(),
      definition: entry.definition ?? "",
      audioKey: String(entry.audioKey ?? "").trim(),
      audioUrl: entry.audioUrl ?? null,
    }));

  return parts.map((part) => ({
    partNumber: part.partNumber,
    title: typeof part.title === "string" ? part.title.trim() : "",
    audioUrl: part.audioUrl ?? null,
    helpAudio: part.helpAudio ?? [],
    comicUrl: part.comicUrl ?? null,
    timeMarkers: part.timeMarkers ?? [],
    vocabulary: vocab(part.vocabulary),
    phrasalVerbs: vocab(part.phrasalVerbs),
    quiz: part.quiz ?? [],
  }));
}

/** One story with its parts, as JSON; null for a malformed or unknown id. */
export async function loadStoryJson(id: unknown, tx: Tx = db()): Promise<StoryJson | null> {
  if (typeof id !== "string" || !STORY_UUID.test(id)) return null;
  const aggregate = await loadAggregate(id, tx);
  return aggregate ? toStoryJson(aggregate, aggregate.parts) : null;
}

/** Story heads (no parts), newest first — the Builder list and the public roster. */
export async function listStoryJson(
  options: { difficulty?: string; publishedOnly?: boolean } = {},
  tx: Tx = db(),
): Promise<StoryJson[]> {
  const filters = [];
  if (options.difficulty) filters.push(eq(story.difficulty, options.difficulty));
  if (options.publishedOnly) filters.push(eq(story.published, true));

  const rows = await tx
    .select()
    .from(story)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(sql`${story.createdAt} DESC`);
  return rows.map((row) => toStoryJson(row));
}

/** Create a story and all of its parts in one transaction. */
export async function createStoryWithParts(input: StoryWriteInput): Promise<StoryJson> {
  return db().transaction(async (tx) => {
    const id = newId();
    await tx.insert(story).values({ id, ...headColumns(input) });
    await replaceParts(id, normalizeParts(input.parts), tx);
    const created = await loadStoryJson(id, tx);
    if (!created) throw new Error("[stories] created story could not be reloaded");
    return created;
  });
}

/** What a mutation returns to stop without writing: `{ halt: <anything> }`. */
export type StoryMutationResult = void | { halt: unknown };

/**
 * Load a story, let `mutation` change it in place, and write it back — all in
 * one transaction holding the story row.
 *
 * This is the Postgres stand-in for "find the document, edit it, save()". The
 * row lock is the part that matters: a Builder save replaces the story's parts
 * wholesale, so two admins saving different parts at the same moment would
 * otherwise overwrite each other's work. With the lock the second save waits,
 * then starts from the first one's result.
 *
 * A mutation that returns `{ halt }` writes nothing, and that value is handed
 * back — which is how a handler refuses (a missing part, a story that cannot be
 * published yet) from inside the transaction.
 *
 * @returns `{ story }` after a write, `{ halt }` after a refusal, or null when
 *   there is no such story.
 */
export async function mutateStory(
  id: unknown,
  mutation: (story: StoryJson & { parts: FullPart[] }) => StoryMutationResult | Promise<StoryMutationResult>,
): Promise<{ story: StoryJson } | { halt: unknown } | null> {
  if (typeof id !== "string" || !STORY_UUID.test(id)) return null;

  return db().transaction(async (tx) => {
    const [locked] = await tx.select({ id: story.id }).from(story).where(eq(story.id, id)).for("update");
    if (!locked) return null;

    const current = await loadStoryJson(id, tx);
    if (!current) return null;
    const editable = current as StoryJson & { parts: FullPart[] };

    const outcome = await mutation(editable);
    if (outcome && typeof outcome === "object" && "halt" in outcome) {
      return { halt: outcome.halt };
    }

    await tx
      .update(story)
      .set({ ...headColumns(editable), updatedAt: new Date() })
      .where(eq(story.id, id));
    await replaceParts(id, normalizeParts(editable.parts), tx);

    const saved = await loadStoryJson(id, tx);
    if (!saved) throw new Error("[stories] saved story could not be reloaded");
    return { story: saved };
  });
}
