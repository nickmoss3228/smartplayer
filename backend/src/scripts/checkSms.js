// scripts/checkSms.js
//
// Answers "are the SMS credentials actually working?" without sending anything.
//
// Worth having as a script rather than a curl you retype, because a rejected
// send has several very different causes that all surface as the same generic
// failure inside signup:
//
//   - wrong email/API key            -> /v2/auth fails
//   - zero balance                   -> /v2/balance is 0, sends fail later
//   - sender signature not approved  -> the single most common one, and the
//                                       least obvious: credentials are valid,
//                                       balance is fine, and the send is still
//                                       refused because `sign` is not on the
//                                       account's approved list.
//
// Every check below is a read. Nothing is sent and nothing is charged unless
// you explicitly pass --send.
//
// Usage:
//   node src/scripts/checkSms.js                  # read-only diagnosis
//   node src/scripts/checkSms.js --send +79991234567   # sends ONE real SMS

import https from "node:https";
import { config } from "../config/env.js";

const sendTo = (() => {
  const i = process.argv.indexOf("--send");
  return i === -1 ? null : process.argv[i + 1];
})();

const { email, apiKey, sign } = config.sms.smsaero;
const auth = Buffer.from(`${email}:${apiKey}`).toString("base64");

const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => console.log(`  ✗ ${m}`);
const info = (m) => console.log(`    ${m}`);

// node:https rather than fetch, purely so this script survives a slow link.
// Node's built-in fetch (undici) caps connection setup at 10s and is not
// configurable without pulling in the undici package; from a Russian VPN the
// TLS handshake to gate.smsaero.ru has been measured at ~16s, so fetch fails
// with a bare "fetch failed" that looks exactly like bad credentials. A
// diagnostic tool must not be the thing that misdiagnoses.
// Retries, because the link to this host is unreliable from outside Russia:
// a TLS handshake that takes ~16s when it works is dropped outright maybe half
// the time. One failed attempt says nothing, so a single try would report
// "unreachable" on a perfectly good account.
async function call(path, params = {}, attempts = 4) {
  let last;
  for (let i = 0; i < attempts; i++) {
    last = await callOnce(path, params);
    if (!last.networkError) return last;
  }
  return last;
}

function callOnce(path, params = {}) {
  const query = new URLSearchParams(params);
  const url = `https://gate.smsaero.ru${path}${query.size ? `?${query}` : ""}`;

  return new Promise((resolve) => {
    const request = https.get(
      url,
      { headers: { Authorization: `Basic ${auth}` }, timeout: 60_000 },
      (response) => {
        let raw = "";
        response.on("data", (chunk) => (raw += chunk));
        response.on("end", () => {
          let body = {};
          try {
            body = JSON.parse(raw);
          } catch {
            body = { message: raw.slice(0, 200) };
          }
          resolve({ status: response.statusCode, body });
        });
      }
    );
    request.on("timeout", () => {
      request.destroy();
      resolve({ status: 0, body: { message: "timed out after 60s" }, networkError: true });
    });
    request.on("error", (error) => {
      resolve({ status: 0, body: { message: error.message }, networkError: true });
    });
  });
}

console.log("\nSMS configuration\n");
console.log(`  SMS_PROVIDER  : ${config.sms.provider}`);
console.log(`  SMSAERO_EMAIL : ${email || "(not set)"}`);
console.log(`  SMSAERO_API_KEY: ${apiKey ? `set, ${apiKey.length} chars` : "(not set)"}`);
console.log(`  SMSAERO_SIGN  : ${sign || "(not set)"}`);
console.log(`  NODE_ENV      : ${config.nodeEnv}`);

if (config.sms.provider === "console") {
  console.log(
    "\nNOTE: provider is 'console', so the app prints codes to the log and never\n" +
      "      calls SMS Aero. The checks below still test the credentials directly,\n" +
      "      so you can confirm they work before switching SMS_PROVIDER=smsaero.\n"
  );
}

if (!email || !apiKey) {
  console.error("\nSMSAERO_EMAIL and SMSAERO_API_KEY must both be set in backend/.env. Stopping.\n");
  process.exit(1);
}

let failed = false;

