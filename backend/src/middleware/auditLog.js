// middleware/auditLog.js
// Records every mutating admin action from a res.on("finish") listener rather
// than from inside the 14 controllers that perform them. Three reasons, and
// the first is the decisive one:
//
//  1. Four handlers in admin.controller.js have no try/catch, and Express 4
//     does not catch async rejections. An inline `await AdminAuditLog.create()`
//     in one of those would be one more un-awaited throw that hangs the
//     request until the client gives up. Logging after the response has
//     already been flushed cannot affect it at all.
//  2. One mount point stays correct when a 15th admin endpoint is added.
//  3. The real status code is only known once the response has finished.
//
// Known gap: "finish" does not fire if the client aborts mid-flight, so an
// aborted mutation goes unlogged even if the DB write landed. Accepted for now.

import { AdminAuditLog } from "../models/AdminAuditLog.js";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const REDACT_KEY = /code|password|token|secret|authorization/i;
const MAX_STRING = 200;
const MAX_SERIALIZED_BYTES = 2048;

function redactValue(value, depth = 0) {
  if (value === null || value === undefined) return value;
  if (Buffer.isBuffer(value)) return "[binary]";
  if (Array.isArray(value)) return { _array: value.length }; // vocab/quiz payloads can be huge
  if (typeof value === "string") {
    return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value;
  }
  if (typeof value === "object") {
    if (depth >= 2) return "[object]";
    const out = {};
    for (const [key, nested] of Object.entries(value)) {
      out[key] = REDACT_KEY.test(key) ? "[redacted]" : redactValue(nested, depth + 1);
    }
    return out;
  }
  return value; // number | boolean
}

export function summarizeBody(body) {
  if (!body || typeof body !== "object") return null;
  const redacted = redactValue(body);
  try {
    if (JSON.stringify(redacted).length > MAX_SERIALIZED_BYTES) {
      return { _truncated: true, keys: Object.keys(body).slice(0, 20) };
    }
  } catch {
    return { _unserializable: true };
  }
  return redacted;
}

// Route table — regexes run against originalUrl with the query string stripped.
// Adding a route here is optional: an unmatched mutating admin request still
// gets logged, just under the generic "admin.unknown" label.
const ROUTES = [
  { m: "POST",   re: /^\/api\/admin\/login$/,                                        action: "admin.login" },
  { m: "POST",   re: /^\/api\/admin\/grant-currency$/,                               action: "player.grantCurrency", target: (_m, b) => ({ type: "User", id: b?.userId ?? b?.email ?? null }) },
  { m: "PATCH",  re: /^\/api\/admin\/players\/([^/]+)\/ban$/,                        action: "player.setBanned",       target: (m) => ({ type: "User", id: m[1] }) },
  { m: "POST",   re: /^\/api\/admin\/stories$/,                                      action: "story.create" },
  { m: "POST",   re: /^\/api\/admin\/stories\/import$/,                              action: "story.import" },
  { m: "PATCH",  re: /^\/api\/admin\/stories\/([^/]+)\/publish$/,                    action: "story.setPublished",     target: (m) => ({ type: "Story", id: m[1] }) },
  { m: "POST",   re: /^\/api\/admin\/stories\/([^/]+)\/parts$/,                      action: "story.addPart",          target: (m) => ({ type: "Story", id: m[1] }) },
  { m: "POST",   re: /^\/api\/admin\/stories\/([^/]+)\/parts\/(\d+)\/upload$/,       action: "story.uploadAsset",      target: (m) => ({ type: "Story", id: m[1] }) },
  { m: "PATCH",  re: /^\/api\/admin\/stories\/([^/]+)\/parts\/(\d+)\/markers$/,      action: "story.saveMarkers",      target: (m) => ({ type: "Story", id: m[1] }) },
  { m: "PUT",    re: /^\/api\/admin\/stories\/([^/]+)\/parts\/(\d+)\/vocabulary$/,   action: "story.saveVocabulary",   target: (m) => ({ type: "Story", id: m[1] }) },
  { m: "PUT",    re: /^\/api\/admin\/stories\/([^/]+)\/parts\/(\d+)\/phrasal-verbs$/, action: "story.savePhrasalVerbs", target: (m) => ({ type: "Story", id: m[1] }) },
  { m: "PUT",    re: /^\/api\/admin\/stories\/([^/]+)\/parts\/(\d+)\/quiz$/,         action: "story.saveQuiz",         target: (m) => ({ type: "Story", id: m[1] }) },
  // These two must stay BELOW the more specific /stories/:id/... patterns
  // above, or "/stories/abc/publish" would match /^\/stories\/([^/]+)$/ first.
  { m: "PATCH",  re: /^\/api\/admin\/stories\/([^/]+)$/,                             action: "story.updateMeta",       target: (m) => ({ type: "Story", id: m[1] }) },
  { m: "DELETE", re: /^\/api\/admin\/stories\/([^/]+)$/,                             action: "story.delete",           target: (m) => ({ type: "Story", id: m[1] }) },
  // Lives under /api/feedback, not /api/admin — the one admin action outside
  // the admin surface. Mounting this middleware globally at /api is what makes
  // covering it free.
  { m: "DELETE", re: /^\/api\/feedback\/([^/]+)$/,                                   action: "feedback.delete",        target: (m) => ({ type: "Feedback", id: m[1] }) },
];

