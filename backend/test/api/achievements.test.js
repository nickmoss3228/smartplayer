// test/api/achievements.test.js — the stored achievement tiers behind the
// Dashboard's achievement row: that each earn path records the tier it
// reached, that GET /api/progress/achievements reports it with the raw stats,
// and that a tier, once stored, is never lowered or erased.

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

// The harness MUST be the first project import — see its header.
import "./harness.js";
import { getQuizAnswerKey } from "../../src/config/quizData.js";
import { LEGACY_VOCAB_KEYS as VOCAB_KEY_SET } from "../../src/config/vocabKeys.js";
import { api, registerUser, setUserColumns, startServer, stopServer, userRow } from "./harness.js";

before(startServer);
after(stopServer);

const LEGACY_VOCAB_KEYS = [...VOCAB_KEY_SET];
const FREE = { difficulty: "easy", storyId: "leo", partNumber: 1 };

const achievements = async (u) => {
  const res = await api("GET", "/api/progress/achievements", { token: u.token });
  assert.equal(res.status, 200);
  return res.body;
};

const syncListening = (u, totalSeconds) =>
  api("PATCH", "/api/progress/listening-time", { token: u.token, body: { totalSeconds } });

function yesterdayUTC() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

describe("GET /api/progress/achievements", () => {
  it("requires a session", async () => {
    const res = await api("GET", "/api/progress/achievements");
    assert.equal(res.status, 401);
  });

  it("starts a new account with no tiers and zeroed stats", async () => {
    const u = await registerUser();
    const body = await achievements(u);
    assert.deepEqual(body.achievements, {
      listeningTime: null,
      questionsAnswered: null,
      studyStreak: null,
      storiesListened: null,
      wordsLearned: null,
    });
    assert.deepEqual(body.stats, {
      listeningSeconds: 0,
      questionsAnswered: 0,
      currentStreak: 0,
      longestStreak: 0,
      uniqueStoriesCount: 0,
      wordsLearned: 0,
    });
  });
});

describe("listening-time achievement", () => {
  it("stays unearned one second short of the first tier", async () => {
    const u = await registerUser();
    assert.equal((await syncListening(u, 3599)).status, 200);
    const body = await achievements(u);
    assert.equal(body.stats.listeningSeconds, 3599);
    assert.equal(body.achievements.listeningTime, null);
  });

  it("records bronze at one hour and climbs as the synced total grows", async () => {
    const u = await registerUser();
    await syncListening(u, 3600);
    assert.equal((await achievements(u)).achievements.listeningTime, "bronze");

    await syncListening(u, 36_000); // 10 hours — skips silver straight to gold
    const body = await achievements(u);
    assert.equal(body.achievements.listeningTime, "gold");
    assert.equal(body.stats.listeningSeconds, 36_000);
  });

  it("ignores a lower total rather than lowering the time or the tier", async () => {
    // A second browser with an older local counter syncs a smaller number.
    const u = await registerUser();
    await syncListening(u, 18_000);
    const res = await syncListening(u, 100);
    assert.equal(res.status, 200);
    assert.equal(res.body.totalListeningSeconds, 18_000);

    const body = await achievements(u);
    assert.equal(body.stats.listeningSeconds, 18_000);
    assert.equal(body.achievements.listeningTime, "silver");
  });

  it("rejects a malformed total without touching the tier", async () => {
    const u = await registerUser();
    for (const totalSeconds of [-1, "3600", null]) {
      const res = await syncListening(u, totalSeconds);
      assert.equal(res.status, 400, JSON.stringify(totalSeconds));
    }
    assert.equal((await achievements(u)).achievements.listeningTime, null);
  });
});

describe("study-streak achievement", () => {
  it("records bronze when a completion extends the streak to three days", async () => {
    const u = await registerUser();
    await setUserColumns(u.id, { streakCurrent: 2, streakLongest: 2, streakLastSubmittedDate: yesterdayUTC() });

    const key = getQuizAnswerKey(FREE.difficulty, FREE.storyId, FREE.partNumber);
    const res = await api("POST", "/api/progress/complete", {
      token: u.token,
      body: { ...FREE, answers: key },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.completed, true);

    const body = await achievements(u);
    assert.equal(body.stats.currentStreak, 3);
    assert.equal(body.achievements.studyStreak, "bronze");
  });

  it("keeps an earned streak tier after the streak breaks", async () => {
    // Medals are lifetime: the card follows the live streak, but the stored
    // tier must survive a missed day.
    const u = await registerUser();
    await setUserColumns(u.id, {
      achievementStudyStreak: "gold",
      streakCurrent: 0,
      streakLongest: 31,
    });

    // Any recompute path will do; listening sync re-evaluates every category
    // it has figures for, streak included.
    await syncListening(u, 60);

    const body = await achievements(u);
    assert.equal(body.stats.currentStreak, 0);
    assert.equal(body.achievements.studyStreak, "gold");
  });
});

describe("words-learned achievement", () => {
  it("records a tier from real vocabulary keys", async () => {
    const u = await registerUser();
    const words = LEGACY_VOCAB_KEYS.slice(0, 10);
    const res = await api("POST", "/api/progress/vocab-complete", { token: u.token, body: { words } });
    assert.equal(res.status, 200);

    const body = await achievements(u);
    assert.equal(body.stats.wordsLearned, 10);
    assert.equal(body.achievements.wordsLearned, "bronze");
  });

  it("does not count invented words toward the tier", async () => {
    const u = await registerUser();
    const words = Array.from({ length: 20 }, (_, i) => `zz-not-a-word-${i}`);
    const res = await api("POST", "/api/progress/vocab-complete", { token: u.token, body: { words } });
    assert.equal(res.status, 200);

    const body = await achievements(u);
    assert.equal(body.stats.wordsLearned, 0);
    assert.equal(body.achievements.wordsLearned, null);
  });

  it("is not wiped by earn paths that carry no word count", async () => {
    // The listening sync calls updateAchievements without wordsLearned; that
    // must read as "no information", not as zero words.
    const u = await registerUser();
    await setUserColumns(u.id, { achievementWordsLearned: "platinum" });
    await syncListening(u, 3600);

    const row = await userRow(u.id);
    assert.equal(row.achievementWordsLearned, "platinum");
    assert.equal(row.achievementListeningTime, "bronze");
  });
});

describe("tier storage", () => {
  it("never lowers a stored tier when the stats say less", async () => {
    const u = await registerUser();
    await setUserColumns(u.id, {
      achievementListeningTime: "crown",
      achievementQuestionsAnswered: "platinum",
      achievementStoriesListened: "gold",
    });
    await syncListening(u, 3600); // would compute bronze / null / null

    const body = await achievements(u);
    assert.equal(body.achievements.listeningTime, "crown");
    assert.equal(body.achievements.questionsAnswered, "platinum");
    assert.equal(body.achievements.storiesListened, "gold");
  });
});
