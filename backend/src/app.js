import express from "express";
import helmet from "helmet";
import { corsMiddleware } from "./middleware/cors.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import { auditAdminAction } from "./middleware/auditLog.js";
import routes from "./routes/index.js";
import { webhookRoutes } from "./routes/payments.routes.js";

const app = express();

// In production the request path is Caddy -> nginx -> here. nginx.conf sets
// `X-Forwarded-For $proxy_add_x_forwarded_for` and Caddy's reverse_proxy
// appends the peer IP, so there are exactly 2 trusted hops in front of us.
//
// Do NOT use `true`. That trusts the LEFT-most X-Forwarded-For entry, which
// the client fully controls — anyone could rotate a fake IP per request and
// walk straight through every rate limit below. A numeric count skips only
// the proxies that actually exist and documents the topology at the same
// time. (express-rate-limit v7 also refuses to start with `true`.)
app.set("trust proxy", 2);

// Logging middleware comes 1st to log all requests.
// ip/xff are logged on purpose: if the trust-proxy hop count above is ever
// wrong, every user collapses into one rate-limit bucket. Seeing a real
// public IP here rather than a 172.x container address is the check.
// helmet was a dependency for a long time without ever being imported, so the
// package.json looked hardened while the running app sent none of these.
//
// Scope, so this is not mistaken for more than it is: THIS PROCESS SERVES JSON.
// The SPA's HTML comes from nginx, so the headers below apply to API responses
// only. They are still worth having (nosniff, HSTS, no framing, no referrer
// leakage, and X-Powered-By stops advertising Express), but the CSP that would
// actually blunt an XSS against the player — the thing that matters while the
// session token lives in localStorage — has to be set on the origin that
// serves index.html. nginx.conf currently sets no security headers at all.
app.use(
  helmet({
    // A CSP on a JSON body governs nothing, so the only useful policy here is
    // the maximally restrictive one. It applies solely if a browser is pointed
    // straight at an API URL, and it cannot affect fetch() consumers.
    contentSecurityPolicy: {
      useDefaults: false,
      directives: { "default-src": ["'none'"], "frame-ancestors": ["'none'"] },
    },
    // Local dev calls this API cross-origin (:5173 -> :3000). CORP targets
    // no-cors subresource embedding and does not gate CORS fetches, but the
    // same-origin default would be a lie about how this service is used.
    crossOriginResourcePolicy: { policy: "cross-origin" },
    // COEP would force every cross-origin response the FRONTEND loads to opt
    // in, the Yandex audio bucket included. Not this service's decision.
    crossOriginEmbedderPolicy: false,
  })
);

app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()} - ${req.method} ${req.url} ip=${req.ip} xff=${
      req.headers["x-forwarded-for"] ?? "-"
    }`
  );
  next();
});

// corsMiddleware MUST stay above the limiter. A 429 emitted without an
// Access-Control-Allow-Origin header is reported by the browser as a CORS
// failure, so the frontend never sees the status and can't show "too many
// attempts" at all. Its OPTIONS short-circuit also means preflights never
// consume rate-limit quota — that's intended, don't "fix" it.
app.use(corsMiddleware);

// ── The payment webhook, mounted BEFORE everything below it ────────────────
//
// One mount, three problems solved, and the position is not a style choice:
//
//   above apiLimiter    — acquirers retry webhooks in bursts, and a 429 reads
//                         to them as a failed delivery. A throttled webhook
//                         eventually strands a payment the customer has made.
//   above express.json  — express.raw keeps the exact bytes. An acquirer that
//                         signs its notifications needs them to verify an HMAC,
//                         and they settle an argument with one either way.
//   above auditAdminAction — it is not an admin action.
//
// It carries NO JWT: this is server-to-server, and requiring one would mean the
// acquirer gets a 401 while the buyer never receives what they paid for.
// Authentication is the driver's job — see parseCallback in
// services/payments/index.js, and the per-payment token in
// helpers/callbackToken.js that every driver gets for free.
//
// :driver is in the path so a stale URL from a previously configured acquirer
// 404s instead of being fed to the current one's parser, which would report it
// as a forgery and bury the real cause.
app.use(
  "/api/payments/:driver/webhook",
  express.raw({ type: "*/*", limit: "64kb" }),
  webhookRoutes
);

// Broad per-IP ceiling for the whole API. Per-endpoint limits live in the
// route files. Sits above express.json() so a flood is rejected before any
// body parsing happens.
app.use("/api", apiLimiter);

// Explicit rather than implied. 100kb is what Express defaults to anyway; the
// point is that the ceiling is now a stated decision sitting next to the rate
// limiter, so raising it for one endpoint is a visible change rather than a
// silent inheritance.
app.use(express.json({ limit: "100kb" })); // parses JSON request bodies
app.use(express.urlencoded({ extended: true, limit: "100kb" })); // URL-encoded

// Add this root route handler
app.get('/', (req, res) => {
  res.json({ 
    message: 'Express server is running!',
    version: '1.0.0',
    endpoints: {
      auth: '/api/signup, /api/login, /api/logout, /api/validate-token',
      progress: '/api/progress/:difficulty, /api/progress/complete, /api/progress/overview',
      user: '/api/user/profile',
      password: '/api/request-reset, /api/reset'
    }
  });
});

// auditAdminAction is mounted globally rather than per-router on purpose —
// see middleware/auditLog.js. It attaches a res.on("finish") listener before
// adminAuth runs, then reads req.admin (set by adminAuth) once the response
// has already been sent.
app.use("/api", auditAdminAction, routes);
// app.use('/api/progress', progressRoutes);

// Error handling middleware.
// Returns JSON, not text: every frontend call site parses the body as JSON,
// so a text/plain "Something broke!" surfaces as an unhelpful parse error
// instead of the actual failure. Both `error` and `message` are sent because
// the codebase is split on which key it reads.
app.use((err, req, res, next) => {
  console.error(`Error: ${err.message}`);
  console.error(err.stack);

  // A handler that already started streaming a response can't be given a new
  // status — hand back to Express's default handler to close the socket.
  if (res.headersSent) return next(err);

  // body-parser's own refusals — malformed JSON, a body over the 100kb limit —
  // carry a 4xx `status` and an `expose` flag. They are the client's fault, so
  // answering them with a 500 would page someone about a typo in a curl call.
  if (err.expose && Number.isInteger(err.status) && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ error: err.message, message: err.message });
  }

  res.status(500).json({
    error: "Something went wrong on our end.",
    message: "Something went wrong on our end.",
  });
});

export default app;