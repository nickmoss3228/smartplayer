// helpers/uploadToStorage.js
// Uploads a file buffer to Yandex Object Storage (S3-compatible) and returns
// its public URL. Used by the admin Story Builder — nothing else in the app
// uploads files today. Requires YANDEX_* env vars (see config/env.js); throws
// clearly if they aren't set rather than failing silently.

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import { config } from "../config/env.js";

// Story media is served straight from the bucket — there is no CDN in front of
// it today (VITE_YOS_BASE_URL points at storage.yandexcloud.net directly). Without
// a Cache-Control header Yandex serves the object with no freshness hint at all,
// so browsers re-download multi-MB MP3s on every visit and any future CDN edge
// would have no TTL to honour.
//
// `immutable` is only honest because the URL is versioned, not the key: see the
// comment on uploadBuffer below.
const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

let client = null;

function getClient() {
  const { accessKeyId, secretAccessKey, endpoint } = config.yandex;
  if (!accessKeyId || !secretAccessKey || !endpoint) {
    throw new Error(
      "Yandex Object Storage is not configured — set YANDEX_ACCESS_KEY_ID, YANDEX_SECRET_ACCESS_KEY, YANDEX_ENDPOINT, YANDEX_BUCKET, and YANDEX_BASE_URL."
    );
  }
  if (!client) {
    client = new S3Client({
      region: "ru-central1",
      endpoint,
      // Path-style (endpoint/bucket/key) rather than virtual-hosted
      // (bucket.endpoint/key). Two reasons: it matches the public URLs we hand
      // out via baseUrl, and the per-bucket subdomain is a separate DNS name
      // that some networks fail to reach — it reliably ECONNRESETs from the
      // dev machine while path-style works fine.
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return client;
}

/**
 * Uploads a buffer and returns a cache-busted public URL.
 *
 * The object KEY is deterministic — assetKeyFor() in story.controller.js builds
 * `stories/<difficulty>/<storyId>/<part>/audio.mp3`, so re-uploading a corrected
 * clip overwrites in place. That makes a bare `immutable` header a lie: every
 * existing listener would be stranded on the stale file for a year with no way
 * to fix it short of renaming the object.
 *
 * So the URL is versioned instead of the key. `?v=<content hash>` is part of the
 * browser's cache key but ignored by S3/Yandex on a public GET, which means a
 * re-upload yields a new URL that every client fetches immediately, while the
 * old URL stays cacheable forever. Callers persist the returned URL into
 * part.audioUrl / vocab audioUrl, so the new version propagates on its own.
 *
 * @param {string} key — object path within the bucket, e.g. "stories/easy/leo-2/1/audio.mp3"
 * @param {Buffer} buffer
 * @param {string} contentType
 * @param {{ cacheControl?: string }} [options]
 * @returns {Promise<string>} the public, versioned URL
 */
export async function uploadBuffer(key, buffer, contentType, options = {}) {
  const { bucket, baseUrl } = config.yandex;
  if (!bucket || !baseUrl) {
    throw new Error(
      "Yandex Object Storage is not configured — set YANDEX_BUCKET and YANDEX_BASE_URL."
    );
  }

  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: options.cacheControl ?? IMMUTABLE_CACHE_CONTROL,
      ACL: "public-read",
    })
  );

  const version = crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 8);
  return `${baseUrl}/${key}?v=${version}`;
}
