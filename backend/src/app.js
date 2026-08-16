import express from "express";
import { corsMiddleware } from "./middleware/cors.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import { auditAdminAction } from "./middleware/auditLog.js";
import routes from "./routes/index.js";

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

// Broad per-IP ceiling for the whole API. Per-endpoint limits live in the
// route files. Sits above express.json() so a flood is rejected before any
// body parsing happens.
app.use("/api", apiLimiter);

app.use(express.json()); // parses JSON request bodies
app.use(express.urlencoded({ extended: true })); // parses URL-encoded bodies

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

  res.status(500).json({
    error: "Something went wrong on our end.",
    message: "Something went wrong on our end.",
  });
});

app._router.stack.forEach((middleware) => {
  if (middleware.route) {
    console.log('Route:', middleware.route.path);
  } else if (middleware.name === 'router') {
    middleware.handle.stack.forEach((handler) => {
      if (handler.route) {
        console.log('Route:', handler.route.path);
      }
    });
  }
});

export default app;