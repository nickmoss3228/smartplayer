// db/integration.test.ts
//
//   docker run -d --name smartplayer-postgres \
//     -e POSTGRES_USER=smartplayer -e POSTGRES_PASSWORD=smartplayer \
//     -e POSTGRES_DB=smartplayer_dev -p 127.0.0.1:5432:5432 postgres:16-alpine
//   npm run db:migrate
//   npm run test:integration
//
// Skips itself when DATABASE_URL is unset, so `npm run test:db` stays runnable
// with no database.
//
// ── What these are for ─────────────────────────────────────────────────────
//
// Not coverage. Each test here pins one property that the Mongo code achieved
// through a conditional-write idiom, and that a plausible-looking Drizzle
// refactor would quietly break — the kind of breakage that shows up as a user
// being paid twice, or being signed out, rather than as a failing request.
//
// The improvement backlog already names spendCurrency's atomic
// findOneAndUpdate as "the best code in the backend and completely untested".
// It is also the single most migration-sensitive thing in it. Start there.

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { eq, sql } from "drizzle-orm";

import { closeDb, db, isConfigured } from "./client.js";
import { newId } from "./ids.js";
import * as entitlements from "./repos/entitlements.repo.js";
import * as payments from "./repos/payments.repo.js";
import * as progressRepo from "./repos/progress.repo.js";
import * as sessions from "./repos/sessions.repo.js";
import * as wallet from "./repos/wallet.repo.js";
import { payment, progressLevelResult, userEntitlement, users } from "./schema.js";

const SKIP = !isConfigured();

/** A throwaway account. Cascades clean up everything hanging off it. */
async function makeUser(overrides: Partial<typeof users.$inferInsert> = {}): Promise<string> {
  const id = newId();
  await db()
    .insert(users)
    .values({
      id,
      username: `test_${id}`,
      password: "not-a-real-hash",
      schoolLayoutId: "rows",
      schoolWallpaperId: "chalk",
      schoolFloorId: "parquet",
      schoolVariantId: "courtyard",
      ...overrides,
    });
  return id;
}

/**
 * Assert that a write was refused by a specific database constraint.
 *
 * Drizzle wraps driver errors in a DrizzleQueryError whose message is only the
 * failed SQL and its parameters — the constraint name lives on the pg error
 * underneath, at `.cause.constraint`. Matching on the wrapper's message
 * therefore passes for ANY failure of that statement, which would make these
 * tests claim a constraint works when the query merely broke.
 */
async function refusedBy(fn: () => Promise<unknown>, constraint: string): Promise<void> {
  try {
    await fn();
  } catch (error) {
    const cause = (error as { cause?: { constraint?: string } }).cause;
    assert.equal(
      cause?.constraint,
      constraint,
      `expected constraint ${constraint}, got ${cause?.constraint ?? String(error)}`,
    );
    return;
  }
  assert.fail(`expected ${constraint} to reject the write, but it succeeded`);
}

const created: string[] = [];
async function user(overrides: Partial<typeof users.$inferInsert> = {}): Promise<string> {
  const id = await makeUser(overrides);
  created.push(id);
  return id;
}

