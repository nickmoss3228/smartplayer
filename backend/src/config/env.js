// Centralize dotenv and export needed env values.
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve .env relative to THIS FILE, not process.cwd().
//
// Bare dotenv.config() reads ./.env from wherever node was launched. `npm run
// dev` runs `nodemon src/server.js` from backend/, so a .env sitting anywhere
// else is silently ignored — and the first symptom is an unrelated crash from
// whichever module constructs a client at import time (Resend: "Missing API
// key"), which sends you hunting in completely the wrong place.
//
// In Docker this is a no-op: docker-compose injects the real values via
// env_file, and process.env already wins over anything dotenv would load.
const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
dotenv.config({ path: path.join(backendRoot, '.env') });

// Fail loudly at boot instead of at the first request that happens to need a
// missing value. Object Storage is checked separately (see below) because the
// app is perfectly usable without it — only the Story Builder's uploads break.
// DATABASE_URL replaced MONGODB_URI here when the app moved to PostgreSQL.
// MONGODB_URI is still read (config.mongoUri) by the one-off scripts that talk
// to the old database — the backup and the ETL — but the server no longer
// needs it to start.
const REQUIRED = ['DATABASE_URL', 'JWT_SECRET'];
const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length) {
    console.error(
        `[env] Missing required variable(s): ${missing.join(', ')}.\n` +
        `[env] Expected them in ${path.join(backendRoot, '.env')} (or the container's env_file).`
    );
}

// Uploads are the one feature that silently 500s when unconfigured, and the
// error surfaces as a generic "Upload failed" in the admin panel. Warn at boot
// so the cause is obvious before anyone tries to publish a story.
const YANDEX_KEYS = [
    'YANDEX_ACCESS_KEY_ID',
    'YANDEX_SECRET_ACCESS_KEY',
    'YANDEX_BUCKET',
    'YANDEX_ENDPOINT',
    'YANDEX_BASE_URL',
];
const missingYandex = YANDEX_KEYS.filter((key) => !process.env[key]);
if (missingYandex.length) {
    console.warn(
        `[env] Yandex Object Storage not configured (missing: ${missingYandex.join(', ')}).\n` +
        `[env] The app will run, but Story Builder audio uploads will fail with 500.`
    );
}

// ADMIN_CODES gives each operator their own code word so the audit log can
// attribute an action to a person: ADMIN_CODES="alice:s3cret,bob:hunter2".
// Falls back to the legacy single ADMIN_CODE (attributed to "admin") so
// nothing breaks if the new var isn't set.
//
// Be honest about what this is: per-admin *attribution*, not per-admin
// *authentication*. These are shared secrets sitting in an env file — no
// hashing at rest, no rotation story, no revocation without a redeploy, no
// MFA. The audit trail's value here is operational ("what changed, when,
// from where"), not forensic non-repudiation. If this app ever has more than
// one real operator, the right move is a `role` field on the existing User
// model with bcrypt'd credentials; that's deliberately deferred as
// disproportionate for a single-operator tool.
function parseAdminCodes(raw, legacyCode) {
    const map = new Map(); // code word -> display name
    (raw ?? '')
        .split(',')
        .map((pair) => pair.trim())
        .filter(Boolean)
        .forEach((pair) => {
            const idx = pair.indexOf(':');
            if (idx <= 0) return; // skip malformed entries rather than crash on boot
            map.set(pair.slice(idx + 1).trim(), pair.slice(0, idx).trim());
        });
    if (map.size === 0 && legacyCode) map.set(legacyCode, 'admin');
    return map;
}

