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

// APPLIED to POST /api/admin/login (routes/admin.routes.js).
//
// The admin panel is gated by a single shared code word, so without a limiter
// that code word can be brute-forced at line speed, and a hit grants the Story
// Builder, the ban button and currency granting. This is the ceiling; code-word
// entropy (a long random ADMIN_CODES value, not a memorable word) is still the
// thing actually protecting the panel.
//
// skipSuccessfulRequests: an admin re-entering the panel legitimately is never
// locked out — only wrong guesses count against the budget. That is why 10 is
// safe here: it is 10 *failures* per 15 minutes, enough to absorb typos and
// avoid the friction that got this limiter removed once already, while still
// capping an attacker at 40 guesses/hour against one secret.
export const adminLoginLimiter = make("admin-login", 15 * MINUTE, 10, {
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

// ── Currency-minting endpoints ─────────────────────────────────────────────
// These two are keyed by USER, not IP. Both sit behind authenticateToken and
// both add coins, so the thing worth capping is "how much can one account mint"
// — an IP key would let one account mint freely from several networks, and
// would also lump a whole school computer lab into one bucket.
//
// keyGenerator can safely assume req.user because the limiter is mounted AFTER
// authenticateToken in progress.routes.js. The req.ip fallback only fires if
// that order is ever changed, and fails closed rather than throwing.
const byUser = (req) => (req.user?._id ? `u:${req.user._id}` : `ip:${req.ip}`);

// A repeat cycle is bounded by real audio playback — a segment has to actually
// play through two or three times before this fires. 200/hour is far above any
// genuine listening session and still 20x tighter than the global ceiling this
// endpoint used to sit behind. NOTE: this is a bound, not a fix. The endpoint
// still cannot verify that a repeat happened at all; that needs story/marker
// context from the client. See docs/improvement-backlog.md 0.3.
export const phraseRepeatLimiter = make("phrase-repeat", 60 * MINUTE, 200, {
  keyGenerator: byUser,
});

// One submission carries a whole vocab round (capped at MAX_WORDS_PER_SUBMISSION
// in the controller), so a legitimate student needs very few of these per hour.
export const vocabCompleteLimiter = make("vocab-complete", 60 * MINUTE, 60, {
  keyGenerator: byUser,
});

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