describe("postgres integration", { skip: SKIP ? "DATABASE_URL not set" : false }, () => {
  before(async () => {
    // Fail loudly rather than silently testing an empty schema.
    const t = await db().execute<{ n: string }>(
      sql`SELECT count(*) AS n FROM information_schema.tables WHERE table_schema='public'`,
    );
    assert.ok(Number(t.rows[0]?.n ?? 0) >= 18, "migrations have not been applied");
  });

  after(async () => {
    // Payments must go first. payment.user_id is ON DELETE RESTRICT on purpose
    // — deleting a user must never silently delete the record of money they
    // paid — so the cascade that cleans up everything else stops here. That
    // this teardown had to be written deliberately is the constraint working.
    for (const id of created) {
      await db().delete(payment).where(eq(payment.userId, id));
      await db().delete(users).where(eq(users.id, id));
    }
    await closeDb();
  });

  // ── the wallet ────────────────────────────────────────────────────────────

  describe("wallet.spendFrom", () => {
    it("debits when funds are sufficient", async () => {
      const id = await user({ bitAward: 100 });
      const result = await wallet.spendFrom(id, "bitAward", 40);
      assert.equal(result?.bitAward, 60);
    });

    it("returns null and changes nothing when funds are short", async () => {
      const id = await user({ bitAward: 10 });
      assert.equal(await wallet.spendFrom(id, "bitAward", 40), null);
      assert.equal((await wallet.get(id))?.bitAward, 10);
    });

    it("lets exactly ONE of two concurrent debits win", async () => {
      // THE test. Balance covers one purchase; two arrive at once. A
      // read-then-write implementation lets both through and overdraws.
      const id = await user({ bitAward: 100 });

      const [a, b] = await Promise.all([
        wallet.spendFrom(id, "bitAward", 60),
        wallet.spendFrom(id, "bitAward", 60),
      ]);

      const winners = [a, b].filter(Boolean);
      assert.equal(winners.length, 1, "exactly one debit must succeed");
      assert.equal((await wallet.get(id))?.bitAward, 40);
    });

    it("survives a stampede without going negative", async () => {
      const id = await user({ bitAward: 50 });
      const results = await Promise.all(
        Array.from({ length: 20 }, () => wallet.spendFrom(id, "bitAward", 10)),
      );
      assert.equal(results.filter(Boolean).length, 5);
      assert.equal((await wallet.get(id))?.bitAward, 0);
    });

    it("refuses an unknown currency instead of building a column name from it", async () => {
      const id = await user({ bitAward: 100 });
      // @ts-expect-error deliberately passing an invalid currency
      assert.equal(await wallet.spendFrom(id, "bit_award; DROP TABLE users--", 1), null);
      assert.equal((await wallet.get(id))?.bitAward, 100);
    });
  });

  it("the database itself refuses a negative balance", async () => {
    // The CHECK is the backstop for any future code path that bypasses the repo.
    const id = await user({ bitAward: 5 });
    await refusedBy(
      () => db().update(users).set({ bitAward: -1 }).where(eq(users.id, id)),
      "users_bit_award_non_negative",
    );
  });

  // ── the payment latch ─────────────────────────────────────────────────────

  describe("payments.latchSucceeded", () => {
    it("lets exactly ONE of two concurrent webhook deliveries through", async () => {
      const uid = await user();
      const order = await payments.create({
        userId: uid,
        provider: "mock",
        amountMinor: 49900,
        items: [{ sku: "pack-easy", amountMinor: 49900 }],
      });

      const [a, b] = await Promise.all([
        payments.latchSucceeded(order.id, { attempt: 1 }),
        payments.latchSucceeded(order.id, { attempt: 2 }),
      ]);

      assert.equal([a, b].filter(Boolean).length, 1, "a replayed webhook must not grant twice");
      const settled = await payments.findById(order.id);
      assert.equal(settled?.status, "succeeded");
      assert.ok(settled?.grantedAt);
      // Declared in this schema, unlike in Mongoose, which dropped it silently.
      assert.ok(settled?.paidAt, "paidAt should now actually persist");
    });

    it("refuses a second provider_payment_id collision", async () => {
      const uid = await user();
      const a = await payments.create({ userId: uid, provider: "mock", amountMinor: 100, items: [] });
      const b = await payments.create({ userId: uid, provider: "mock", amountMinor: 100, items: [] });

      // Unique per run. A fixed literal here made this test depend on the
      // database being pristine, so it passed once and then collided with its
      // own leftovers on the next run — which reads as a schema bug rather
      // than as test residue.
      const providerId = `provider-${newId()}`;

      await payments.attachProviderPayment(a.id, providerId, null);
      await refusedBy(
        () => payments.attachProviderPayment(b.id, providerId, null),
        "payment_provider_payment_id_key",
      );
    });

    it("allows many payments to sit at NULL provider id at once", async () => {
      // Why the index is PARTIAL: rows exist before the provider is called.
      const uid = await user();
      await payments.create({ userId: uid, provider: "mock", amountMinor: 1, items: [] });
      await payments.create({ userId: uid, provider: "mock", amountMinor: 1, items: [] });

      const rows = await db().select().from(payment).where(eq(payment.userId, uid));
      assert.equal(rows.length, 2);
    });
  });

  // ── entitlements ──────────────────────────────────────────────────────────

  describe("entitlements", () => {
    it("extends a dated pass instead of stacking a second row", async () => {
      const id = await user();
      const first = await entitlements.grantOrExtend(id, "pass-90", 90, null);
      const second = await entitlements.grantOrExtend(id, "pass-90", 90, null);

      const rows = await db().select().from(userEntitlement).where(eq(userEntitlement.userId, id));
      assert.equal(rows.length, 1, "re-buying must extend, not stack");

      const gap = second.expiresAt!.getTime() - first.expiresAt!.getTime();
      const ninetyDays = 90 * 24 * 60 * 60 * 1000;
      // Renewing early must ADD to the remaining time, not reset it.
      assert.ok(Math.abs(gap - ninetyDays) < 60_000, `expected +90d, got ${gap}ms`);
    });

    it("makes a perpetual grant idempotent under replay", async () => {
      const id = await user();
      await Promise.all([
        entitlements.grantPerpetual(id, "story-maya", null),
        entitlements.grantPerpetual(id, "story-maya", null),
      ]);
      const rows = await db().select().from(userEntitlement).where(eq(userEntitlement.userId, id));
      assert.equal(rows.length, 1);
      assert.equal(rows[0]?.expiresAt, null);
    });
  });

  // ── learned words: the BitWord double-mint ────────────────────────────────

  describe("progress.addLearnedWords", () => {
    it("reports only genuinely new words", async () => {
      const id = await user();
      assert.deepEqual((await progressRepo.addLearnedWords(id, ["cat", "dog"])).sort(), ["cat", "dog"]);
      assert.deepEqual(await progressRepo.addLearnedWords(id, ["cat"]), []);
      assert.deepEqual(await progressRepo.addLearnedWords(id, ["cat", "fox"]), ["fox"]);
    });

    it("does not pay twice when two submissions race", async () => {
      // The bug this replaces: the Mongo path snapshots the array, diffs it in
      // JS, then $addToSets. Two submissions read the same snapshot and both
      // count the same word as new, minting two BitWord for one word learned.
      const id = await user();
      const [a, b] = await Promise.all([
        progressRepo.addLearnedWords(id, ["otter", "badger"]),
        progressRepo.addLearnedWords(id, ["otter", "badger"]),
      ]);
      assert.equal(a.length + b.length, 2, "each word must be paid for exactly once");
      assert.equal(await progressRepo.learnedWordCount(id), 2);
    });

    it("normalises case, matching the lowercased audioKey convention", async () => {
      const id = await user();
      await progressRepo.addLearnedWords(id, ["Otter"]);
      assert.deepEqual(await progressRepo.addLearnedWords(id, ["otter"]), []);
    });
  });

  // ── level results ─────────────────────────────────────────────────────────

  it("never lets a failed re-attempt erase a pass", async () => {
    const id = await user();
    const p = await progressRepo.ensure(id, "easy");

    await progressRepo.upsertLevelResult({
      progressId: p.id, storyId: "leo", partNumber: 1,
      completed: true, correctAnswers: 5, totalQuestions: 5,
    });
    await progressRepo.upsertLevelResult({
      progressId: p.id, storyId: "leo", partNumber: 1,
      completed: false, correctAnswers: 1, totalQuestions: 5,
    });

    const [row] = await db()
      .select()
      .from(progressLevelResult)
      .where(eq(progressLevelResult.progressId, p.id));

    assert.equal(row?.completed, true, "a completed result must survive a later failure");
    assert.equal(row?.correctAnswers, 5);
  });

  it("upgrades a previously failed result when it is later passed", async () => {
    const id = await user();
    const p = await progressRepo.ensure(id, "easy");

    await progressRepo.upsertLevelResult({
      progressId: p.id, storyId: "leo", partNumber: 2,
      completed: false, correctAnswers: 1, totalQuestions: 5,
    });
    await progressRepo.upsertLevelResult({
      progressId: p.id, storyId: "leo", partNumber: 2,
      completed: true, correctAnswers: 4, totalQuestions: 5,
    });

    const rows = await db()
      .select()
      .from(progressLevelResult)
      .where(eq(progressLevelResult.progressId, p.id));
    assert.equal(rows.find((r) => r.partNumber === 2)?.completed, true);
  });

  it("keeps completed_parts a sorted set", async () => {
    const id = await user();
    for (const partNumber of [3, 1, 3, 2]) {
      await progressRepo.completeStoryPart({
        userId: id, difficulty: "easy", storyId: "leo", partNumber, totalParts: 5,
      });
    }
    const row = await progressRepo.storyProgressFor(id, "easy", "leo");
    assert.deepEqual(row?.completedParts, [1, 2, 3]);
  });

  // ── sessions ──────────────────────────────────────────────────────────────

  describe("sessions", () => {
    const attach = (userId: string, n: number) =>
      sessions.attach({
        userId,
        jti: `jti-${newId()}-${n}`,
        deviceId: `device-${n}`,
        deviceLabel: `Device ${n}`,
        ipPrefix: "203.0.113.0/24",
      });

    it("reuses a known device's slot rather than burning a second", async () => {
      const id = await user();
      await attach(id, 1);
      await attach(id, 1);
      assert.equal((await sessions.liveSessions(id)).length, 1);
    });

    it("rotates the jti when a known device signs in again", async () => {
      const id = await user();
      const first = await attach(id, 1);
      const second = await attach(id, 1);
      assert.ok(first.ok && second.ok);
      assert.notEqual(first.session.jti, second.session.jti);
      // Exactly one working token per device.
      assert.equal((await sessions.liveSessions(id)).length, 1);
    });

    it("refuses a fourth device", async () => {
      const id = await user();
      for (const n of [1, 2, 3]) assert.ok((await attach(id, n)).ok);

      const fourth = await attach(id, 4);
      assert.equal(fourth.ok, false);
      if (!fourth.ok) assert.equal(fourth.devices.length, 3);
    });

    it("frees a slot with removeAllExcept", async () => {
      const id = await user();
      for (const n of [1, 2, 3]) await attach(id, n);
      assert.equal(await sessions.removeAllExcept(id, "device-2"), 2);
      assert.equal((await sessions.liveSessions(id)).length, 1);
    });

    it("reports rows removed, so callers can tell 404 from success", async () => {
      const id = await user();
      await attach(id, 1);
      assert.equal(await sessions.removeByDeviceId(id, "device-1"), 1);
      assert.equal(await sessions.removeByDeviceId(id, "device-1"), 0);
    });
  });
});