export const config = {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    mongoUri: process.env.MONGODB_URI,
    jwtSecret: process.env.JWT_SECRET,
    resendApiKey: process.env.RESEND_API_KEY,
    sms: {
        // 'console' prints the OTP to the server log instead of sending it, so
        // signup and login are walkable without a paid SMS account. It is
        // refused outright when NODE_ENV=production (services/sms.service.js) —
        // there it would mean every verification code in the app is sitting in
        // plaintext in the container logs.
        provider: process.env.SMS_PROVIDER || 'smsaero',
        smsaero: {
            email: process.env.SMSAERO_EMAIL,
            apiKey: process.env.SMSAERO_API_KEY,
            sign: process.env.SMSAERO_SIGN || 'malako',
        },
    },

    // Is the SMS code a REQUIREMENT of having an account?
    //
    // Off means signup takes an email and a password, never calls the SMS
    // provider, and hands back a session immediately. It exists because the
    // provider is not set up yet and, until it is, signup does not merely
    // fail — it deletes the half-created account on the way out (see
    // controllers/auth.controller.js), so nobody can register at all.
    //
    // Defaults to ON, deliberately. A deployment that forgets this variable
    // keeps verifying phones rather than silently dropping the check, and
    // test/api/harness.js registers every test user through the real OTP
    // flow, which only keeps working because the default is on.
    phoneVerificationRequired: process.env.PHONE_VERIFICATION_REQUIRED !== 'false',
    adminCode: process.env.ADMIN_CODE,
    adminCodes: parseAdminCodes(process.env.ADMIN_CODES, process.env.ADMIN_CODE),
    // Audit rows are expired by a pg_cron job, not by the app (see
    // db/migrations/manual/001_audit_retention.sql). That job hardcodes the
    // same 365 days — change both together.
    adminAuditTtlDays: Number(process.env.ADMIN_AUDIT_TTL_DAYS ?? 365),
    // Yandex Object Storage (S3-compatible) — used by the Story Builder to
    // upload story/vocab/quiz audio. Uploads fail clearly until these are set.
    yandex: {
        accessKeyId: process.env.YANDEX_ACCESS_KEY_ID,
        secretAccessKey: process.env.YANDEX_SECRET_ACCESS_KEY,
        bucket: process.env.YANDEX_BUCKET,
        endpoint: process.env.YANDEX_ENDPOINT,
        baseUrl: process.env.YANDEX_BASE_URL, // public read URL prefix, matches frontend's VITE_YOS_BASE_URL
    },

    // Where the browser lives. Read straight from process.env in
    // controllers/password.controller.js and services/email.service.js for
    // historical reasons; surfaced here because the payment return URL needs
    // it too and a fourth direct read is one too many.
    frontendUrl: process.env.FRONTEND_URL,

    // Real-money payments. See config/priceCatalog.js for what is sold.
    payments: {
        // The kill switch. Absent or not exactly "true" means the shop refuses
        // to CREATE orders — production runs dark until this is deliberately
        // set. It does NOT stop settlement: if a provider notification arrives
        // while this is off, somebody paid, and they get what they bought.
        // Taking money and honouring money are separate decisions.
        enabled: process.env.PAYMENTS_ENABLED === 'true',
        // Is content gated by OWNERSHIP at all?
        //
        // Distinct from `enabled`, which only stops orders being created. This
        // one is the paywall itself: off, a signed-in user gets every story
        // free, and a guest keeps the same taster they always had (the first
        // parts of a long story) before being asked to register. The catalog,
        // the prices and the admin pricing panel are untouched — nothing is
        // sold while this is off, so nothing needs to be priced differently.
        //
        // Defaults to ON so a deployment that forgets the variable charges for
        // content rather than giving the catalogue away.
        paywallEnabled: process.env.PAYWALL_ENABLED !== 'false',
        // Which driver takes the money. "fake" is a working payment system with
        // the money removed (services/payments/fake.js): it redirects, calls
        // back over real HTTP, retries, and can be told to lose a notification.
        // Every driver declares realMoney, and server.js refuses to run one
        // that does not in production — see assertPaymentsSafeForEnvironment().
        provider: process.env.PAYMENTS_PROVIDER || 'fake',
        // Lets staging sell placeholder packs that production refuses.
        // Comma-separated SKUs, or "*" for everything in the catalog. It only
        // ever ADDS to the purchasable set — it cannot un-sell something.
        purchasableSkus: (process.env.PURCHASABLE_SKUS ?? '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        // Signs the per-payment token planted in every callback URL. Neutral by
        // design rather than living in a driver: we always choose the
        // callbackUrl, so this authenticates a notification identically for an
        // acquirer that signs its own and one that offers nothing at all.
        // Rotating it strands the callbacks of payments already in flight.
        callbackSecret: process.env.PAYMENTS_CALLBACK_SECRET,
        // Where a driver reaches US. NOT frontendUrl: locally that is :5173
        // while the API is :5000, and on staging it must be the public
        // hostname, because a callback that never crosses the real proxy chain
        // has not tested the thing staging exists to test.
        publicApiBase: process.env.PUBLIC_API_BASE,
        // How long the fake acquirer "takes" before calling back. Long enough
        // that the return page visibly polls, short enough not to be a nuisance.
        fakeDelayMs: Number(process.env.FAKE_CALLBACK_DELAY_MS ?? 2000),
    },
};

// Payments fail CLOSED. A shop that says "not yet" is recoverable; one that
// throws mid-checkout is a support ticket. Following the Yandex-keys precedent
// above: warn loudly at boot, keep running.
//
// Note what is NOT checked here: whether the selected driver can actually charge
// anyone. That answer lives on the driver itself (realMoney), and importing the
// driver registry from this file would be a cycle — env.js is what the registry
// reads its configuration from. server.js calls
// assertPaymentsSafeForEnvironment() at boot instead, which is the same check
// with the dependency pointing the right way.
if (config.payments.enabled) {
    const missingPayments = [];
    if (!config.payments.callbackSecret) missingPayments.push('PAYMENTS_CALLBACK_SECRET');
    if (!config.payments.publicApiBase) missingPayments.push('PUBLIC_API_BASE');

    if (missingPayments.length) {
        console.error(
            `[env] PAYMENTS_ENABLED=true but payments are unconfigured (missing: ${missingPayments.join(', ')}).\n` +
            '[env] Payments have been DISABLED: without these a callback cannot be built or\n' +
            '[env] verified, so orders would be created that could never be settled.\n' +
            '[env] Generate a secret with `openssl rand -hex 32`.'
        );
        config.payments.enabled = false;
    }
}
