// helpers/uploadToStorage.js
// Uploads a file buffer to Yandex Object Storage (S3-compatible) and returns
// its public URL. Used by the admin Story Builder — nothing else in the app
// uploads files today. Requires YANDEX_* env vars (see config/env.js); throws
// clearly if they aren't set rather than failing silently.

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { config } from "../config/env.js";

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
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return client;
}

/**
 * @param {string} key — object path within the bucket, e.g. "stories/easy/leo-2/1/audio.mp3"
 * @param {Buffer} buffer
 * @param {string} contentType
 * @returns {Promise<string>} the public URL
 */
export async function uploadBuffer(key, buffer, contentType) {
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
      ACL: "public-read",
    })
  );

  return `${baseUrl}/${key}`;
}
