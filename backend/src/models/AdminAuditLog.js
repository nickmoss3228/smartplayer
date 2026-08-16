// models/AdminAuditLog.js
// Append-only record of every mutating admin action — bans, currency grants,
// story edits/publishes, feedback deletions.
//
// Written by middleware/auditLog.js from a res.on("finish") listener, never
// from the controllers themselves; see that file for why that matters.

import mongoose from "mongoose";
import { config } from "../config/env.js";

const adminAuditLogSchema = new mongoose.Schema(
  {
    // ── Who ────────────────────────────────────────────────────────────────
    // `name` comes from the ADMIN_CODES map — it identifies which code word
    // was used, not a verified person. See config/env.js for the trade-off.
    actor: {
      name: { type: String, required: true },
      sessionId: { type: String, default: null }, // correlates one login session
      tokenIssuedAt: { type: Date, default: null },
    },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },

    // ── What ───────────────────────────────────────────────────────────────
    // Stable dotted label from the route table in middleware/auditLog.js,
    // e.g. "player.setBanned", "story.delete".
    action: { type: String, required: true },
    method: { type: String, required: true, enum: ["POST", "PUT", "PATCH", "DELETE"] },
    path: { type: String, required: true }, // originalUrl minus the query string

    // Which object was touched, when that's knowable from the URL or body.
    targetType: { type: String, default: null }, // "User" | "Story" | "Feedback"
    targetId: { type: String, default: null }, // String, not ObjectId: may be an email

    // ── Result ─────────────────────────────────────────────────────────────
    statusCode: { type: Number, required: true },
    outcome: {
      type: String,
      required: true,
      enum: ["success", "client_error", "server_error"],
    },
    durationMs: { type: Number, default: null },

    // Redacted, size-capped summary of the request body/query. NEVER contains
    // a code word, password, token, or file buffer — see summarizeBody() in
    // middleware/auditLog.js.
    summary: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  // Append-only, so updatedAt would always equal createdAt and just waste space.
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Retention. A single-field index serves sorts in BOTH directions, so this one
// index covers the default newest-first list view AND expiry — no separate
// { createdAt: -1 } needed.
//
// The trade-off is worth stating plainly: with a TTL you cannot answer "who
// deleted this story two years ago". For a single-operator learning app that's
// fine and it keeps the collection self-limiting; if the log ever becomes
// compliance-relevant, drop the TTL and archive instead.
//
// Note: changing expireAfterSeconds later needs a collMod — Mongoose will not
// modify an existing index's options on its own.
adminAuditLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: config.adminAuditTtlDays * 24 * 60 * 60 }
);
adminAuditLogSchema.index({ "actor.name": 1, createdAt: -1 });
adminAuditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
adminAuditLogSchema.index({ action: 1, createdAt: -1 });

export const AdminAuditLog = mongoose.model("AdminAuditLog", adminAuditLogSchema);
