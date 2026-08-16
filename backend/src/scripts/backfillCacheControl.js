// scripts/backfillCacheControl.js
//
// One-off remediation. Every object uploaded before helpers/uploadToStorage.js
// started setting CacheControl has no freshness header at all, so browsers
// re-download multi-MB MP3s on every single visit. This walks the bucket and
// does a server-side copy-onto-self with MetadataDirective: "REPLACE" to attach
// Cache-Control without re-uploading a byte of audio.
//
// Why a script rather than `aws s3 cp --recursive --metadata-directive REPLACE`:
// REPLACE discards every piece of metadata you don't restate. Forget
// --acl public-read and every audio file in the app starts returning 403;
// forget --content-type and everything becomes binary/octet-stream. The CLI
// also has no dry run, no idempotency check, and no way to preserve each
// object's real content type. For a one-shot against ~1000 production objects
// that's a bad trade.
//
// These legacy objects are referenced by hardcoded URLs with no ?v= version
// (see src/modules/audiodata/* and src/services/yandexStorage.ts), so they get
// a FINITE max-age rather than `immutable` — a corrected file must still be
// able to reach clients eventually. Newly uploaded assets go through
// uploadBuffer(), which versions the URL and can safely use `immutable`.
//
// Usage — always in this order:
//   node src/scripts/backfillCacheControl.js --dry-run
//   node src/scripts/backfillCacheControl.js --prefix leo/     # a real slice first
//   node src/scripts/backfillCacheControl.js
//
// Then verify BOTH the header and that the file is still public:
//   curl -sI "https://storage.yandexcloud.net/audioplayer-data/leo/1.%20Meet%20Leo.mp3"

import {
  S3Client,
  ListObjectsV2Command,
  HeadObjectCommand,
  CopyObjectCommand,
} from "@aws-sdk/client-s3";
import { config } from "../config/env.js";

const CACHE_CONTROL = "public, max-age=2592000"; // 30 days
const CONCURRENCY = 8;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const prefixFlag = args.indexOf("--prefix");
const prefix =
  args.find((a) => a.startsWith("--prefix="))?.split("=")[1] ??
  (prefixFlag !== -1 ? args[prefixFlag + 1] : "") ??
  "";

const { accessKeyId, secretAccessKey, endpoint, bucket } = config.yandex;
if (!accessKeyId || !secretAccessKey || !endpoint || !bucket) {
  console.error(
    "Yandex Object Storage is not configured — set YANDEX_ACCESS_KEY_ID, " +
      "YANDEX_SECRET_ACCESS_KEY, YANDEX_ENDPOINT and YANDEX_BUCKET."
  );
  process.exit(1);
}

const client = new S3Client({
  region: "ru-central1",
  endpoint,
  // Same reasoning as helpers/uploadToStorage.js: the bucket-as-subdomain form
  // is a separate DNS name that some networks can't reach, and this script
  // makes one request per object — a flaky host would fail it en masse.
  forcePathStyle: true,
  credentials: { accessKeyId, secretAccessKey },
});

const TYPES = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  svg: "image/svg+xml",
};

const contentTypeFor = (key) =>
  TYPES[key.split(".").pop()?.toLowerCase()] ?? "application/octet-stream";

async function* listAll() {
  let ContinuationToken;
  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix || undefined,
        ContinuationToken,
      })
    );
    for (const object of page.Contents ?? []) yield object.Key;
    ContinuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (ContinuationToken);
}

async function fix(Key) {
  const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key }));
  if (head.CacheControl === CACHE_CONTROL) return "skipped"; // idempotent — safe to re-run

  // REPLACE wipes the content type too, so preserve the object's real one and
  // only fall back to the extension when it's missing or a useless default.
  const ContentType =
    head.ContentType && head.ContentType !== "binary/octet-stream"
      ? head.ContentType
      : contentTypeFor(Key);

  if (dryRun) {
    console.log(
      `[dry-run] ${Key}  ${head.CacheControl ?? "(none)"} -> ${CACHE_CONTROL}  (${ContentType})`
    );
    return "would-update";
  }

  await client.send(
    new CopyObjectCommand({
      Bucket: bucket,
      Key,
      // Keys contain spaces ("leo/1. Meet Leo.mp3"), so CopySource must be
      // URL-encoded — but the slashes have to survive, or the whole thing is
      // read as one flat key name. Same trick as getStorageUrl() on the frontend.
      CopySource: encodeURIComponent(`${bucket}/${Key}`).replace(/%2F/g, "/"),
      MetadataDirective: "REPLACE",
      CacheControl: CACHE_CONTROL,
      ContentType,
      // REPLACE drops the ACL. Without this line every audio file in the app
      // starts returning 403 — the single most dangerous part of this script.
      ACL: "public-read",
    })
  );
  return "updated";
}

async function main() {
  console.log(
    `${dryRun ? "[DRY RUN] " : ""}bucket=${bucket} prefix=${prefix || "(all)"} -> "${CACHE_CONTROL}"`
  );

  const counts = { updated: 0, skipped: 0, "would-update": 0, failed: 0 };
  let inFlight = [];

  for await (const Key of listAll()) {
    inFlight.push(
      fix(Key)
        .then((result) => {
          counts[result]++;
        })
        .catch((error) => {
          counts.failed++;
          console.error(`FAILED ${Key}: ${error.message}`);
        })
    );
    if (inFlight.length >= CONCURRENCY) {
      await Promise.all(inFlight);
      inFlight = [];
    }
  }
  await Promise.all(inFlight);

  console.table(counts);
  if (counts.failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
