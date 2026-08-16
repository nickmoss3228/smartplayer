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
const REQUIRED = ['MONGODB_URI', 'JWT_SECRET'];
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
    mongoUri: process.env.MONGODB_URI,
    jwtSecret: process.env.JWT_SECRET,
    resendApiKey: process.env.RESEND_API_KEY,
    adminCode: process.env.ADMIN_CODE,
    adminCodes: parseAdminCodes(process.env.ADMIN_CODES, process.env.ADMIN_CODE),
    // Audit rows self-expire via a TTL index (see models/AdminAuditLog.js).
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
};