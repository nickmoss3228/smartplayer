// helpers/signedAudio.js
//
// Turns a stored bucket URL into a short-lived signed one, for paid audio.
//
// A plain public URL is a paywall only for as long as nobody shares it: once a
// buyer copies it, anyone can play it forever. A signed URL stops working after
// SIGNED_URL_TTL_SECONDS, so the only lasting way to hear a part is to ask
// getPublishedStory for it again — which checks entitlements first.
//
// This is half of the lock. The other half is making the objects themselves
// private (no public-read ACL); until then a signed URL still works, but so
// does the unsigned one. Signing first is deliberate: it can be switched on
// and verified with no change to the bucket, and switched off again instantly.
//
// Gated by PAID_AUDIO_SIGNING=on. Off by default, so deploying this changes
// nothing until someone decides to turn it on.

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "../config/env.js";
import { getClient } from "./uploadToStorage.js";

/** Long enough to finish a track and come back to it, short enough to be useless shared. */
export const SIGNED_URL_TTL_SECONDS = 3 * 60 * 60;

/**
 * Signatures are computed against a clock rounded DOWN to the hour, so every
 * request within the same hour gets the identical URL. Without this each page
 * load would mint a new URL and the browser would re-download a multi-MB track
 * it already has cached. The TTL is measured from the rounded instant, which
 * is why it is three hours: a URL handed out at 10:59 still has two left.
 */
const SIGNING_WINDOW_MS = 60 * 60 * 1000;

export const isSigningEnabled = () => process.env.PAID_AUDIO_SIGNING === "on";

/**
 * The object key for a URL in THIS environment's bucket, or null if the URL is
 * somewhere else (a frontend asset, another bucket, a placeholder).
 */
export function bucketKeyFor(url, baseUrl = config.yandex.baseUrl) {
  if (typeof url !== "string" || !baseUrl) return null;
  const prefix = `${baseUrl.replace(/\/$/, "")}/`;
  if (!url.startsWith(prefix)) return null;
  // Drop the ?v= cache-buster uploadToStorage adds; S3 keys never contain it.
  const encoded = url.slice(prefix.length).split("?")[0];
  try {
    return decodeURIComponent(encoded);
  } catch {
    return null; // malformed escape — leave the URL alone rather than guess
  }
}

/**
 * Signs a URL if signing is on and it points into our bucket; otherwise hands
 * it back untouched. Never throws: a signing failure falls back to the stored
 * URL, because a paying customer with a working (if unsigned) track is better
 * than one with a broken player.
 */
export async function signAudioUrl(url, now = Date.now()) {
  if (!isSigningEnabled()) return url;
  const key = bucketKeyFor(url);
  if (!key) return url;
  try {
    return await getSignedUrl(
      getClient(),
      new GetObjectCommand({ Bucket: config.yandex.bucket, Key: key }),
      {
        expiresIn: SIGNED_URL_TTL_SECONDS,
        signingDate: new Date(Math.floor(now / SIGNING_WINDOW_MS) * SIGNING_WINDOW_MS),
      },
    );
  } catch (error) {
    console.error("[signedAudio] could not sign, serving stored URL:", error.message);
    return url;
  }
}
