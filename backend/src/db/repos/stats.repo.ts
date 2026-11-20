// db/repos/stats.repo.ts
//
// Read-only numbers about learners for the admin panel: one summary of
// everyone (GET /api/admin/stats) and a row of figures per player for the
// Players tab. Plain aggregate SQL over the tables that already exist; nothing
// here is stored, so nothing here can drift from what the app itself records.
//
// What the figures mean:
//   parts completed  entries in story_progress.completed_parts (a part counts
//                    once its quiz is passed; see progress.controller)
//   quizzes passed   progress_level_result rows marked completed
//   words learned    user_learned_word rows (the копилка)
//   listening time   users.total_listening_seconds, what the player reports
//   active           users.last_active_at, bumped by the heartbeat while the
//                    app is open (useHeartbeat), so "active in 7 days" means
//                    the app was open in that window, not that a part was done
//
// Days are Moscow days, like the streak (helpers/moscowDay.js).

import { sql } from "drizzle-orm";

import { db } from "../client.js";
import type { Tx } from "../client.js";

const DIFFICULTIES = ["easy", "medium", "hard"] as const;
type Difficulty = (typeof DIFFICULTIES)[number];

export interface LearnerSummary {
  users: {
    total: number;
    onboarded: number;
    banned: number;
    newLast7: number;
    newLast30: number;
    activeLast1: number;
    activeLast7: number;
    activeLast30: number;
  };
  learning: {
    learnersWithAPart: number;
    partsCompleted: number;
    quizzesPassed: number;
    wordsLearned: number;
    listeningSeconds: number;
    byDifficulty: Record<Difficulty, { learners: number; parts: number }>;
  };
  wallet: { bitAward: number; bitWord: number; bitPhrase: number };
  onboarding: {
    englishLevel: Record<string, number>;
    listeningExperience: Record<string, number>;
  };
  /** The last 30 Moscow days, oldest first, days without a sign-up included as 0. */
  signupsByDay: { day: string; count: number }[];
}

export interface PlayerFigures {
  partsCompleted: number;
  storiesStarted: number;
  quizzesPassed: number;
  wordsLearned: number;
  listeningSeconds: number;
  /** When the latest quiz was passed; null if none ever was. */
  lastPartAt: Date | null;
}

const n = (v: unknown) => Number(v ?? 0) || 0;

