// helpers/safeEqual.js
// Constant-time string comparison for secrets (the admin code word).
//
// A plain `a !== b` short-circuits at the first differing byte, so response
// timing leaks how many leading characters a guess got right. crypto's
// timingSafeEqual fixes that but throws if the two buffers differ in length —
// which would itself leak the secret's length. Hashing both sides first gives
// two fixed-width 32-byte digests, so length is never a factor.

import crypto from "crypto";

const digest = (value) =>
  crypto.createHash("sha256").update(String(value ?? ""), "utf8").digest();

export function safeEqual(a, b) {
  return crypto.timingSafeEqual(digest(a), digest(b));
}
