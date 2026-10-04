import test from "node:test";
import assert from "node:assert/strict";

import { repairedBookmark } from "./backfillStoryBookmarks.js";

test("moves a stuck bookmark to the first part not yet completed", () => {
  assert.equal(repairedBookmark([1, 2], 10), 3);
  assert.equal(repairedBookmark([1, 2, 3, 4], 10), 5);
});

test("fills a gap before running ahead", () => {
  assert.equal(repairedBookmark([1, 2, 5], 10), 3);
});

test("a finished story rests on its last part", () => {
  assert.equal(repairedBookmark([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 10), 10);
  assert.equal(repairedBookmark([2, 1], 2), 2);
});

test("ignores completed parts beyond the story's length", () => {
  assert.equal(repairedBookmark([1, 2, 11], 3), 3);
});
