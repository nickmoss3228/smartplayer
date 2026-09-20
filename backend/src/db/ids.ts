// db/ids.ts
//
// Primary keys are uuids, minted in application code.
//
// App-side rather than a column DEFAULT gen_random_uuid(), for one property
// that matters: the id exists before the row is durable. A payment's id is
// sent to the acquirer as the idempotence key BEFORE the provider is called,
// so that a retried create reuses it — which only works if we already know it.
//
// (This schema briefly used char(24) holding Mongo ObjectId hex, to keep live
// tokens and payment references valid across the move. The app had not
// launched and everyone re-registers, so that constraint no longer exists.)

import { createHash, randomUUID } from "node:crypto";

/** A fresh random (v4) uuid. */
export function newId(): string {
  return randomUUID();
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * True if `value` is a canonical lowercase uuid.
 *
 * Postgres's `uuid` type would reject a malformed value anyway, but as a query
 * ERROR — which a route handler turns into a 500. Checking first lets it answer
 * 400 for "malformed" and 404 for "absent", which are different things.
 */
export function isId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

/** Narrowing guard for ids arriving from a request path or body. */
export function assertId(value: unknown, what = "id"): string {
  if (!isId(value)) throw new TypeError(`Invalid ${what}: expected a uuid`);
  return value;
}

// A fixed namespace for this application's derived ids. Arbitrary, but must
// never change: every derived id depends on it.
const NAMESPACE = Buffer.from("6f1c2a9e4b7d4e5f8a3c1d2e3f405162", "hex");

/**
 * A STABLE uuid derived from the values that identify a row (RFC 9562 v5).
 *
 * For rows that other rows point at but that have no natural id of their own —
 * `story_part` is the case that forced this. Minting a random id for it on
 * every ETL run made the ETL non-idempotent: a re-run's
 * `ON CONFLICT (story_pk, part_number) DO NOTHING` correctly skipped the parent
 * while its vocab, quiz and marker rows referenced the freshly minted id, which
 * was therefore never inserted, and the second run died on a foreign key.
 * Deriving the id from the natural key means a re-run reproduces the same ids.
 */
export function derivedId(...parts: (string | number)[]): string {
  const hash = createHash("sha1")
    .update(NAMESPACE)
    // NUL separator, so ("ab", "c") and ("a", "bc") cannot collide.
    .update(parts.join("\u0000"))
    .digest();

  hash[6] = (hash[6]! & 0x0f) | 0x50; // version 5
  hash[8] = (hash[8]! & 0x3f) | 0x80; // RFC variant

  const hex = hash.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
