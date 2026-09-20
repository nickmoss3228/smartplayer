// db/ids.test.ts — run with `npm run test:db`
//
// newId() runs app-side because a payment's id is handed to the acquirer as
// the idempotence key before the row exists. derivedId() is what keeps the
// content ETL re-runnable. Both being subtly wrong fails quietly.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { assertId, derivedId, isId, newId } from "./ids.js";

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const V5 = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("newId", () => {
  it("produces canonical v4 uuids", () => {
    for (let i = 0; i < 1000; i++) assert.match(newId(), V4);
  });

  it("does not collide across a tight loop", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50_000; i++) ids.add(newId());
    assert.equal(ids.size, 50_000);
  });
});

describe("derivedId", () => {
  it("is a valid v5 uuid, so it fits a uuid column", () => {
    assert.match(derivedId("story_part", "abc", 1), V5);
  });

  it("is stable across calls — the property the ETL's re-runs depend on", () => {
    assert.equal(derivedId("story_part", "abc", 1), derivedId("story_part", "abc", 1));
  });

  it("differs when any part differs", () => {
    assert.notEqual(derivedId("story_part", "abc", 1), derivedId("story_part", "abc", 2));
    assert.notEqual(derivedId("story_part", "abc", 1), derivedId("story_part_vocab", "abc", 1));
  });

  it("does not collide when the boundary between parts moves", () => {
    // Joining with a printable separator would make these equal.
    assert.notEqual(derivedId("ab", "c"), derivedId("a", "bc"));
    assert.notEqual(derivedId("a b", "c"), derivedId("a", "b c"));
  });
});

describe("isId / assertId", () => {
  it("accepts what newId and derivedId produce", () => {
    assert.equal(isId(newId()), true);
    assert.equal(isId(derivedId("x", 1)), true);
  });

  it("rejects the old ObjectId hex shape", () => {
    assert.equal(isId("507f1f77bcf86cd799439011"), false);
  });

  it("rejects uppercase and non-strings", () => {
    assert.equal(isId(newId().toUpperCase()), false);
    assert.equal(isId(null), false);
    assert.equal(isId(123), false);
  });

  it("assertId throws naming the field", () => {
    assert.throws(() => assertId("nope", "userId"), /Invalid userId/);
    const id = newId();
    assert.equal(assertId(id), id);
  });
});