// ── 1. Credentials ─────────────────────────────────────────────────────────
console.log("\n1. Credentials (/v2/auth)");
console.log("   (the handshake can take ~20s on a slow link — waiting)");
const authResult = await call("/v2/auth");
if (authResult.networkError) {
  console.log(`  ✗ could not reach gate.smsaero.ru: ${authResult.body.message}`);
  info("This is a network problem, not a credentials problem. A VPN that");
  info("tunnels Russian traffic is the usual cause; try toggling it.");
  process.exit(1);
} else if (authResult.body?.success) {
  ok("accepted");
} else if (authResult.status === 403) {
  // The distinction that matters, and the one the raw message hides: this
  // endpoint answers 401 when it does not recognise the credentials and 403
  // when it does but the account may not use the API. A 403 therefore PROVES
  // the email and key are right — the remaining work is in the SMS Aero
  // cabinet, not in this repo.
  failed = true;
  bad(`credentials are VALID, but the account is not permitted: "${authResult.body?.message}"`);
  info("403 (not 401) means the email + key were recognised. Nothing to fix here.");
  info("In the SMS Aero cabinet: finish account activation, get a sender");
  info("signature approved, and top up the balance. Until then keep");
  info("SMS_PROVIDER=console — local signup works fine without any of it.");
} else {
  failed = true;
  bad(`rejected (HTTP ${authResult.status})`);
  info(authResult.body?.message ?? JSON.stringify(authResult.body));
  info("401 means the email or key is wrong. The API key is NOT your login password.");
}

// Everything below needs a usable account. Running the remaining checks after
// auth has already failed just prints the same rejection three more times and
// buries the one line that matters.
if (!authResult.body?.success) {
  console.log("\nSkipping the balance and signature checks — they need a working account.\n");
  process.exit(1);
}

// ── 2. Balance ─────────────────────────────────────────────────────────────
console.log("\n2. Balance (/v2/balance)");
const balance = await call("/v2/balance");
if (balance.body?.success) {
  const value = balance.body.data?.balance;
  if (Number(value) > 0) ok(`${value} RUB`);
  else {
    failed = true;
    bad(`${value} RUB — sends will be refused until the account is topped up`);
  }
} else {
  bad(`could not read balance (HTTP ${balance.status})`);
  info(balance.body?.message ?? JSON.stringify(balance.body));
}

// ── 3. Sender signature ────────────────────────────────────────────────────
// The quiet killer: valid credentials, funded account, and every send still
// refused because this string is not on the approved list.
console.log("\n3. Sender signature (/v2/sign/list)");
const signs = await call("/v2/sign/list");
if (signs.body?.success) {
  const names = (signs.body.data ?? []).map((s) => s.name ?? s.sign ?? String(s));
  info(`approved on this account: ${names.length ? names.join(", ") : "(none yet)"}`);
  if (names.includes(sign)) {
    ok(`configured SMSAERO_SIGN "${sign}" is approved`);
  } else {
    failed = true;
    bad(`configured SMSAERO_SIGN "${sign}" is NOT approved`);
    info(
      names.length
        ? `Set SMSAERO_SIGN to one of the approved names above, or get "${sign}" approved.`
        : "New accounts usually start with a default test signature — use that until yours is approved."
    );
  }
} else {
  bad(`could not list signatures (HTTP ${signs.status})`);
  info(signs.body?.message ?? JSON.stringify(signs.body));
}

// ── 4. Optional real send ──────────────────────────────────────────────────
if (sendTo) {
  console.log(`\n4. Real send to ${sendTo}  (this costs money)`);
  const result = await call("/v2/sms/send", {
    number: sendTo,
    text: "Kod podtverzhdeniya malako: 123456",
    sign,
  });
  if (result.body?.success) {
    ok(`accepted by the provider, id ${result.body.data?.id ?? "?"}`);
    info("If nothing arrives within a minute, check the delivery log in your cabinet.");
  } else {
    failed = true;
    bad(`refused (HTTP ${result.status})`);
    info(result.body?.message ?? JSON.stringify(result.body));
  }
} else {
  console.log("\n4. Real send — skipped. Pass `--send +79991234567` to try one.");
}

console.log(
  failed
    ? "\nSomething above needs fixing before SMS_PROVIDER=smsaero will work.\n"
    : "\nAll checks passed. Set SMS_PROVIDER=smsaero in backend/.env to send for real.\n"
);
process.exit(failed ? 1 : 0);
