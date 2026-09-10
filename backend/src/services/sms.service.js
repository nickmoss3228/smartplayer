import { config } from "../config/env.js";

// Provider-independent boundary. The rest of the application only knows how
// to ask for an OTP; credentials and vendor-specific request formatting stay
// here. SMS Aero is the initial Russia-capable implementation.

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

  const response = await fetch(`https://gate.smsaero.ru/v2/sms/send?${params}`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) {
    // The provider's own reason, when it gives one — "no such number",
    // "balance exhausted" and "signature not approved" are the three that
    // actually happen, and they are indistinguishable from the status alone.
    const reason = body.message ? `: ${body.message}` : "";
    throw new Error(`SMS provider rejected the message (${response.status})${reason}`);
  }
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
