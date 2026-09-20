// test/api/commerce-admin.test.js — the fake-acquirer payment loop end to end,
// admin tooling, the Story Builder through to playback, and feedback.

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

// The harness MUST be the first project import — see its header.
import {
  ADMIN_CODE,
  adminToken,
  api,
  fundWallet,
  registerUser,
  startServer,
  stopServer,
  userRow,
} from "./harness.js";

before(startServer);
after(stopServer);

const LOCKED_QUIZ = "/api/progress/quiz/easy/leo/5";

/** Poll an order until settlement has decided it (the callback is async). */
async function settled(u, orderId, { until = (o) => o.status !== "pending", timeoutMs = 8000 } = {}) {
  const started = Date.now();
  for (;;) {
    const res = await api("GET", `/api/payments/orders/${orderId}`, { token: u.token });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    if (until(res.body)) return res.body;
    if (Date.now() - started > timeoutMs) {
      assert.fail(`order ${orderId} never settled: ${JSON.stringify(res.body)}`);
    }
    await new Promise((r) => setTimeout(r, 50));
  }
}

const fakeIdOf = (confirmationUrl) => new URL(confirmationUrl).searchParams.get("fp");

async function placeOrder(u, skus = ["story-easy-leo"]) {
  const res = await api("POST", "/api/payments/orders", { token: u.token, body: { skus } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body;
}

describe("payments", () => {
  it("config reports the fake driver as live", async () => {
    const res = await api("GET", "/api/payments/config");
    assert.equal(res.status, 200);
    assert.equal(res.body.enabled, true);
    assert.equal(res.body.fake, true);
    assert.ok(res.body.purchasableSkus.includes("story-easy-leo"));
  });

  it("pay → callback → entitlement → the locked part opens", async () => {
    const u = await registerUser();
    assert.equal((await api("GET", LOCKED_QUIZ, { token: u.token })).status, 403);

    const order = await placeOrder(u);
    assert.equal(order.amountMinor, 10 * 2900);

    const act = await api("POST", `/api/payments/fake/${fakeIdOf(order.confirmationUrl)}/act`, {
      body: { action: "pay" },
    });
    assert.equal(act.status, 200, JSON.stringify(act.body));

    const done = await settled(u, order.orderId, { until: (o) => o.granted });
    assert.equal(done.status, "succeeded");

    const ent = await api("GET", "/api/user/entitlements", { token: u.token });
    assert.deepEqual(ent.body.ownedStories, ["easy/leo"]);
    assert.equal((await api("GET", LOCKED_QUIZ, { token: u.token })).status, 200);

    const history = await api("GET", "/api/payments/orders", { token: u.token });
    assert.equal(history.body.orders.length, 1);

    // Buying it again is refused rather than charged twice.
    const again = await api("POST", "/api/payments/orders", { token: u.token, body: { skus: ["story-easy-leo"] } });
    assert.equal(again.status, 409);
  });

  it("a duplicated callback grants exactly once", async () => {
    const u = await registerUser();
    const order = await placeOrder(u);
    await api("POST", `/api/payments/fake/${fakeIdOf(order.confirmationUrl)}/act`, {
      body: { action: "pay", sim: { deliver: "twice" } },
    });
    await settled(u, order.orderId, { until: (o) => o.granted });
    await new Promise((r) => setTimeout(r, 600)); // the duplicate lands ~200ms behind

    const { db, schema } = await import("./harness.js");
    const { eq } = await import("drizzle-orm");
    const rows = await db().select().from(schema.userEntitlement).where(eq(schema.userEntitlement.userId, u.id));
    assert.equal(rows.length, 1);
  });

  it("a callback with the wrong amount grants nothing", async () => {
    const u = await registerUser();
    const order = await placeOrder(u);
    await api("POST", `/api/payments/fake/${fakeIdOf(order.confirmationUrl)}/act`, {
      body: { action: "pay", sim: { amount: "wrong" } },
    });
    await new Promise((r) => setTimeout(r, 800));
    const state = (await api("GET", `/api/payments/orders/${order.orderId}`, { token: u.token })).body;
    assert.equal(state.granted, false);
    assert.deepEqual((await api("GET", "/api/user/entitlements", { token: u.token })).body.ownedStories, []);
  });

  it("a declined payment fails and grants nothing; deciding twice is refused", async () => {
    const u = await registerUser();
    const order = await placeOrder(u);
    const fp = fakeIdOf(order.confirmationUrl);
    await api("POST", `/api/payments/fake/${fp}/act`, { body: { action: "decline" } });
    const done = await settled(u, order.orderId);
    assert.equal(done.status, "failed");
    assert.equal(done.granted, false);

    const twice = await api("POST", `/api/payments/fake/${fp}/act`, { body: { action: "pay" } });
    assert.equal(twice.status, 409);
  });

  it("refuses client-supplied prices, unknown SKUs, empty baskets and guests", async () => {
    const u = await registerUser();
    for (const body of [
      { skus: ["story-easy-leo"], amountMinor: 1 },
      { skus: ["story-does-not-exist"] },
      { skus: [] },
      { skus: "story-easy-leo" },
      {},
    ]) {
      const res = await api("POST", "/api/payments/orders", { token: u.token, body });
      assert.equal(res.status, 400, JSON.stringify(body));
    }
    assert.equal((await api("POST", "/api/payments/orders", { body: { skus: ["story-easy-leo"] } })).status, 401);
  });

  it("an order is visible only to its buyer", async () => {
    const a = await registerUser();
    const b = await registerUser();
    const order = await placeOrder(a);
    assert.equal((await api("GET", `/api/payments/orders/${order.orderId}`, { token: b.token })).status, 404);
    assert.equal((await api("GET", "/api/payments/orders/not-a-uuid", { token: a.token })).status, 404);
  });

  it("a forged webhook is refused and grants nothing", async () => {
    const u = await registerUser();
    const order = await placeOrder(u);
    const body = JSON.stringify({
      paymentId: fakeIdOf(order.confirmationUrl),
      clientOrderId: order.orderId,
      status: "PAID",
      amount: order.amountMinor / 100,
      currency: "RUB",
      paidAt: new Date().toISOString(),
    });

    const noToken = await api("POST", `/api/payments/fake/webhook?order=${order.orderId}`, { body });
    const badToken = await api("POST", `/api/payments/fake/webhook?order=${order.orderId}&t=deadbeef`, { body });
    assert.ok([400, 403].includes(noToken.status), `no token -> ${noToken.status}`);
    assert.equal(badToken.status, 403);

    const wrongDriver = await api("POST", `/api/payments/yookassa/webhook?order=${order.orderId}`, { body });
    assert.equal(wrongDriver.status, 404);

    const state = (await api("GET", `/api/payments/orders/${order.orderId}`, { token: u.token })).body;
    assert.equal(state.granted, false);
  });

  it("the fake control surface 404s unknown payments and actions", async () => {
    assert.equal((await api("GET", "/api/payments/fake/fake_nope")).status, 404);
    const u = await registerUser();
    const order = await placeOrder(u);
    const res = await api("POST", `/api/payments/fake/${fakeIdOf(order.confirmationUrl)}/act`, {
      body: { action: "steal" },
    });
    assert.equal(res.status, 404);
  });
});

describe("admin", () => {
  it("login refuses a wrong or missing code word, and admin routes refuse player tokens", async () => {
    assert.equal((await api("POST", "/api/admin/login", { body: { code: "wrong" } })).status, 401);
    assert.equal((await api("POST", "/api/admin/login", { body: {} })).status, 400);
    assert.equal((await api("POST", "/api/admin/login", { body: { code: { a: 1 } } })).status, 401);

    const u = await registerUser();
    assert.equal((await api("GET", "/api/admin/players", { token: u.token })).status, 401);
    assert.equal((await api("GET", "/api/admin/players")).status, 401);
    assert.ok(ADMIN_CODE);
  });

  it("lists and filters players", async () => {
    const admin = await adminToken();
    const u = await registerUser({ prefix: "adm" });
    const res = await api("GET", `/api/admin/players?q=${encodeURIComponent(u.username)}`, { token: admin });
    assert.equal(res.status, 200);
    assert.equal(res.body.players.length, 1);
    assert.equal(res.body.players[0].id, u.id);
    assert.ok(!("password" in res.body.players[0]));
    assert.ok(res.body.players[0].sharing);
  });

  it("grants currency, refuses deductions and unknown users", async () => {
    const admin = await adminToken();
    const u = await registerUser();
    const ok = await api("POST", "/api/admin/grant-currency", { token: admin, body: { userId: u.id, bitAward: 50 } });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.wallet.bitAward, 50);

    assert.equal((await api("POST", "/api/admin/grant-currency", { token: admin, body: { userId: u.id, bitAward: -5 } })).status, 400);
    assert.equal((await api("POST", "/api/admin/grant-currency", { token: admin, body: { userId: u.id } })).status, 400);
    assert.equal(
      (await api("POST", "/api/admin/grant-currency", { token: admin, body: { userId: "00000000-0000-4000-8000-000000000000", bitAward: 1 } })).status,
      404,
    );
  });

  it("grants a trial entitlement, extends it, and revokes it", async () => {
    const admin = await adminToken();
    const u = await registerUser();
    const grant = await api("POST", "/api/admin/grant-entitlement", {
      token: admin,
      body: { userId: u.id, sku: "set-leo", days: 7 },
    });
    assert.equal(grant.status, 200, JSON.stringify(grant.body));
    const firstExpiry = new Date(grant.body.entitlements[0].expiresAt).getTime();

    const extend = await api("POST", "/api/admin/grant-entitlement", {
      token: admin,
      body: { userId: u.id, sku: "set-leo", days: 7 },
    });
    const secondExpiry = new Date(extend.body.entitlements[0].expiresAt).getTime();
    assert.ok(secondExpiry - firstExpiry > 6 * 24 * 3600 * 1000, "a repeat grant should extend, not reset");
    assert.equal(extend.body.entitlements.length, 1);

    for (const days of [0, -1, 1.5, "abc"]) {
      const bad = await api("POST", "/api/admin/grant-entitlement", { token: admin, body: { userId: u.id, sku: "set-leo", days } });
      assert.equal(bad.status, 400, `days=${days}`);
    }
    assert.equal((await api("POST", "/api/admin/grant-entitlement", { token: admin, body: { userId: u.id, sku: "nope" } })).status, 400);

    const revoke = await api("DELETE", "/api/admin/entitlement", { token: admin, body: { userId: u.id, sku: "set-leo" } });
    assert.equal(revoke.status, 200);
    assert.equal(revoke.body.removed, 1);
    assert.deepEqual(revoke.body.entitlements, []);
  });

  it("a ban signs the player out at once, and an unban lets them back in", async () => {
    const admin = await adminToken();
    const u = await registerUser();
    const ban = await api("PATCH", `/api/admin/players/${u.id}/ban`, { token: admin, body: { banned: true } });
    assert.equal(ban.status, 200);
    const blocked = await api("GET", "/api/progress/wallet", { token: u.token });
    assert.equal(blocked.status, 403);
    assert.equal(blocked.body.code, "ACCOUNT_BANNED");

    assert.equal((await api("PATCH", `/api/admin/players/${u.id}/ban`, { token: admin, body: { banned: "yes" } })).status, 400);
    assert.equal((await api("PATCH", "/api/admin/players/nope/ban", { token: admin, body: { banned: true } })).status, 404);

    await api("PATCH", `/api/admin/players/${u.id}/ban`, { token: admin, body: { banned: false } });
    assert.equal((await api("GET", "/api/progress/wallet", { token: u.token })).status, 200);
  });

  it("reviews progress and resets a school without touching the wallet", async () => {
    const admin = await adminToken();
    const u = await registerUser();
    await api("GET", "/api/progress/school", { token: u.token });
    await fundWallet(u.id, { bitAward: 77 });

    const progress = await api("GET", `/api/admin/players/${u.id}/progress`, { token: admin });
    assert.equal(progress.status, 200, JSON.stringify(progress.body));
    assert.equal(progress.body.learnedWordsCount, 0);

    const reset = await api("POST", `/api/admin/players/${u.id}/reset-school`, { token: admin });
    assert.equal(reset.status, 200);
    assert.equal((await userRow(u.id)).bitAward, 77);
    assert.equal((await api("POST", "/api/admin/players/not-a-uuid/reset-school", { token: admin })).status, 404);
    assert.equal((await api("GET", "/api/admin/players/not-a-uuid/progress", { token: admin })).status, 404);
  });

  it("records mutating admin actions in the audit log, attributed to the admin", async () => {
    const admin = await adminToken();
    const u = await registerUser();
    await api("POST", "/api/admin/grant-currency", { token: admin, body: { userId: u.id, bitWord: 3 } });

    // The audit write happens after the response is sent.
    let entry;
    for (let i = 0; i < 40 && !entry; i++) {
      const log = await api("GET", `/api/admin/audit?targetId=${u.id}`, { token: admin });
      assert.equal(log.status, 200);
      entry = log.body.entries[0];
      if (!entry) await new Promise((r) => setTimeout(r, 50));
    }
    assert.ok(entry, "no audit entry was written");
    assert.equal(entry.actor.name, "tester");
    assert.equal(entry.statusCode, 200);
  });
});

describe("Story Builder → playback", () => {
  const storyId = () => `test-story-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`;
  const markers = [
    { time: 0, label: "start", color: "#ff0000" },
    { time: 5, label: "end", color: "#00ff00" },
  ];
  const quiz = [
    { question: "Q1?", options: ["a", "b", "c", "d"], correctAnswer: 2 },
    { question: "Q2?", options: ["a", "b", "c", "d"], correctAnswer: 0 },
  ];

  async function buildStory(admin, id = storyId()) {
    const create = await api("POST", "/api/admin/stories", {
      token: admin,
      body: { difficulty: "easy", storyId: id, storyName: "Test Story", totalParts: 1 },
    });
    assert.equal(create.status, 201, JSON.stringify(create.body));
    return { id, dbId: create.body.story._id };
  }

  it("creates, edits, publishes and plays a story; its quiz pays out", async () => {
    const admin = await adminToken();
    const { id, dbId } = await buildStory(admin);

    const notReady = await api("PATCH", `/api/admin/stories/${dbId}/publish`, { token: admin, body: { published: true } });
    assert.equal(notReady.status, 400);

    const m = await api("PATCH", `/api/admin/stories/${dbId}/parts/1/markers`, {
      token: admin,
      body: { timeMarkers: [markers[1], markers[0]], audioUrl: "https://example.test/a.mp3" },
    });
    assert.equal(m.status, 200, JSON.stringify(m.body));
    assert.deepEqual(m.body.part.timeMarkers.map((x) => x.time), [0, 5]);

    const vocab = await api("PUT", `/api/admin/stories/${dbId}/parts/1/vocabulary`, {
      token: admin,
      body: { vocabulary: [{ audioKey: `${id}-word`, word: "слово" }] },
    });
    assert.equal(vocab.status, 200, JSON.stringify(vocab.body));

    const q = await api("PUT", `/api/admin/stories/${dbId}/parts/1/quiz`, { token: admin, body: { quiz } });
    assert.equal(q.status, 200, JSON.stringify(q.body));

    // Unpublished: invisible to players.
    assert.equal((await api("GET", `/api/stories/easy/${id}`)).status, 404);

    // Free ON PURPOSE, which is now the only way a story is free.
    //
    // This used to be implicit: a story no price catalog listed was given away,
    // so a freshly built story was playable by anyone. That rule is gone — it
    // was what put Story Builder stories, unlocked, on every logged-out
    // learner's shelf — and an unpriced story is refused instead. A published
    // story is paid by default, and this one-part story would otherwise get a
    // 30-second preview, which also refuses its quiz (a preview is a listen,
    // not a lesson). `paid: false` is the deliberate act that makes it free.
    const free = await api("PATCH", `/api/admin/stories/${dbId}`, {
      token: admin,
      body: { paid: false },
    });
    assert.equal(free.status, 200, JSON.stringify(free.body));

    const pub = await api("PATCH", `/api/admin/stories/${dbId}/publish`, { token: admin, body: { published: true } });
    assert.equal(pub.status, 200, JSON.stringify(pub.body));

    const list = await api("GET", "/api/stories/easy");
    assert.ok(list.body.stories.some((s) => s.storyId === id));

    const story = await api("GET", `/api/stories/easy/${id}`);
    assert.equal(story.status, 200, JSON.stringify(story.body));
    assert.equal(story.body.owned, true); // paid: false → free to everyone
    assert.equal(story.body.parts[0].locked, false);
    assert.ok(story.body.parts[0].quiz.every((x) => !("correctAnswer" in x)));

    const u = await registerUser();
    const wrong = await api("POST", "/api/progress/complete", {
      token: u.token,
      body: { difficulty: "easy", storyId: id, partNumber: 1, answers: [0, 1] },
    });
    assert.equal(wrong.body.completed, false);
    const right = await api("POST", "/api/progress/complete", {
      token: u.token,
      body: { difficulty: "easy", storyId: id, partNumber: 1, answers: [2, 0] },
    });
    assert.equal(right.status, 200, JSON.stringify(right.body));
    assert.equal(right.body.completed, true);

    // A DB-authored vocabulary key is accepted by vocab-complete.
    const learned = await api("POST", "/api/progress/vocab-complete", {
      token: u.token,
      body: { words: [`${id}-word`] },
    });
    assert.equal(learned.status, 200);
    assert.equal(learned.body.wallet.bitWord, 1, "a word from a freshly published story was not credited");

    const overview = await api("GET", "/api/progress/overview", { token: u.token });
    assert.ok(overview.body.easy.stories.some((s) => s.storyId === id));
  });

  it("refuses bad Story Builder input", async () => {
    const admin = await adminToken();
    for (const body of [
      { difficulty: "extreme", storyId: "x", storyName: "x", totalParts: 1 },
      { difficulty: "easy", storyId: "", storyName: "x", totalParts: 1 },
      { difficulty: "easy", storyId: "x", storyName: "x", totalParts: 0 },
      { difficulty: "easy", storyId: "leo", storyName: "x", totalParts: 1 },
      { difficulty: "easy", storyId: 42, storyName: "x", totalParts: 1 },
    ]) {
      const res = await api("POST", "/api/admin/stories", { token: admin, body });
      assert.ok([400, 409].includes(res.status), `${JSON.stringify(body)} -> ${res.status}`);
    }

    const { id, dbId } = await buildStory(admin);
    const dup = await api("POST", "/api/admin/stories", {
      token: admin,
      body: { difficulty: "easy", storyId: id, storyName: "again", totalParts: 1 },
    });
    assert.equal(dup.status, 409);

    for (const quizBody of [
      { quiz: "no" },
      { quiz: [{ question: "?", options: ["a"], correctAnswer: 0 }] },
      { quiz: [{ question: "?", options: ["a", "b", "c", "d"], correctAnswer: 4 }] },
    ]) {
      const res = await api("PUT", `/api/admin/stories/${dbId}/parts/1/quiz`, { token: admin, body: quizBody });
      assert.equal(res.status, 400, JSON.stringify(quizBody));
    }
    const vocab = await api("PUT", `/api/admin/stories/${dbId}/parts/1/vocabulary`, {
      token: admin,
      body: { vocabulary: [{ audioKey: "a", word: "x" }, { audioKey: "A", word: "y" }] },
    });
    assert.equal(vocab.status, 400);
    assert.equal((await api("PUT", `/api/admin/stories/${dbId}/parts/99/quiz`, { token: admin, body: { quiz: [] } })).status, 404);
    assert.equal((await api("GET", "/api/admin/stories/not-a-uuid", { token: admin })).status, 404);
  });

  it("adds a part, renames, hides, and deletes a story — markers survive a re-create", async () => {
    const admin = await adminToken();
    const { id, dbId } = await buildStory(admin);

    const added = await api("POST", `/api/admin/stories/${dbId}/parts`, { token: admin });
    assert.equal(added.status, 201);
    assert.equal(added.body.story.totalParts, 2);

    const renamed = await api("PATCH", `/api/admin/stories/${dbId}`, { token: admin, body: { storyName: "Renamed" } });
    assert.equal(renamed.status, 200);
    assert.equal(renamed.body.story.storyName, "Renamed");

    const hide = await api("PUT", `/api/admin/stories/visibility/easy/${id}`, { token: admin, body: { hidden: true } });
    assert.equal(hide.status, 200);
    assert.ok((await api("GET", "/api/stories/easy")).body.hidden.includes(id));

    await api("PATCH", `/api/admin/stories/${dbId}/parts/1/markers`, { token: admin, body: { timeMarkers: markers } });
    assert.equal((await api("DELETE", `/api/admin/stories/${dbId}`, { token: admin })).status, 200);
    assert.equal((await api("GET", `/api/admin/stories/${dbId}`, { token: admin })).status, 404);

    const recreated = await buildStory(admin, id);
    const fetched = await api("GET", `/api/admin/stories/${recreated.dbId}`, { token: admin });
    assert.equal(fetched.body.story.parts[0].timeMarkers.length, 2);
  });
});

describe("feedback", () => {
  it("anyone can submit; only an admin can read and delete", async () => {
    const res = await api("POST", "/api/feedback", { body: { name: "Tester", message: "Hello there" } });
    assert.equal(res.status, 201);
    const id = res.body.feedback._id;

    assert.equal((await api("GET", "/api/feedback")).status, 401);
    const admin = await adminToken();
    const list = await api("GET", "/api/feedback", { token: admin });
    assert.ok(list.body.feedback.some((f) => f._id === id));

    assert.equal((await api("DELETE", `/api/feedback/${id}`, { token: admin })).status, 200);
    assert.equal((await api("DELETE", "/api/feedback/not-a-uuid", { token: admin })).status, 404);
  });

  it("refuses empty, oversized and non-string submissions with 400", async () => {
    for (const body of [
      {},
      { name: " ", message: "x" },
      { name: "x", message: "y".repeat(2001) },
      { name: 42, message: "hello" },
      { name: "x", message: ["hello"] },
    ]) {
      const res = await api("POST", "/api/feedback", { body });
      assert.equal(res.status, 400, JSON.stringify(body).slice(0, 60));
    }
  });
});

describe("malformed requests", () => {
  it("invalid JSON is a 400, not a 500", async () => {
    const res = await api("POST", "/api/login", {
      body: "{not json",
      headers: { "Content-Type": "application/json" },
    });
    assert.equal(res.status, 400);
  });

  it("an unknown difficulty on the progress catch-all is a 400", async () => {
    const u = await registerUser();
    assert.equal((await api("GET", "/api/progress/extreme", { token: u.token })).status, 400);
  });
});
