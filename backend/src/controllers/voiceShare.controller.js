// controllers/voiceShare.controller.js
// «Послушай себя» share links: POST a recording (a WAV made in the browser),
// get back an id; anyone with the id can read its caption and play it until it
// expires. Storage is behind helpers/voiceShareStore.js.

import { parseWavHeader } from "../helpers/wavHeader.js";
import { readShare, saveShare, shareAudioPath, sweepExpired } from "../helpers/voiceShareStore.js";

/** Ten minutes is far more than any part; a longer file is not a part. */
const MAX_SECONDS = 600;
const DIFFICULTIES = new Set(["easy", "medium", "hard"]);
const KINDS = new Set(["me", "dialogue"]);

const notFound = (res) =>
  res.status(404).json({ error: "Recording not found or expired", message: "Recording not found or expired", code: "NOT_FOUND" });

const bad = (res, text) => res.status(400).json({ error: text, message: text, code: "BAD_RECORDING" });

/** A short caption from the query string: trimmed, no control characters, capped. */
const caption = (value) =>
  typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 120) : "";

const publicFields = (r) => ({
  id: r.id,
  storyTitle: r.storyTitle,
  partTitle: r.partTitle,
  part: r.part,
  difficulty: r.difficulty,
  kind: r.kind,
  durationSec: r.durationSec,
  createdAt: r.createdAt,
  expiresAt: r.expiresAt,
});

export async function createShare(req, res) {
  const wav = req.body;
  const header = Buffer.isBuffer(wav) ? parseWavHeader(wav) : null;
  if (!header) return bad(res, "Expected a WAV file");
  if (header.format !== 1 || header.channels !== 1 || header.bitsPerSample !== 16) {
    return bad(res, "Expected 16-bit mono PCM");
  }
  if (header.sampleRate < 8000 || header.sampleRate > 48000) return bad(res, "Unsupported sample rate");
  if (header.durationSec < 0.5 || header.durationSec > MAX_SECONDS) return bad(res, "Unsupported length");

  const part = Number.parseInt(req.query.part, 10);
  const difficulty = String(req.query.difficulty ?? "");
  const kind = String(req.query.kind ?? "");
  if (!Number.isInteger(part) || part < 1 || part > 500) return bad(res, "Bad part");
  if (!DIFFICULTIES.has(difficulty)) return bad(res, "Bad difficulty");
  if (!KINDS.has(kind)) return bad(res, "Bad kind");

  await sweepExpired();
  const record = await saveShare(wav, {
    storyTitle: caption(req.query.storyTitle),
    partTitle: caption(req.query.partTitle),
    part,
    difficulty,
    kind,
    durationSec: Math.round(header.durationSec * 10) / 10,
    // Kept for removing a member's shares later; never sent back out.
    userId: req.user?.id ?? null,
  });
  return res.status(201).json(publicFields(record));
}

export async function getShare(req, res) {
  const record = await readShare(req.params.id);
  if (!record) return notFound(res);
  return res.json(publicFields(record));
}

export async function getShareAudio(req, res) {
  const record = await readShare(req.params.id);
  if (!record) return notFound(res);
  res.set("Cache-Control", "private, max-age=3600");
  res.type("audio/wav");
  // sendFile answers Range requests, which the <audio> element uses to seek.
  return res.sendFile(shareAudioPath(record.id));
}
