// test/api/admin-stats.test.js — the admin panel's learner numbers:
// GET /api/admin/stats and the per-player figures on GET /api/admin/players.

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

// The harness MUST be the first project import — see its header.
import {
  adminToken,
  api,
  db,
  fundWallet,
  registerUser,
  schema,
  setUserColumns,
  startServer,
  stopServer,
} from "./harness.js";
import { newId } from "../../src/db/index.js";

before(startServer);
after(stopServer);

/** Two parts of one story done, one quiz passed, two words learned, 10 minutes listened. */
async function giveProgress(userId) {
  await db().insert(schema.storyProgress).values({
    id: newId(),
    userId,
    difficulty: "medium",
    storyId: "maya",
    completedParts: [1, 2],
    currentPart: 3,
  });
  const progressId = newId();
  await db().insert(schema.progress).values({ id: progressId, userId, difficulty: "medium", completedLevels: [1, 2] });
  await db().insert(schema.progressLevelResult).values([
    { progressId, storyId: "maya", partNumber: 1, completed: true, correctAnswers: 5, totalQuestions: 5, completedAt: new Date() },
    { progressId, storyId: "maya", partNumber: 2, completed: false, correctAnswers: 2, totalQuestions: 5 },
  ]);
  await db().insert(schema.userLearnedWord).values([
    { userId, word: "luggage" },
    { userId, word: "roommate" },
  ]);
  await setUserColumns(userId, { totalListeningSeconds: 600 });
}

describe("admin learner stats", () => {
  it("refuses players and guests", async () => {
    const u = await registerUser();
    assert.equal((await api("GET", "/api/admin/stats", { token: u.token })).status, 401);
    assert.equal((await api("GET", "/api/admin/stats")).status, 401);
  });

  it("counts learners, what they have done and their coins", async () => {
    const admin = await adminToken();
    const before = (await api("GET", "/api/admin/stats", { token: admin })).body;

    const u = await registerUser({ prefix: "stats" });
    await giveProgress(u.id);
    await fundWallet(u.id, { bitAward: 7, bitWord: 3, bitPhrase: 1 });

    const res = await api("GET", "/api/admin/stats", { token: admin });
    assert.equal(res.status, 200);
    const after = res.body;

    assert.equal(after.users.total, before.users.total + 1);
    assert.equal(after.users.newLast7, before.users.newLast7 + 1);
    assert.equal(after.users.activeLast1, before.users.activeLast1 + 1);
    assert.equal(after.learning.learnersWithAPart, before.learning.learnersWithAPart + 1);
    assert.equal(after.learning.partsCompleted, before.learning.partsCompleted + 2);
    assert.equal(after.learning.byDifficulty.medium.parts, before.learning.byDifficulty.medium.parts + 2);
    assert.equal(after.learning.quizzesPassed, before.learning.quizzesPassed + 1);
    assert.equal(after.learning.wordsLearned, before.learning.wordsLearned + 2);
    assert.equal(after.learning.listeningSeconds, before.learning.listeningSeconds + 600);
    assert.equal(after.wallet.bitAward, before.wallet.bitAward + 7);

    // Thirty Moscow days, oldest first, today last and counting this sign-up.
    assert.equal(after.signupsByDay.length, 30);
    const today = after.signupsByDay.at(-1);
    assert.match(today.day, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(today.count >= 1);
  });

  it("adds each player's figures to the players list", async () => {
    const admin = await adminToken();
    const u = await registerUser({ prefix: "figs" });
    await giveProgress(u.id);
    const idle = await registerUser({ prefix: "idle" });

    const res = await api("GET", `/api/admin/players?q=${encodeURIComponent(u.username)}`, { token: admin });
    assert.equal(res.status, 200);
    const { stats } = res.body.players[0];
    assert.equal(stats.partsCompleted, 2);
    assert.equal(stats.storiesStarted, 1);
    assert.equal(stats.quizzesPassed, 1);
    assert.equal(stats.wordsLearned, 2);
    assert.equal(stats.listeningSeconds, 600);
    assert.ok(stats.lastPartAt);

    const none = await api("GET", `/api/admin/players?q=${encodeURIComponent(idle.username)}`, { token: admin });
    assert.deepEqual(
      { ...none.body.players[0].stats, lastPartAt: none.body.players[0].stats.lastPartAt },
      { partsCompleted: 0, storiesStarted: 0, quizzesPassed: 0, wordsLearned: 0, listeningSeconds: 0, lastPartAt: null },
    );
  });
});
