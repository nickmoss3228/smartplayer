import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../config/env.js";

// Provider-independent boundary. The rest of the application only knows how
// to ask for an OTP; credentials and vendor-specific request formatting stay
// here. SMS Aero is the initial Russia-capable implementation.

// Where the console provider also drops codes, so they can be read without
// having the server's terminal window in front of you — `npm run dev` under
// nodemon owns that window, and anything else (another shell, an editor, a
// second person) has no way into its scrollback.
//
// backend/dev-sms.log, gitignored alongside .env. Deliberately a sibling of
// the code it records rather than a temp path: a file full of live OTPs should
// be somewhere you trip over and delete, not somewhere you forget.
const DEV_SMS_LOG = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "dev-sms.log"
);

function configError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

/**
 * Development/staging escape hatch: print the code instead of sending it.
 *
 * Without this the entire auth flow is untestable until a paid SMS Aero
 * account exists, because signup's very first step is an SMS send. Opt-in by
 * name (SMS_PROVIDER=console) rather than "fall back when credentials are
 * missing" — an implicit fallback is exactly the kind of thing that survives
 * into production unnoticed, and there it would mean every account's OTP is
 * readable in `docker logs`.
 */
function sendViaConsole(phoneNumber, code) {
  if (config.nodeEnv === "production") {
    throw configError(
      "SMS_PROVIDER=console is refused in production — it would write every " +
        "verification code to the server log in plaintext.",
      "SMS_PROVIDER_UNSUPPORTED"
    );
  }
  console.log(
    `\n[sms] ==================================================\n` +
      `[sms]  DEV MODE — no SMS was sent.\n` +
      `[sms]  To: ${phoneNumber}\n` +
      `[sms]  Verification code: ${code}\n` +
      `[sms] ==================================================\n`
  );

  // Best-effort second copy. A failure here must never break a signup that has
  // otherwise succeeded, so it is swallowed — the terminal above is still the
  // authoritative output, this is only a convenience.
  try {
    fs.appendFileSync(
      DEV_SMS_LOG,
      `${new Date().toISOString()}  ${phoneNumber}  ${code}\n`
    );
  } catch {
    // Ignored on purpose: read-only volume, permissions, whatever it is.
  }
}

// How long one attempt may take, and how many attempts a send gets. Two
// retries rather than many: a verification code the user is staring at has a
// short useful life, and signup is holding an open HTTP request the whole
// time, so it is better to fail and let them press "resend" than to keep a
// request open for a minute.
const SMS_TIMEOUT_MS = 25_000;
const SMS_ATTEMPTS = 3;

/**
 * One HTTPS GET against the provider.
 *
 * node:https rather than fetch, and not a style preference. Node's built-in
 * fetch (undici) caps connection setup at 10s and exposes no way to raise it
 * without adding the undici package as a dependency. The TLS handshake to
 * gate.smsaero.ru measures 16–32s from outside Russia, so every send from a
 * developer machine fails with a bare "fetch failed" that reads exactly like
 * bad credentials. On the Moscow VM the handshake is fast and this changes
 * nothing — it only stops the local experience from being a dead end.
 */
function requestSmsAero(url, auth) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      { headers: { Authorization: `Basic ${auth}` }, timeout: SMS_TIMEOUT_MS },
      (response) => {
        let raw = "";
        response.on("data", (chunk) => (raw += chunk));
        response.on("end", () => {
          let body = {};
          try {
            body = JSON.parse(raw);
          } catch {
            body = {};
          }
          resolve({ status: response.statusCode, body });
        });
      }
    );
    request.on("timeout", () => {
      request.destroy();
      reject(Object.assign(new Error(`SMS request timed out after ${SMS_TIMEOUT_MS}ms`), { transient: true }));
    });
    request.on("error", (error) => {
      reject(Object.assign(error, { transient: true }));
    });
  });
}

async function sendViaSmsAero(phoneNumber, code) {
  if (!config.sms.smsaero.email || !config.sms.smsaero.apiKey) {
    throw configError("SMS Aero credentials are not configured", "SMS_NOT_CONFIGURED");
  }

  const params = new URLSearchParams({
    number: phoneNumber,
    text: `Код подтверждения malako: ${code}`,
    sign: config.sms.smsaero.sign,
  });
  const auth = Buffer.from(
    `${config.sms.smsaero.email}:${config.sms.smsaero.apiKey}`
  ).toString("base64");
  const url = `https://gate.smsaero.ru/v2/sms/send?${params}`;

  let lastTransient;
  for (let attempt = 1; attempt <= SMS_ATTEMPTS; attempt++) {
    let result;
    try {
      result = await requestSmsAero(url, auth);
    } catch (error) {
      // Dropped connection or timeout. Worth retrying — and it happens often
      // enough on a bad link that one attempt tells you nothing.
      lastTransient = error;
      continue;
    }

    if (result.status >= 200 && result.status < 300 && result.body?.success !== false) {
      return;
    }

    // A real answer from the provider. Retrying cannot change it, so stop.
    //
    // 403 is called out because it is the confusing one: the credentials were
    // accepted (401 is what a wrong key gets) and the account itself is not
    // permitted — unactivated, or the sender signature is not approved. Every
    // retry would return the same thing.
    const reason = result.body?.message ? `: ${result.body.message}` : "";
    throw new Error(
      result.status === 403
        ? `SMS Aero refused the account (403)${reason}. The credentials are valid; ` +
          `the account is not cleared to send — check activation, the approved ` +
          `sender signature, and the balance.`
        : `SMS provider rejected the message (${result.status})${reason}`
    );
  }

  throw Object.assign(
    new Error(
      `Could not reach gate.smsaero.ru after ${SMS_ATTEMPTS} attempts: ${lastTransient?.message}`
    ),
    { code: "SMS_UNREACHABLE" }
  );
}

export async function sendVerificationSms(phoneNumber, code) {
  switch (config.sms.provider) {
    case "console":
      return sendViaConsole(phoneNumber, code);
    case "smsaero":
      return sendViaSmsAero(phoneNumber, code);
    default:
      throw configError(
        `Unsupported SMS provider: ${config.sms.provider}`,
        "SMS_PROVIDER_UNSUPPORTED"
      );
  }
}
