// test/api/sms-limits.test.js — how phone auth fails when SMS is not set up
// (the state staging would be in today), and the rate limits that stand
// between these endpoints and an SMS bill.
//
// Its own file on purpose: node --test runs each file in its own process, so
// flipping the rate limiters and the SMS config here cannot leak into the
// other suites. Every limiter keys on the client IP, and every request here
// comes from 127.0.0.1, so the ORDER of the tests below matters.

import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";

// The harness MUST be the first project import — see its header.
import { api, freshIdentity, signupBody, smsSentTo, startServer, stopServer } from "./harness.js";
import { config } from "../../src/config/env.js";

before(startServer);
after(stopServer);

async function userExists(username) {
  const { eq } = await import("drizzle-orm");
  const { db, schema } = await import("./harness.js");
  const rows = await db().select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.username, username));
  return rows.length > 0;
}

describe("SMS not configured", () => {
  const original = structuredClone(config.sms);
  const originalEnv = config.nodeEnv;
  beforeEach(() => {
    config.sms = structuredClone(original);
    config.nodeEnv = originalEnv;
  });
  after(() => {
    config.sms = original;
    config.nodeEnv = originalEnv;
  });

  it("smsaero without credentials: signup answers 503 and leaves no account behind", async () => {
    config.sms.provider = "smsaero";
    config.sms.smsaero.email = undefined;
    config.sms.smsaero.apiKey = undefined;

    const id = freshIdentity();
    const res = await api("POST", "/api/signup", { body: signupBody(id) });
    assert.equal(res.status, 503);
    assert.equal(res.body.code, "SMS_NOT_CONFIGURED");
    assert.equal(await userExists(id.username), false, "a failed first SMS must not burn the username");
  });

  it("the console provider is refused when NODE_ENV=production", async () => {
    config.nodeEnv = "production";
    const id = freshIdentity();
    const res = await api("POST", "/api/signup", { body: signupBody(id) });
    assert.equal(res.status, 503);
    assert.equal(res.body.code, "SMS_PROVIDER_UNSUPPORTED");
    assert.equal(smsSentTo(id.phoneNumber).length, 0);
    assert.equal(await userExists(id.username), false);
  });

  it("an unknown provider name is a 503, not a 500", async () => {
    config.sms.provider = "carrier-pigeon";
    const res = await api("POST", "/api/signup", { body: signupBody(freshIdentity()) });
    assert.equal(res.status, 503);
  });
});

describe("rate limits (enabled for this file)", () => {
  before(() => {
    process.env.RATE_LIMITS_DISABLED = "false";
  });

  it("verify-phone: the 11th request in the window is a 429", async () => {
    const statuses = [];
    for (let i = 0; i < 11; i++) {
      const res = await api("POST", "/api/verify-phone", { body: { ticket: "0".repeat(64), code: "123456" } });
      statuses.push(res.status);
    }
    assert.deepEqual(statuses.slice(0, 10), Array(10).fill(400));
    assert.equal(statuses[10], 429);
  });

  it("resend and start-phone-verification share that SMS budget", async () => {
    const resend = await api("POST", "/api/resend-phone-code", { body: { ticket: "0".repeat(64) } });
    assert.equal(resend.status, 429);
  });

  it("signup: the 6th signup in an hour is a 429 and sends no SMS", async () => {
    const statuses = [];
    let lastPhone;
    for (let i = 0; i < 6; i++) {
      const id = freshIdentity();
      lastPhone = id.phoneNumber;
      statuses.push((await api("POST", "/api/signup", { body: signupBody(id) })).status);
    }
    assert.deepEqual(statuses.slice(0, 5), Array(5).fill(201));
    assert.equal(statuses[5], 429);
    assert.equal(smsSentTo(lastPhone).length, 0);
  });

  it("login: failed attempts are limited, and the 429 carries a CORS-readable body", async () => {
    const statuses = [];
    for (let i = 0; i < 11; i++) {
      const res = await api("POST", "/api/login", {
        body: { usernameOrEmail: "nobody_at_all", password: "wrong-password" },
        headers: { Origin: "http://localhost:5173" },
      });
      statuses.push(res.status);
      if (res.status === 429) {
        assert.equal(res.body.code, "RATE_LIMITED");
        assert.ok(res.headers.get("retry-after"));
      }
    }
    assert.equal(statuses[10], 429);
  });

  it("the switch is ignored in production", async () => {
    // The limiter reads NODE_ENV per request; the counters are already
    // exhausted above, so the only question is whether `true` bypasses them.
    process.env.RATE_LIMITS_DISABLED = "true";
    process.env.NODE_ENV = "production";
    try {
      const res = await api("POST", "/api/verify-phone", { body: { ticket: "0".repeat(64), code: "1" } });
      assert.equal(res.status, 429);
    } finally {
      process.env.NODE_ENV = "test";
      process.env.RATE_LIMITS_DISABLED = "false";
    }
  });
});
