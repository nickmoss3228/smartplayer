// db/repos/levelKey.test.ts — run with `npm run test:db`
//
// parseLevelKey is the single riskiest pure function in the migration.
//
// Progress.levelResults was a Mongo Map keyed `${storyId}:${partNumber}`, and
// the ETL splits every one of those keys to build progress_level_result rows.
// A key it parses WRONG silently files a student's quiz result under the wrong
// story; a key it REFUSES loses that result entirely. Both are invisible until
// a user notices their progress is off, long after Atlas is gone.
//
// The rule is "split on the LAST colon", and these cases are why.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { levelKey, parseLevelKey } from "./progress.repo.js";

describe("parseLevelKey", () => {
  it("parses a plain slug", () => {
    assert.deepEqual(parseLevelKey("leo:1"), { storyId: "leo", partNumber: 1 });
  });

  it("parses slugs containing hyphens", () => {
    // These are the real ones from config/storyRegistry.js — hyphens are
    // everywhere in the slugs and must not be treated as separators.
    assert.deepEqual(parseLevelKey("leo-additional:3"), {
      storyId: "leo-additional",
      partNumber: 3,
    });
    assert.deepEqual(parseLevelKey("news-roland-garros:2"), {
      storyId: "news-roland-garros",
      partNumber: 2,
    });
    assert.deepEqual(parseLevelKey("news-grazing-board:5"), {
      storyId: "news-grazing-board",
      partNumber: 5,
    });
  });

  it("splits on the LAST colon, not the first", () => {
    // No current slug contains a colon, but the split rule has to be the safe
    // one anyway: if a slug ever does, the part number is still the tail.
    assert.deepEqual(parseLevelKey("odd:slug:7"), { storyId: "odd:slug", partNumber: 7 });
  });

  it("handles multi-digit part numbers", () => {
    assert.deepEqual(parseLevelKey("maya:12"), { storyId: "maya", partNumber: 12 });
  });

  it("refuses a key with no colon", () => {
    assert.equal(parseLevelKey("leo"), null);
  });

  it("refuses a key with an empty story id", () => {
    // lastIndexOf(":") === 0 would otherwise yield storyId: "".
    assert.equal(parseLevelKey(":1"), null);
  });

  it("refuses a non-integer part number", () => {
    assert.equal(parseLevelKey("leo:abc"), null);
    assert.equal(parseLevelKey("leo:1.5"), null);
    assert.equal(parseLevelKey("leo:"), null);
  });

  it("round-trips with levelKey for every real slug shape", () => {
    for (const storyId of ["leo", "leo-additional", "maya", "daniel", "news-family-visit"]) {
      for (const partNumber of [1, 2, 9, 10, 20]) {
        assert.deepEqual(parseLevelKey(levelKey(storyId, partNumber)), { storyId, partNumber });
      }
    }
  });
});
