// helpers/voiceShareStore.js
// Where «Послушай себя» share links keep their recordings: a student's
// sentences from «Повтори за мной», joined in the browser and uploaded only
// when they press «Поделиться».
//
// TRIAL STORAGE: files on this backend's disk — <id>.wav plus <id>.json — under
// VOICE_SHARE_DIR (default backend/data/voice-shares). That is enough to try
// the feature locally. It is NOT production storage: a container's disk does
// not survive a redeploy. Moving it to the server means replacing the four
// exported functions below (e.g. with uploadToStorage.js's S3 client and a
// table for the metadata); the routes and the frontend do not change.
//
// A link is the only key: 12 random bytes, so it cannot be guessed, and it
// expires after SHARE_TTL_MS.

import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

export const SHARE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Read per call, so tests can point it at a temporary folder. */
const shareDir = () => process.env.VOICE_SHARE_DIR || path.resolve(process.cwd(), "data", "voice-shares");

export const newShareId = () => crypto.randomBytes(12).toString("base64url");

/** Exactly what newShareId makes — the check that keeps ids out of path tricks. */
export const isShareId = (id) => typeof id === "string" && /^[A-Za-z0-9_-]{16}$/.test(id);

const files = (id) => {
  const dir = shareDir();
  return { audio: path.join(dir, `${id}.wav`), meta: path.join(dir, `${id}.json`) };
};

async function removeShare(id) {
  const f = files(id);
  await Promise.all([fs.rm(f.audio, { force: true }), fs.rm(f.meta, { force: true })]);
}

/** Store a recording; returns its metadata, `id` and `expiresAt` included. */
export async function saveShare(wav, meta, now = Date.now()) {
  await fs.mkdir(shareDir(), { recursive: true });
  const id = newShareId();
  const record = {
    ...meta,
    id,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SHARE_TTL_MS).toISOString(),
  };
  const f = files(id);
  await fs.writeFile(f.audio, wav);
  await fs.writeFile(f.meta, JSON.stringify(record));
  return record;
}

/** The share's metadata, or null when there is none or it has expired (which also deletes it). */
export async function readShare(id, now = Date.now()) {
  if (!isShareId(id)) return null;
  let record;
  try {
    record = JSON.parse(await fs.readFile(files(id).meta, "utf8"));
  } catch {
    return null;
  }
  if (Date.parse(record.expiresAt) <= now) {
    await removeShare(id);
    return null;
  }
  return record;
}

export const shareAudioPath = (id) => files(id).audio;

/** Delete every expired share. Cheap at trial sizes; run on each new upload. */
export async function sweepExpired(now = Date.now()) {
  let names;
  try {
    names = await fs.readdir(shareDir());
  } catch {
    return 0;
  }
  let removed = 0;
  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    const id = name.slice(0, -5);
    if (isShareId(id) && (await readShare(id, now)) === null) removed += 1;
  }
  return removed;
}
