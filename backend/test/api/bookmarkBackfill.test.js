// test/api/bookmarkBackfill.test.js — src/scripts/backfillStoryBookmarks.js,
// run for real as a child process against the test database.
//
// The stuck bookmark is planted by hand: the bug that produced it (a TEXT
// comparison in completeStoryPart) is fixed, so the app can no longer make one.

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { after, before, it } from "node:test";

// The harness MUST be the first project import — see its header.
import "./harness.js";
import { getQuizAnswerKey } from "../../src/config/quizData.js";
import { api, db, registerUser, schema, startServer, stopServer } from "./harness.js";

before(startServer);
after(stopServer);

const run = promisify(execFile);
const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// The harness has already pointed DATABASE_URL at smartplayer_test, and the
// child inherits it.
const backfill = (...args) =>
  run(process.execPath, ["--import", "tsx", "src/scripts/backfillStoryBookmarks.js", ...args], {
    cwd: backendDir,
    env: process.env,
  });

async function bookmark(userId) {
  const { and, eq } = await import("drizzle-orm");
  const [row] = await db()
    .select()
    .from(schema.storyProgress)
    .where(and(eq(schema.storyProgress.userId, userId), eq(schema.storyProgress.storyId, "leo")));
  return row;
}

it("reports a stuck bookmark without writing, then repairs it with --apply", async () => {
  const u = await registerUser();
  for (const partNumber of [1, 2, 3]) {
    const res = await api("POST", "/api/progress/complete", {
      token: u.token,
      body: {
        difficulty: "easy",
        storyId: "leo",
        partNumber,
        answers: getQuizAnswerKey("easy", "leo", partNumber),
      },
    });
    assert.equal(res.body.completed, true, `part ${partNumber}`);
  }

  // What the bug left behind: parts 1–3 done, bookmark still on 2.
  const { eq } = await import("drizzle-orm");
  const planted = await bookmark(u.id);
  await db()
    .update(schema.storyProgress)
    .set({ currentPart: 2 })
    .where(eq(schema.storyProgress.id, planted.id));

  const report = await backfill();
  assert.match(report.stdout, /smartplayer_test/);
  assert.match(report.stdout, /part 2 -> 4/);
  assert.equal((await bookmark(u.id)).currentPart, 2, "report-only mode wrote");

  await backfill("--apply");
  const repaired = await bookmark(u.id);
  assert.equal(repaired.currentPart, 4);
  assert.deepEqual(repaired.completedParts, [1, 2, 3]);

  // Idempotent: a second run finds nothing to do for this user.
  const again = await backfill("--apply");
  assert.doesNotMatch(again.stdout, new RegExp(u.id));
});
