// test/api/harness.js
//
// Boots the real Express app in-process against a real PostgreSQL database and
// drives it over HTTP. Nothing is mocked except the SMS gateway, which runs in
// its `console` mode and is read back from here.
//
//   npm run test:api
//
// ── The database ───────────────────────────────────────────────────────────
//
// TEST_DATABASE_URL if set, otherwise DATABASE_URL from backend/.env with the
// database name swapped for `smartplayer_test`. The harness REFUSES to start
// unless the database name ends in `_test`: the suite creates and bans accounts
// and resets tables, and the only thing between that and the dev database is a
// path segment in a URL — the exact trap the Mongo setup once fell into.
//
// ── Import it FIRST ────────────────────────────────────────────────────────
//
// Before any module under src/. config/env.js builds its config object at
// import time, so a test that imports, say, config/quizData.js ahead of this
// file gets the developer's real .env baked in (JWT secret, admin codes). The
// check after the app import below turns that mistake into a loud failure.
//
// Tests never depend on an empty database. Every account uses a fresh random
// username and phone, so files can run in any order and a stale row from an
// earlier run cannot collide with a new one.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const fileEnv = fs.existsSync(path.join(backendRoot, ".env"))
  ? dotenv.parse(fs.readFileSync(path.join(backendRoot, ".env")))
  : {};

function testDatabaseUrl() {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const base = process.env.DATABASE_URL ?? fileEnv.DATABASE_URL;
  if (!base) return null;
  const url = new URL(base);
  url.pathname = "/smartplayer_test";
  return url.toString();
}

const databaseUrl = testDatabaseUrl();
if (!databaseUrl) {
  throw new Error("[test] No TEST_DATABASE_URL or DATABASE_URL — cannot run the API suite.");
}
const databaseName = new URL(databaseUrl).pathname.replace(/^\//, "");
if (!databaseName.endsWith("_test")) {
  throw new Error(
    `[test] Refusing to run against database "${databaseName}": its name must end in _test.`,
  );
}

// Set BEFORE the app is imported. config/env.js and db/client.ts both call
// dotenv.config(), which never overrides a variable that is already present.
Object.assign(process.env, {
  NODE_ENV: "test",
  DATABASE_URL: databaseUrl,
  PGSSL: process.env.PGSSL ?? fileEnv.PGSSL ?? "disable",
  JWT_SECRET: "test-jwt-secret-not-used-anywhere-else",
  SMS_PROVIDER: "console",
  RATE_LIMITS_DISABLED: "true",
  ADMIN_CODE: "",
  ADMIN_CODES: "tester:test-admin-code",
  // Pinned, not inherited. These two are turned OFF in .env while the idea is
  // being tested, and Object.assign here overrides that — the suite exists to
  // exercise the paywall and the SMS flow, so it must run with both ON
  // regardless of what the developer's .env happens to say today.
  PAYWALL_ENABLED: "true",
  PHONE_VERIFICATION_REQUIRED: "true",
  PAYMENTS_ENABLED: "true",
  PAYMENTS_PROVIDER: "fake",
  PAYMENTS_CALLBACK_SECRET: "test-callback-secret",
  PURCHASABLE_SKUS: "*",
  FAKE_CALLBACK_DELAY_MS: "0",
  FRONTEND_URL: "http://localhost:5173",
  // Email is never actually sent; see the password-reset tests.
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? "re_test_dummy",
});

export const ADMIN_CODE = "test-admin-code";

// ── Console capture ────────────────────────────────────────────────────────
//
// The console SMS provider prints the code. Capture it per phone number, and
// keep the app's per-request logging out of the test report. console.error is
// left alone on purpose: a 500 in a test should come with its stack trace.

const smsCodes = new Map();
const realLog = console.log;
const verbose = process.env.TEST_VERBOSE === "1";

console.log = (...args) => {
  const text = args.map(String).join(" ");
  const match = text.match(/To: (\+\d+)[\s\S]*?Verification code: (\d{6})/);
  if (match) {
    const list = smsCodes.get(match[1]) ?? [];
    list.push(match[2]);
    smsCodes.set(match[1], list);
  }
  if (verbose) realLog(...args);
};
if (!verbose) {
  console.warn = () => {};
  console.info = () => {};
}

/** Every code texted to this phone, oldest first. */
export function smsSentTo(phone) {
  return smsCodes.get(phone) ?? [];
}

/** The most recent code texted to this phone. */
export function lastCode(phone) {
  const list = smsSentTo(phone);
  if (!list.length) throw new Error(`[test] no SMS was sent to ${phone}`);
  return list.at(-1);
}

// ── Server ─────────────────────────────────────────────────────────────────

const { default: app } = await import("../../src/app.js");
{
  const { config } = await import("../../src/config/env.js");
  if (config.nodeEnv !== "test" || config.jwtSecret !== process.env.JWT_SECRET) {
    throw new Error(
      "[test] config/env.js was loaded before test/api/harness.js, so it holds the real .env. " +
        "Import ./harness.js before any module under src/.",
    );
  }
}
const dbModule = await import("../../src/db/index.js");
export const { db, schema, closeDb } = dbModule;

await dbModule.runMigrations();

let server;
let baseUrl;

export async function startServer() {
  if (server) return baseUrl;
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  // The fake acquirer calls back into this process over real HTTP.
  process.env.PUBLIC_API_BASE = baseUrl;
  const { config } = await import("../../src/config/env.js");
  config.payments.publicApiBase = baseUrl;
  return baseUrl;
}

export async function stopServer() {
  if (server) {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
    server = null;
  }
  await closeDb();
}

/**
 * One API call. Returns { status, body, headers } and never throws on a
 * non-2xx, so a test can assert on the refusal itself.
 */
export async function api(method, urlPath, { body, token, device, headers = {} } = {}) {
  if (!baseUrl) await startServer();
  const finalHeaders = { ...headers };
  if (body !== undefined) finalHeaders["Content-Type"] = "application/json";
  if (token) finalHeaders.Authorization = `Bearer ${token}`;
  if (device) finalHeaders["X-Device-Id"] = device;

  const response = await fetch(`${baseUrl}${urlPath}`, {
    method,
    headers: finalHeaders,
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    redirect: "manual",
  });
  const text = await response.text();
  let parsed = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    // Left as text.
  }
  return { status: response.status, body: parsed, headers: response.headers };
}

