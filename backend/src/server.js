import app from "./app.js";
import { connectDB } from "./config/db.js";
import { config } from "./config/env.js";
import { startReconciliation } from "./jobs/reconcilePayments.js";
import {
  assertProvidersValid,
  assertPaymentsSafeForEnvironment,
  getProvider,
} from "./services/payments/index.js";

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

  app.listen(config.port, async () => {
    console.log(`Server is running on http://localhost:${config.port}`);
    console.log('🚀 Starting application...');
    // Background sweeps live here rather than in app.js: app.js builds the
    // request pipeline, server.js owns the process lifecycle. Also means
    // importing app.js in a test never starts a timer.
    startReconciliation();

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
}
start();
