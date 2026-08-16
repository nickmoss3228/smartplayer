// middleware/rateLimit.js
// Per-IP throttling for the endpoints an unauthenticated caller can hammer.
//
// Keying is by req.ip, which is only trustworthy because app.js sets
// `trust proxy` to 2 — read the comment there before changing anything here.
//
// Store: the library's default in-memory MemoryStore. That's the right call
// at this scale for two reasons. We run a single replica (docker-compose.yml),
// so shared counters across processes buy nothing, and a Mongo-backed store
// would add a DB round-trip to every request on the hottest path — including
// the global limiter below. Memory is bounded without a sweeper because
// MemoryStore keeps two Maps and discards the older one wholesale at each
// window boundary. If this ever scales past one replica:
// `npm i rate-limit-redis` and pass `store:` into make() — that option is
// already the seam.
//
// Counters reset on deploy. Acceptable: an attacker can't trigger our deploys.

import rateLimit from "express-rate-limit";

const MINUTE = 60 * 1000;

// The codebase is split on error shape — admin/story/feedback controllers
// return { error }, auth/password/progress return { message }. Sending both
// means every existing frontend catch block surfaces the throttle text with
// no changes, and `code` gives the ones we do update something stable to
// branch on for a localized message.
const limitHandler = (label) => (req, res, _next, options) => {
  const retryAfterSeconds = Math.ceil(options.windowMs / 1000);
  const text = "Too many requests. Please try again later.";

  res.setHeader("Retry-After", String(retryAfterSeconds));
  console.warn(`[ratelimit] ${label} ip=${req.ip} path=${req.originalUrl}`);

  res.status(429).json({
    error: text,
    message: text,
    code: "RATE_LIMITED",
    retryAfterSeconds,
  });
};

const make = (label, windowMs, max, extra = {}) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: "draft-7", // RateLimit + RateLimit-Policy
    legacyHeaders: false, // drop the deprecated X-RateLimit-* set
    handler: limitHandler(label),
    ...extra,
  });

// Strictest tier. A single shared code word with an unlimited guess budget was
// the worst-exposed surface in the app. skipSuccessfulRequests means an admin
// who legitimately re-enters the panel several times in a session is never
// locked out — only wrong guesses count.
export const adminLoginLimiter = make("admin-login", 15 * MINUTE, 5, {
  skipSuccessfulRequests: true,
});

// Costs real money and IO per call (a Resend send plus a user lookup), so
// unlike the login tiers this counts successes too — the cost is incurred
// either way, and it doubles as anti-mailbomb protection for the recipient.
export const passwordResetLimiter = make("password-reset", 60 * MINUTE, 3);

// Credential-stuffing surface.
export const loginLimiter = make("login", 15 * MINUTE, 10, {
  skipSuccessfulRequests: true,
});
export const signupLimiter = make("signup", 60 * MINUTE, 5);

// Spam surface — an unmoderated row straight into Mongo.
export const feedbackLimiter = make("feedback", 60 * MINUTE, 5);

// Public quiz endpoints (guests take quizzes before signing up). Generous:
// a student legitimately fires one check-answer per question.
export const publicQuizLimiter = make("public-quiz", 1 * MINUTE, 60);

// Broad default for everything under /api. Sized against real client
// behaviour: useHeartbeat polls every 45s (~20 req/15min/user) and
// ProgressContext fans out 3 requests on mount, so 1000/15min leaves headroom
// for roughly 20 concurrent users sharing one NAT/CGNAT egress IP — a school
// computer lab, which is exactly this app's audience.
export const apiLimiter = make("api", 15 * MINUTE, 1000);