// ── Fixtures ───────────────────────────────────────────────────────────────

let counter = 0;
function rand(digits) {
  let out = "";
  for (let i = 0; i < digits; i++) out += Math.floor(Math.random() * 10);
  return out;
}

/** A username and phone no other test (or earlier run) has used. */
export function freshIdentity(prefix = "t") {
  counter += 1;
  return {
    username: `${prefix}_${Date.now().toString(36)}_${counter}_${rand(4)}`,
    phoneNumber: `+79${rand(9)}`,
    password: "correct-horse-1",
  };
}

export function signupBody(identity, extra = {}) {
  return {
    username: identity.username,
    phoneNumber: identity.phoneNumber,
    password: identity.password,
    acceptedTerms: true,
    acceptedDataConsent: true,
    legalVersion: "test-1",
    ...extra,
  };
}

/**
 * Signup + SMS verification, the way the frontend does it. Returns a live
 * session token for a device, plus the user's id.
 */
export async function registerUser({ prefix = "t", device, email } = {}) {
  const identity = freshIdentity(prefix);
  device ??= `dev-${identity.username}`;
  const signup = await api("POST", "/api/signup", {
    body: signupBody(identity, email ? { email } : {}),
  });
  if (signup.status !== 201) {
    throw new Error(`[test] signup failed: ${signup.status} ${JSON.stringify(signup.body)}`);
  }
  const verify = await api("POST", "/api/verify-phone", {
    body: { ticket: signup.body.ticket, code: lastCode(identity.phoneNumber) },
    device,
  });
  if (verify.status !== 200) {
    throw new Error(`[test] verify failed: ${verify.status} ${JSON.stringify(verify.body)}`);
  }
  return { ...identity, email, device, token: verify.body.token, id: verify.body.user.id };
}

/** An admin JWT, via the real admin login. */
export async function adminToken() {
  const res = await api("POST", "/api/admin/login", { body: { code: ADMIN_CODE } });
  if (res.status !== 200) {
    throw new Error(`[test] admin login failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.token;
}

/** Put money in a wallet directly, bypassing the earn paths. */
export async function fundWallet(userId, { bitAward = 0, bitWord = 0, bitPhrase = 0 }) {
  const { eq } = await import("drizzle-orm");
  await db()
    .update(schema.users)
    .set({ bitAward, bitWord, bitPhrase })
    .where(eq(schema.users.id, userId));
}

export async function userRow(userId) {
  const { eq } = await import("drizzle-orm");
  const [row] = await db().select().from(schema.users).where(eq(schema.users.id, userId));
  return row ?? null;
}

export async function setUserColumns(userId, values) {
  const { eq } = await import("drizzle-orm");
  await db().update(schema.users).set(values).where(eq(schema.users.id, userId));
}
