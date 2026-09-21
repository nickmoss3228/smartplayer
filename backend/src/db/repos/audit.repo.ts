// db/repos/audit.repo.ts
//
// Append-only record of every mutating admin action, plus the feedback inbox.
// Two small tables that share a file because neither justifies its own.
//
// RETENTION: admin_audit_log had a Mongo TTL index. Postgres has none, so the
// replacement is the pg_cron job in db/migrations/manual/001. Nothing in this
// file expires anything — do not add a DELETE here and call it retention, or
// it will run on request threads.

import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "../client.js";
import { newId } from "../ids.js";
import { adminAuditLog, feedback } from "../schema.js";
import type { Tx } from "../client.js";
import type { AdminAuditLog, Feedback } from "../schema.js";

export interface AuditEntry {
  actorName: string;
  actorSessionId?: string | null;
  actorTokenIssuedAt?: Date | null;
  ip?: string | null;
  userAgent?: string | null;
  action: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  targetType?: string | null;
  /** May be an email, not only an id. Stored as text for that reason. */
  targetId?: string | null;
  statusCode: number;
  outcome: "success" | "client_error" | "server_error";
  durationMs?: number | null;
  summary?: unknown;
}

/**
 * Write one audit row.
 *
 * Called from a res.on("finish") listener, never from a controller — by then
 * the response is already sent, so a failure here must not be allowed to
 * propagate. The caller catches; this function does not swallow, because a
 * silent audit log is worse than a noisy one.
 */
export async function append(entry: AuditEntry, tx: Tx = db()): Promise<void> {
  await tx.insert(adminAuditLog).values({
    id: newId(),
    actorName: entry.actorName,
    actorSessionId: entry.actorSessionId ?? null,
    actorTokenIssuedAt: entry.actorTokenIssuedAt ?? null,
    ip: entry.ip ?? null,
    userAgent: entry.userAgent ?? null,
    action: entry.action,
    method: entry.method,
    path: entry.path,
    targetType: entry.targetType ?? null,
    targetId: entry.targetId ?? null,
    statusCode: entry.statusCode,
    outcome: entry.outcome,
    durationMs: entry.durationMs ?? null,
    summary: entry.summary ?? null,
  });
}

export interface AuditFilter {
  actorName?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
}

/** One page of the admin audit view, plus the total, in a single round trip. */
export async function page(
  filter: AuditFilter,
  offset: number,
  limit: number,
  tx: Tx = db(),
): Promise<{ rows: AdminAuditLog[]; total: number }> {
  const clauses = [];
  if (filter.actorName) clauses.push(eq(adminAuditLog.actorName, filter.actorName));
  if (filter.action) clauses.push(eq(adminAuditLog.action, filter.action));
  if (filter.targetType) clauses.push(eq(adminAuditLog.targetType, filter.targetType));
  if (filter.targetId) clauses.push(eq(adminAuditLog.targetId, filter.targetId));

  const rows = await tx
    .select({
      row: adminAuditLog,
      total: sql<number>`count(*) OVER ()`.mapWith(Number),
    })
    .from(adminAuditLog)
    .where(clauses.length ? and(...clauses) : undefined)
    .orderBy(desc(adminAuditLog.createdAt))
    .offset(offset)
    .limit(limit);

  return { rows: rows.map((r) => r.row), total: rows[0]?.total ?? 0 };
}

/** Powers the filter dropdown. Was AdminAuditLog.distinct("action"). */
export async function distinctActions(tx: Tx = db()): Promise<string[]> {
  const rows = await tx.selectDistinct({ action: adminAuditLog.action }).from(adminAuditLog);
  return rows.map((r) => r.action);
}

// ── feedback ────────────────────────────────────────────────────────────────

export async function createFeedback(
  name: string,
  message: string,
  tx: Tx = db(),
): Promise<Feedback> {
  const [row] = await tx.insert(feedback).values({ id: newId(), name, message }).returning();
  if (!row) throw new Error("[feedback] insert wrote no row");
  return row;
}

/**
 * Feedback, newest first, PAGED.
 *
 * The Mongo version fetched the whole collection unpaginated and unindexed,
 * which the improvement backlog flags: past roughly 32k rows the in-memory
 * sort limit aborts the query and the admin tab breaks permanently. The
 * feedback_created_idx index and this limit together retire that.
 */
export async function listFeedback(
  offset = 0,
  limit = 50,
  tx: Tx = db(),
): Promise<{ rows: Feedback[]; total: number }> {
  const rows = await tx
    .select({ row: feedback, total: sql<number>`count(*) OVER ()`.mapWith(Number) })
    .from(feedback)
    .orderBy(desc(feedback.createdAt))
    .offset(offset)
    .limit(limit);

  return { rows: rows.map((r) => r.row), total: rows[0]?.total ?? 0 };
}

export async function deleteFeedback(id: string, tx: Tx = db()): Promise<number> {
  const result = await tx.delete(feedback).where(eq(feedback.id, id));
  return result.rowCount ?? 0;
}