export async function learnerSummary(tx: Tx = db()): Promise<LearnerSummary> {
  // Sequential: each is one cheap aggregate, and a Tx must not be shared
  // across concurrent queries (see userDoc hydrate()).
  const users = (
    await tx.execute(sql`
      select
        count(*)                                                       as total,
        count(*) filter (where onboarded_at is not null)               as onboarded,
        count(*) filter (where banned)                                 as banned,
        count(*) filter (where created_at     > now() - interval '7 days')  as new_last_7,
        count(*) filter (where created_at     > now() - interval '30 days') as new_last_30,
        count(*) filter (where last_active_at > now() - interval '1 day')   as active_last_1,
        count(*) filter (where last_active_at > now() - interval '7 days')  as active_last_7,
        count(*) filter (where last_active_at > now() - interval '30 days') as active_last_30,
        coalesce(sum(total_listening_seconds), 0)                      as listening_seconds,
        coalesce(sum(bit_award), 0)                                    as bit_award,
        coalesce(sum(bit_word), 0)                                     as bit_word,
        coalesce(sum(bit_phrase), 0)                                   as bit_phrase
      from users
    `)
  ).rows[0] as Record<string, unknown>;

  const parts = (
    await tx.execute(sql`
      select difficulty,
             count(distinct user_id)                         as learners,
             coalesce(sum(cardinality(completed_parts)), 0)  as parts
      from story_progress
      where cardinality(completed_parts) > 0
      group by difficulty
    `)
  ).rows as { difficulty: string; learners: unknown; parts: unknown }[];

  const learnersWithAPart = (
    await tx.execute(sql`
      select count(distinct user_id) as n
      from story_progress
      where cardinality(completed_parts) > 0
    `)
  ).rows[0] as { n: unknown };

  const quizzes = (
    await tx.execute(sql`select count(*) as n from progress_level_result where completed`)
  ).rows[0] as { n: unknown };

  const words = (await tx.execute(sql`select count(*) as n from user_learned_word`)).rows[0] as {
    n: unknown;
  };

  const levels = (
    await tx.execute(sql`
      select coalesce(onboarding_english_level, 'none') as k, count(*) as n
      from users group by 1
    `)
  ).rows as { k: string; n: unknown }[];

  const experience = (
    await tx.execute(sql`
      select coalesce(onboarding_listening_experience, 'none') as k, count(*) as n
      from users group by 1
    `)
  ).rows as { k: string; n: unknown }[];

  const signups = (
    await tx.execute(sql`
      with days as (
        select generate_series(
          (now() at time zone 'Europe/Moscow')::date - 29,
          (now() at time zone 'Europe/Moscow')::date,
          interval '1 day'
        )::date as day
      )
      select to_char(days.day, 'YYYY-MM-DD') as day, count(u.id) as count
      from days
      left join users u on (u.created_at at time zone 'Europe/Moscow')::date = days.day
      group by days.day
      order by days.day
    `)
  ).rows as { day: string; count: unknown }[];

  const byDifficulty = Object.fromEntries(
    DIFFICULTIES.map((d) => {
      const row = parts.find((p) => p.difficulty === d);
      return [d, { learners: n(row?.learners), parts: n(row?.parts) }];
    }),
  ) as LearnerSummary["learning"]["byDifficulty"];

  const counts = (rows: { k: string; n: unknown }[]) =>
    Object.fromEntries(rows.map((r) => [r.k, n(r.n)]));

  return {
    users: {
      total: n(users.total),
      onboarded: n(users.onboarded),
      banned: n(users.banned),
      newLast7: n(users.new_last_7),
      newLast30: n(users.new_last_30),
      activeLast1: n(users.active_last_1),
      activeLast7: n(users.active_last_7),
      activeLast30: n(users.active_last_30),
    },
    learning: {
      learnersWithAPart: n(learnersWithAPart.n),
      partsCompleted: parts.reduce((sum, p) => sum + n(p.parts), 0),
      quizzesPassed: n(quizzes.n),
      wordsLearned: n(words.n),
      listeningSeconds: n(users.listening_seconds),
      byDifficulty,
    },
    wallet: { bitAward: n(users.bit_award), bitWord: n(users.bit_word), bitPhrase: n(users.bit_phrase) },
    onboarding: { englishLevel: counts(levels), listeningExperience: counts(experience) },
    signupsByDay: signups.map((s) => ({ day: s.day, count: n(s.count) })),
  };
}

/** Figures for a page of players, keyed by user id; every id asked for gets a row. */
export async function playerFigures(
  userIds: string[],
  tx: Tx = db(),
): Promise<Map<string, PlayerFigures>> {
  const out = new Map<string, PlayerFigures>();
  if (userIds.length === 0) return out;

  const ids = sql.join(
    userIds.map((id) => sql`${id}`),
    sql`, `,
  );
  const rows = (
    await tx.execute(sql`
      select u.id                                          as id,
             u.total_listening_seconds                     as listening_seconds,
             coalesce(sp.parts, 0)                         as parts,
             coalesce(sp.stories, 0)                       as stories,
             coalesce(q.passed, 0)                         as passed,
             q.last_at                                     as last_at,
             coalesce(w.words, 0)                          as words
      from users u
      left join (
        select user_id,
               sum(cardinality(completed_parts))           as parts,
               count(*)                                    as stories
        from story_progress
        where user_id in (${ids})
        group by user_id
      ) sp on sp.user_id = u.id
      left join (
        select p.user_id,
               count(*) filter (where r.completed)         as passed,
               max(r.completed_at)                         as last_at
        from progress p
        join progress_level_result r on r.progress_id = p.id
        where p.user_id in (${ids})
        group by p.user_id
      ) q on q.user_id = u.id
      left join (
        select user_id, count(*) as words
        from user_learned_word
        where user_id in (${ids})
        group by user_id
      ) w on w.user_id = u.id
      where u.id in (${ids})
    `)
  ).rows as Record<string, unknown>[];

  for (const r of rows) {
    out.set(String(r.id), {
      partsCompleted: n(r.parts),
      storiesStarted: n(r.stories),
      quizzesPassed: n(r.passed),
      wordsLearned: n(r.words),
      listeningSeconds: n(r.listening_seconds),
      lastPartAt: r.last_at ? new Date(r.last_at as string) : null,
    });
  }
  return out;
}