function describe(method, path, body) {
  for (const route of ROUTES) {
    if (route.m !== method) continue;
    const match = path.match(route.re);
    if (!match) continue;
    const target = route.target?.(match, body) ?? {};
    return {
      action: route.action,
      targetType: target.type ?? null,
      targetId: target.id != null ? String(target.id) : null,
    };
  }
  // Fail open, not silent: an endpoint added without a route-table entry is
  // still recorded, just without a friendly label.
  return { action: "admin.unknown", targetType: null, targetId: null };
}

export function auditAdminAction(req, res, next) {
  if (!MUTATING.has(req.method)) return next();
  if (req._auditAttached) return next(); // guard against a double mount
  req._auditAttached = true;

  const startedAt = Date.now();
  // Snapshot now rather than inside the listener: express.json() has already
  // run at this point, and snapshotting is immune to a handler mutating
  // req.body before the response finishes.
  const bodySnapshot = summarizeBody(req.body);

  res.on("finish", () => {
    const path = req.originalUrl.split("?")[0];
    const isAdminLogin = req.method === "POST" && path === "/api/admin/login";

    // req.admin is set by adminAuth. Its absence is exactly how the PUBLIC
    // POST /api/feedback is excluded — it shares a router with the admin-only
    // DELETE /api/feedback/:id, so method+path alone wouldn't be enough.
    // Login is the one exception: it runs before any admin identity exists,
    // and failed attempts are the most interesting rows in the whole log.
    if (!req.admin && !isAdminLogin) return;

    const { action, targetType, targetId } = describe(req.method, path, req.body);
    const status = res.statusCode;

    // Multipart uploads: req.body is empty at snapshot time (multer runs after
    // this middleware) and req.file.buffer must never be serialized into Mongo.
    const summary = req.file
      ? {
          file: {
            name: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
          },
          query: summarizeBody(req.query),
        }
      : { body: bodySnapshot, query: summarizeBody(req.query) };

    AdminAuditLog.create({
      actor:
        req.admin ?? {
          // A failed login has no identity by definition; a successful one is
          // attributed by the next request it makes.
          name: isAdminLogin && status < 400 ? "(login)" : "(anonymous)",
          sessionId: null,
          tokenIssuedAt: null,
        },
      ip: req.ip,
      userAgent: req.headers["user-agent"]?.slice(0, 200) ?? null,
      action,
      method: req.method,
      path,
      targetType,
      targetId,
      statusCode: status,
      outcome: status < 400 ? "success" : status < 500 ? "client_error" : "server_error",
      durationMs: Date.now() - startedAt,
      summary,
    }).catch((error) => {
      // Never surface an audit failure to the client — the response was sent
      // before this ran, so there is nothing left to fail into.
      console.error("auditAdminAction: failed to write audit row:", error.message);
    });
  });

  next();
}
