import app from "./app.js";
import { connectDB } from "./config/db.js";
import { config } from "./config/env.js";
import { closeDb } from "./db/index.js";
import { startReconciliation } from "./jobs/reconcilePayments.js";
import {
  assertProvidersValid,
  assertPaymentsSafeForEnvironment,
  getProvider,
} from "./services/payments/index.js";

// Docker sends SIGTERM and waits 10 s before SIGKILL. In-flight requests get
// most of that; anything still open after it is cut so the process exits on
// its own terms rather than being killed mid-write.
const SHUTDOWN_GRACE_MS = 8_000;

// ── Process-level safety nets ───────────────────────────────────────────────
//
// Express 4 does not catch a rejected promise from an async handler, and Node
// 22's default for an unhandled rejection is to crash the process — taking
// every other student's request with it, for one route's missing try/catch.
// Logged instead: the request that caused it hangs or times out, the server
// stays up. A synchronous uncaught exception still exits (state may be
// corrupt), and Docker's restart policy brings the backend back.
process.on("unhandledRejection", (reason) => {
  console.error("[process] unhandled promise rejection:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("[process] uncaught exception, exiting:", error);
  process.exit(1);
});

async function start() {
  // Every registered driver satisfies the contract. Deliberately a hard throw
  // before the server ever listens: a driver missing parseCallback fails at the
  // first webhook otherwise, which is to say on a customer's payment rather than
  // on whoever wrote the driver.
  assertProvidersValid();

  await connectDB();

  // Needs config.payments and the driver together, so it cannot live in
  // config/env.js — env.js is what the driver registry reads. Refuses to run a
  // driver that moves no money in production, and says which driver is live
  // otherwise.
  assertPaymentsSafeForEnvironment();

  let reconcileTimer = null;

  const server = app.listen(config.port, async () => {
    console.log(`Server is running on http://localhost:${config.port}`);
    console.log("Starting application...");
    // Background sweeps live here rather than in app.js: app.js builds the
    // request pipeline, server.js owns the process lifecycle. Also means
    // importing app.js in a test never starts a timer.
    reconcileTimer = startReconciliation();

    // A real acquirer's retry queue survives its own restarts. The fake's has to
    // survive nodemon, or restarting the backend during a delivery delay strands
    // the payment — the exact failure the fake exists to let us rehearse.
    if (config.payments.enabled) {
      const driver = getProvider();
      if (typeof driver.resumePendingDeliveries === "function") {
        await driver
          .resumePendingDeliveries()
          .catch((error) =>
            console.error("[payments] resuming fake deliveries failed:", error.message)
          );
      }
    }
  });

  // The port is taken: almost always a second `npm run dev` still running from
  // another terminal. Under `tsx watch` both restart on every save and the one
  // that binds second dies here, so say that instead of an unhandled 'error'
  // event and a stack trace.
  server.on("error", (error) => {
    if (error.code !== "EADDRINUSE") throw error;
    console.error(
      `[server] Port ${config.port} is already in use — another backend is probably still running ` +
        `(a second "npm run dev"?). Stop it, then save any backend file to restart this one.`,
    );
    process.exit(1);
  });

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  //
  // Every deploy stops this container. Without a handler, SIGTERM killed the
  // process at once: requests mid-response were cut, and a transaction mid-way
  // (a purchase, a payment settlement, a quiz completion) was rolled back by
  // Postgres with the client never told. Now: stop accepting connections, let
  // the open ones finish, close the pool, exit.
  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[server] ${signal} received — finishing open requests, then exiting`);

    if (reconcileTimer) clearInterval(reconcileTimer);

    const forceExit = setTimeout(() => {
      console.error(`[server] requests still open after ${SHUTDOWN_GRACE_MS} ms — exiting anyway`);
      process.exit(1);
    }, SHUTDOWN_GRACE_MS);
    forceExit.unref();

    server.close(async () => {
      try {
        await closeDb();
      } catch (error) {
        console.error("[server] closing the database pool failed:", error.message);
      }
      console.log("[server] shut down cleanly");
      process.exit(0);
    });
    // Idle keep-alive sockets would otherwise hold server.close() open until
    // they time out on their own.
    server.closeIdleConnections?.();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

// A failed boot (database unreachable, a bad payments config) must still exit
// non-zero: the unhandledRejection logger above would otherwise leave a process
// that never listens, and Docker would not restart it.
start().catch((error) => {
  console.error("[server] failed to start:", error);
  process.exit(1);
});
