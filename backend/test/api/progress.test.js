// test/api/progress.test.js — quizzes, the paywall on them, and every wallet
// earn/spend path. The concurrency tests matter most: the Postgres port exists
// largely to make these read-check-write paths race-safe.

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

// The harness MUST be the first project import — see its header.
import "./harness.js";
import { getQuizAnswerKey } from "../../src/config/quizData.js";
import { LEGACY_VOCAB_KEYS as VOCAB_KEY_SET } from "../../src/config/vocabKeys.js";
const LEGACY_VOCAB_KEYS = [...VOCAB_KEY_SET];
import { SHOP_CATALOG as SHOP_ITEMS } from "../../src/config/shopCatalog.js";
import { CHARACTER_CATALOG as CHARACTER_ITEMS } from "../../src/config/characterCatalog.js";
import { QUIZ_PASS_BITAWARD } from "../../src/config/currency.js";
import {
  buyBlocker,
  getRoomSpec,
  getVariant,
} from "../../src/config/schoolCatalog.js";
import {
  adminToken,
  api,
  fundWallet,
  registerUser,
  setUserColumns,
  startServer,
  stopServer,
  userRow,
} from "./harness.js";

before(startServer);
after(stopServer);

// easy/leo is a 10-part paid story: parts 1–3 are free to everyone, 4+ locked.
const FREE = { difficulty: "easy", storyId: "leo", partNumber: 1 };
const LOCKED = { difficulty: "easy", storyId: "leo", partNumber: 5 };

const quizPath = ({ difficulty, storyId, partNumber }) =>
  `/api/progress/quiz/${difficulty}/${storyId}/${partNumber}`;

function answers(part, { correct }) {
  const key = getQuizAnswerKey(part.difficulty, part.storyId, part.partNumber);
  assert.ok(key?.length, `no static quiz for ${JSON.stringify(part)}`);
  return key.map((a) => (correct ? a : (a + 1) % 4));
}

const wallet = async (u) => (await api("GET", "/api/progress/wallet", { token: u.token })).body.wallet;

describe("quiz endpoints", () => {
  it("serve a free part's questions to a guest without the answer key", async () => {
    const res = await api("GET", quizPath(FREE));
    assert.equal(res.status, 200);
    assert.ok(res.body.questions.length > 0);
    assert.ok(res.body.questions.every((q) => !("correctAnswer" in q)));
  });

  it("refuse a locked part to guests and to signed-in non-owners", async () => {
    const guest = await api("GET", quizPath(LOCKED));
    assert.equal(guest.status, 403);
    assert.equal(guest.body.code, "PART_LOCKED");

    const u = await registerUser();
    const member = await api("GET", quizPath(LOCKED), { token: u.token });
    assert.equal(member.status, 403);
  });

  it("check-answer says right or wrong for one question", async () => {
    const key = getQuizAnswerKey(FREE.difficulty, FREE.storyId, FREE.partNumber);
    const right = await api("POST", `${quizPath(FREE)}/check-answer`, {
      body: { questionIndex: 0, selectedOption: key[0] },
    });
    const wrong = await api("POST", `${quizPath(FREE)}/check-answer`, {
      body: { questionIndex: 0, selectedOption: (key[0] + 1) % 4 },
    });
    assert.deepEqual([right.status, right.body.correct], [200, true]);
    assert.deepEqual([wrong.status, wrong.body.correct], [200, false]);
  });

  it("check-answer refuses bad input and locked parts", async () => {
    for (const body of [{}, { questionIndex: "0", selectedOption: 1 }, { questionIndex: 99, selectedOption: 1 }]) {
      const res = await api("POST", `${quizPath(FREE)}/check-answer`, { body });
      assert.equal(res.status, 400, JSON.stringify(body));
    }
    const locked = await api("POST", `${quizPath(LOCKED)}/check-answer`, {
      body: { questionIndex: 0, selectedOption: 0 },
    });
    assert.equal(locked.status, 403);
  });

  it("unknown difficulty or story is a 400, not a 500", async () => {
    assert.equal((await api("GET", "/api/progress/quiz/extreme/leo/1")).status, 400);
    assert.equal((await api("GET", "/api/progress/quiz/easy/no-such-story/1")).status, 400);
  });
});

describe("POST /api/progress/complete", () => {
  it("a passing submission completes the part, pays BitAward and starts a streak", async () => {
    const u = await registerUser();
    const res = await api("POST", "/api/progress/complete", {
      token: u.token,
      body: { ...FREE, answers: answers(FREE, { correct: true }) },
    });

    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.completed, true);
    assert.deepEqual(res.body.storyProgress.completedParts, [1]);
    assert.equal(res.body.wallet.bitAward, QUIZ_PASS_BITAWARD);

    const row = await userRow(u.id);
    assert.equal(row.streakCurrent, 1);
    assert.equal(row.bitAward, QUIZ_PASS_BITAWARD);

    const story = await api("GET", "/api/progress/story/easy/leo", { token: u.token });
    assert.equal(story.status, 200);
    assert.deepEqual(story.body.completedParts, [1]);
    assert.equal(story.body.totalParts, 10);

    const level = await api("GET", "/api/progress/easy", { token: u.token });
    assert.equal(level.status, 200);
    assert.ok(level.body.levelResults);
  });

  it("a failing submission records the attempt but pays nothing", async () => {
    const u = await registerUser();
    const res = await api("POST", "/api/progress/complete", {
      token: u.token,
      body: { ...FREE, answers: answers(FREE, { correct: false }) },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.completed, false);
    assert.equal(res.body.wallet, null);
    assert.equal((await userRow(u.id)).bitAward, 0);
  });

  it("refuses a locked part until an admin grants the story", async () => {
    const u = await registerUser();
    const body = { ...LOCKED, answers: answers(LOCKED, { correct: true }) };

    const refused = await api("POST", "/api/progress/complete", { token: u.token, body });
    assert.equal(refused.status, 403);
    assert.equal((await userRow(u.id)).bitAward, 0);

    const grant = await api("POST", "/api/admin/grant-entitlement", {
      token: await adminToken(),
      body: { userId: u.id, sku: "story-easy-leo" },
    });
    assert.equal(grant.status, 200, JSON.stringify(grant.body));

    const allowed = await api("POST", "/api/progress/complete", { token: u.token, body });
    assert.equal(allowed.status, 200);
    assert.equal(allowed.body.completed, true);
  });

  it("validates its input with 400s", async () => {
    const u = await registerUser();
    for (const body of [
      { ...FREE, difficulty: "extreme", answers: [] },
      { ...FREE, answers: "nope" },
      { ...FREE, partNumber: "1", answers: [] },
      { ...FREE, partNumber: 1.5, answers: [] },
      { ...FREE, partNumber: 0, answers: [] },
      { ...FREE, storyId: "no-such-story", answers: [] },
      { ...FREE, answers: [0] },
    ]) {
      const res = await api("POST", "/api/progress/complete", { token: u.token, body });
      assert.equal(res.status, 400, JSON.stringify(body));
    }
  });

  it("requires a session", async () => {
    const res = await api("POST", "/api/progress/complete", {
      body: { ...FREE, answers: answers(FREE, { correct: true }) },
    });
    assert.equal(res.status, 401);
  });

  it("the overview and achievements reflect a completion", async () => {
    const u = await registerUser();
    await api("POST", "/api/progress/complete", {
      token: u.token,
      body: { ...FREE, answers: answers(FREE, { correct: true }) },
    });
    const overview = await api("GET", "/api/progress/overview", { token: u.token });
    assert.equal(overview.status, 200);
    assert.equal(overview.body.easy.completed, 1);
    assert.ok(overview.body.easy.stories.find((s) => s.storyId === "leo"));

    const ach = await api("GET", "/api/progress/achievements", { token: u.token });
    assert.equal(ach.status, 200);
    assert.equal(ach.body.stats.currentStreak, 1);
    assert.equal(ach.body.stats.uniqueStoriesCount >= 0, true);
    assert.ok(ach.body.stats.questionsAnswered > 0);
  });
});

describe("guest progress migration", () => {
  it("folds valid trial results in and silently drops forged ones", async () => {
    const u = await registerUser();
    const res = await api("POST", "/api/progress/migrate-guest", {
      token: u.token,
      body: {
        stories: [
          {
            difficulty: "easy",
            storyId: "leo",
            results: [
              { partNumber: 1, correctAnswers: 5, totalQuestions: 5 },
              { partNumber: 7, correctAnswers: 5, totalQuestions: 5 }, // locked part
              { partNumber: 2, correctAnswers: 9, totalQuestions: 5 }, // impossible score
            ],
          },
          { difficulty: "extreme", storyId: "leo", results: [] },
          null,
        ],
        learnedWords: [LEGACY_VOCAB_KEYS[0]],
      },
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));

    const story = await api("GET", "/api/progress/story/easy/leo", { token: u.token });
    assert.deepEqual(story.body.completedParts, [1]);
    // Migration never pays: guest results were not earned under an account.
    assert.equal((await userRow(u.id)).bitAward, 0);
  });

  it("refuses non-array input", async () => {
    const u = await registerUser();
    for (const body of [{ stories: {} }, { learnedWords: "word" }, { learnedWords: [1] }]) {
      const res = await api("POST", "/api/progress/migrate-guest", { token: u.token, body });
      assert.equal(res.status, 400, JSON.stringify(body));
    }
  });
});

describe("vocabulary and phrase rewards", () => {
  const words = LEGACY_VOCAB_KEYS.slice(0, 4);

  it("pays one BitWord per newly learned known word and ignores invented ones", async () => {
    const u = await registerUser();
    const res = await api("POST", "/api/progress/vocab-complete", {
      token: u.token,
      body: { words: [...words, words[0].toUpperCase(), "definitely-not-a-real-key-xyz"] },
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.wallet.bitWord, words.length);
    assert.equal(res.body.learnedWords.length, words.length);

    const again = await api("POST", "/api/progress/vocab-complete", { token: u.token, body: { words } });
    assert.equal(again.body.wallet.bitWord, words.length, "re-submitting learned words paid again");

    const learned = await api("GET", "/api/progress/vocab-learned", { token: u.token });
    assert.deepEqual([...learned.body.learnedWords].sort(), [...words].sort());
  });

  it("pays once when the same words are submitted in parallel", async () => {
    const u = await registerUser();
    await Promise.all(
      Array.from({ length: 8 }, () =>
        api("POST", "/api/progress/vocab-complete", { token: u.token, body: { words } }),
      ),
    );
    assert.equal((await userRow(u.id)).bitWord, words.length);
  });

  it("refuses malformed word lists", async () => {
    const u = await registerUser();
    for (const body of [{}, { words: [] }, { words: [1] }, { words: Array(61).fill("a") }, { words: ["x".repeat(81)] }]) {
      const res = await api("POST", "/api/progress/vocab-complete", { token: u.token, body });
      assert.equal(res.status, 400, JSON.stringify(body).slice(0, 80));
    }
  });

  it("phrase repeats pay by repeat count and refuse anything else", async () => {
    const u = await registerUser();
    const once = await api("POST", "/api/progress/phrase-repeat", { token: u.token, body: { repeatCount: 1 } });
    const thrice = await api("POST", "/api/progress/phrase-repeat", { token: u.token, body: { repeatCount: 3 } });
    assert.equal(once.body.wallet.bitPhrase, 0);
    assert.equal(thrice.body.wallet.bitPhrase, 2);
    for (const repeatCount of [0, 4, "2", null]) {
      const res = await api("POST", "/api/progress/phrase-repeat", { token: u.token, body: { repeatCount } });
      assert.equal(res.status, 400);
    }
  });

  it("listening time only ever goes up", async () => {
    const u = await registerUser();
    const up = await api("PATCH", "/api/progress/listening-time", { token: u.token, body: { totalSeconds: 120.9 } });
    assert.equal(up.body.totalListeningSeconds, 120);
    const down = await api("PATCH", "/api/progress/listening-time", { token: u.token, body: { totalSeconds: 10 } });
    assert.equal(down.body.totalListeningSeconds, 120);
    for (const totalSeconds of [-1, "100", null]) {
      const bad = await api("PATCH", "/api/progress/listening-time", { token: u.token, body: { totalSeconds } });
      assert.equal(bad.status, 400);
    }
  });
});

describe("room shop", () => {
  const item = SHOP_ITEMS[0];
  const other = SHOP_ITEMS.find((i) => i.slot !== item.slot && i.priceBitAward === item.priceBitAward)
    ?? SHOP_ITEMS.find((i) => i.slot !== item.slot);

  it("refuses a purchase the wallet cannot cover", async () => {
    const u = await registerUser();
    const res = await api("POST", "/api/progress/room/purchase", { token: u.token, body: { itemId: item.id } });
    assert.equal(res.status, 400);
    assert.equal((await userRow(u.id)).bitAward, 0);
  });

  it("buys, places, and refuses buying the same item twice", async () => {
    const u = await registerUser();
    await fundWallet(u.id, { bitAward: 1000 });

    const buy = await api("POST", "/api/progress/room/purchase", { token: u.token, body: { itemId: item.id } });
    assert.equal(buy.status, 200, JSON.stringify(buy.body));
    assert.equal(buy.body.bitAward, 1000 - item.priceBitAward);
    assert.ok(buy.body.room.ownedItemIds.includes(item.id));
    assert.equal(buy.body.room.placedItems[item.slot], item.id);

    const twice = await api("POST", "/api/progress/room/purchase", { token: u.token, body: { itemId: item.id } });
    assert.equal(twice.status, 400);

    const room = await api("GET", "/api/progress/room", { token: u.token });
    assert.equal(room.body.bitAward, 1000 - item.priceBitAward);
    assert.deepEqual(room.body.room.ownedItemIds, [item.id]);
  });

  it("charges once when the same item is bought in parallel", async () => {
    const u = await registerUser();
    await fundWallet(u.id, { bitAward: 1000 });
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        api("POST", "/api/progress/room/purchase", { token: u.token, body: { itemId: item.id } }),
      ),
    );
    assert.equal(results.filter((r) => r.status === 200).length, 1);
    assert.equal((await userRow(u.id)).bitAward, 1000 - item.priceBitAward);
  });

  it("never overspends when different items are bought in parallel", async () => {
    const u = await registerUser();
    await fundWallet(u.id, { bitAward: item.priceBitAward });
    const results = await Promise.all([
      api("POST", "/api/progress/room/purchase", { token: u.token, body: { itemId: item.id } }),
      api("POST", "/api/progress/room/purchase", { token: u.token, body: { itemId: other.id } }),
    ]);
    const bought = results.filter((r) => r.status === 200).length;
    const row = await userRow(u.id);
    assert.ok(row.bitAward >= 0);
    assert.equal(item.priceBitAward * 1 - row.bitAward >= 0, true);
    assert.ok(bought >= 1);
    // Whatever was bought, the room and the wallet agree.
    const room = (await api("GET", "/api/progress/room", { token: u.token })).body.room;
    const spent = room.ownedItemIds
      .map((id) => SHOP_ITEMS.find((i) => i.id === id).priceBitAward)
      .reduce((a, b) => a + b, 0);
    assert.equal(spent + row.bitAward, item.priceBitAward);
  });

  it("equips only owned items, toggles lights, and rejects unknown ids", async () => {
    const u = await registerUser();
    assert.equal((await api("POST", "/api/progress/room/equip", { token: u.token, body: { itemId: item.id } })).status, 400);
    assert.equal((await api("POST", "/api/progress/room/purchase", { token: u.token, body: { itemId: "nope" } })).status, 400);

    const before = (await api("GET", "/api/progress/room", { token: u.token })).body.room.lightsOn;
    const toggled = await api("PATCH", "/api/progress/room/lights", { token: u.token });
    assert.equal(toggled.status, 200);
    assert.equal(toggled.body.room.lightsOn, !before);
  });

  it("parallel light toggles each flip once", async () => {
    const u = await registerUser();
    const before = (await api("GET", "/api/progress/room", { token: u.token })).body.room.lightsOn;
    await Promise.all(Array.from({ length: 4 }, () => api("PATCH", "/api/progress/room/lights", { token: u.token })));
    const after = (await api("GET", "/api/progress/room", { token: u.token })).body.room.lightsOn;
    assert.equal(after, before);
  });

  it("placement refuses empty slots and bad coordinates", async () => {
    const u = await registerUser();
    const empty = await api("PATCH", "/api/progress/room/placement", {
      token: u.token,
      body: { slot: "furniture1", x: 0, z: 0 },
    });
    assert.equal(empty.status, 400);
    const bogus = await api("PATCH", "/api/progress/room/placement", { token: u.token, body: { slot: "roof" } });
    assert.equal(bogus.status, 400);
  });

  it("another player's room can be visited, but not their wallet", async () => {
    const a = await registerUser();
    const b = await registerUser();
    const visit = await api("GET", `/api/progress/room/${b.id}`, { token: a.token });
    assert.equal(visit.status, 200);
    assert.equal(visit.body.username, b.username);
    assert.ok(!("bitAward" in visit.body));
    assert.equal((await api("GET", "/api/progress/room/not-a-uuid", { token: a.token })).status, 404);
  });
});

describe("character shop", () => {
  const item = CHARACTER_ITEMS[0];

  it("buys, equips, refuses doubles, and sets a skin tone", async () => {
    const u = await registerUser();
    await fundWallet(u.id, { bitAward: 100 });

    const buy = await api("POST", "/api/progress/character/purchase", { token: u.token, body: { itemId: item.id } });
    assert.equal(buy.status, 200, JSON.stringify(buy.body));
    assert.equal(buy.body.bitAward, 100 - item.priceBitAward);
    assert.equal(buy.body.character.equipped[item.slot], item.id);

    const again = await api("POST", "/api/progress/character/purchase", { token: u.token, body: { itemId: item.id } });
    assert.equal(again.status, 400);

    const equip = await api("POST", "/api/progress/character/equip", { token: u.token, body: { itemId: item.id } });
    assert.equal(equip.status, 200);

    const tone = await api("PATCH", "/api/progress/character/skin-tone", { token: u.token, body: { skinTone: "#aabbcc" } });
    assert.equal(tone.status, 200);
    assert.equal(tone.body.character.skinTone, "#aabbcc");
    const badTone = await api("PATCH", "/api/progress/character/skin-tone", { token: u.token, body: { skinTone: "red" } });
    assert.equal(badTone.status, 400);

    const got = await api("GET", "/api/progress/character", { token: u.token });
    assert.equal(got.body.bitAward, 100 - item.priceBitAward);
  });

  it("charges once for parallel purchases of one item", async () => {
    const u = await registerUser();
    await fundWallet(u.id, { bitAward: 100 });
    await Promise.all(
      Array.from({ length: 6 }, () =>
        api("POST", "/api/progress/character/purchase", { token: u.token, body: { itemId: item.id } }),
      ),
    );
    assert.equal((await userRow(u.id)).bitAward, 100 - item.priceBitAward);
  });
});

describe("school", () => {
  /** The first room a fresh school can buy, and its price. */
  async function buyableRoom(u) {
    const school = (await api("GET", "/api/progress/school", { token: u.token })).body.school;
    const row = await userRow(u.id);
    const variant = getVariant(row.schoolVariantId);
    const owned = row.schoolOwnedRoomIds;
    const room = variant.rooms.find((r) => buyBlocker(variant.id, owned, r.id) === null);
    assert.ok(room, "no buyable room for a fresh school");
    return { school, spec: getRoomSpec(variant.id, room.id) };
  }

  it("a new player has a starter school and the catalog is served", async () => {
    const u = await registerUser();
    const res = await api("GET", "/api/progress/school", { token: u.token });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.ok(res.body.school);
    assert.ok(res.body.wallet);

    const catalog = await api("GET", "/api/progress/school/catalog", { token: u.token });
    assert.equal(catalog.status, 200);
    assert.ok(catalog.body.variants.length > 0);
  });

  it("buys a room in its own currency, once", async () => {
    const u = await registerUser();
    const { spec } = await buyableRoom(u);

    const broke = await api("POST", "/api/progress/school/rooms", { token: u.token, body: { roomId: spec.id } });
    assert.equal(broke.status, 400);

    await fundWallet(u.id, { bitAward: 5000, bitWord: 5000, bitPhrase: 5000 });
    const results = await Promise.all(
      Array.from({ length: 6 }, () =>
        api("POST", "/api/progress/school/rooms", { token: u.token, body: { roomId: spec.id } }),
      ),
    );
    assert.equal(results.filter((r) => r.status === 200).length, 1);
    assert.ok(results.filter((r) => r.status !== 200).every((r) => r.status === 409));

    const row = await userRow(u.id);
    assert.equal(row[spec.currency], 5000 - spec.price);
    assert.ok(row.schoolOwnedRoomIds.includes(spec.id));
  });

  it("refuses unknown rooms, rooms whose parent is unbuilt, and bodies with no room", async () => {
    const u = await registerUser();
    await api("GET", "/api/progress/school", { token: u.token });
    await fundWallet(u.id, { bitAward: 5000, bitWord: 5000, bitPhrase: 5000 });
    const row = await userRow(u.id);
    const variant = getVariant(row.schoolVariantId);
    const locked = variant.rooms.find((r) => buyBlocker(variant.id, row.schoolOwnedRoomIds, r.id) === "locked");

    assert.equal((await api("POST", "/api/progress/school/rooms", { token: u.token, body: {} })).status, 400);
    assert.equal((await api("POST", "/api/progress/school/rooms", { token: u.token, body: { roomId: "moon-base" } })).status, 404);
    if (locked) {
      const res = await api("POST", "/api/progress/school/rooms", { token: u.token, body: { roomId: locked.id } });
      assert.equal(res.status, 400);
    }
  });

  it("payroll: nothing owed for a new school, and weeks owed are charged once", async () => {
    const u = await registerUser();
    await api("GET", "/api/progress/school", { token: u.token });
    const none = await api("POST", "/api/progress/school/payroll", { token: u.token });
    assert.equal(none.status, 400);

    await fundWallet(u.id, { bitAward: 10_000 });
    await setUserColumns(u.id, { schoolPayrollLastPaidAt: new Date(Date.now() - 15 * 24 * 3600 * 1000) });

    const results = await Promise.all(
      Array.from({ length: 4 }, () => api("POST", "/api/progress/school/payroll", { token: u.token })),
    );
    assert.equal(results.filter((r) => r.status === 200).length, 1);
    const paid = results.find((r) => r.status === 200);
    assert.equal((await userRow(u.id)).bitAward, paid.body.wallet.bitAward);
    assert.ok(paid.body.wallet.bitAward < 10_000);
  });

  it("looks: refuses empty, locked and nonsense changes", async () => {
    const u = await registerUser();
    await api("GET", "/api/progress/school", { token: u.token });
    for (const body of [{}, { layoutId: "not-a-layout" }, { roomId: 42 }, { roomId: "moon-base", wallpaperId: null }, { wallpaperId: null }]) {
      const res = await api("PATCH", "/api/progress/school/look", { token: u.token, body });
      assert.ok([400, 404].includes(res.status), `${JSON.stringify(body)} -> ${res.status}`);
    }
  });

  it("another player's school is visible without their wallet", async () => {
    const a = await registerUser();
    const b = await registerUser();
    const res = await api("GET", `/api/progress/school/${b.id}`, { token: a.token });
    assert.equal(res.status, 200);
    assert.ok(!("wallet" in res.body));
  });
});

describe("profile and search", () => {
  it("updates a nickname and refuses bad ones", async () => {
    const u = await registerUser();
    const ok = await api("PATCH", "/api/user/profile", { token: u.token, body: { nickname: "  Nick  " } });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.nickname, "Nick");
    for (const nickname of ["", "x".repeat(31), 42, { a: 1 }]) {
      const bad = await api("PATCH", "/api/user/profile", { token: u.token, body: { nickname } });
      assert.equal(bad.status, 400, JSON.stringify(nickname));
    }
    const profile = await api("GET", "/api/user/profile", { token: u.token });
    assert.equal(profile.body.nickname, "Nick");
  });

  it("finds players by partial username, never lists yourself, and treats wildcards literally", async () => {
    const a = await registerUser({ prefix: "srch" });
    const b = await registerUser({ prefix: "srch" });
    const res = await api("GET", `/api/user/search?q=${encodeURIComponent(b.username.slice(0, 12))}`, { token: a.token });
    assert.equal(res.status, 200);
    assert.ok(res.body.players.some((p) => p.id === b.id));
    assert.ok(res.body.players.every((p) => p.id !== a.id));
    assert.ok(res.body.players.every((p) => !("email" in p) && !("phoneNumber" in p)));

    const wildcard = await api("GET", "/api/user/search?q=%25%25", { token: a.token });
    assert.equal(wildcard.status, 200);
    assert.equal(wildcard.body.players.length, 0);

    const repeated = await api("GET", "/api/user/search?q=ab&q=cd", { token: a.token });
    assert.ok(repeated.status < 500, `repeated q -> ${repeated.status}`);
  });

  it("heartbeat and entitlements answer for a fresh account", async () => {
    const u = await registerUser();
    assert.equal((await api("PATCH", "/api/user/heartbeat", { token: u.token })).status, 200);
    const ent = await api("GET", "/api/user/entitlements", { token: u.token });
    assert.equal(ent.status, 200);
    assert.deepEqual(ent.body.ownedStories, []);
    assert.ok(ent.body.purchasableSkus.length > 0);
  });
});

describe("wallet", () => {
  it("starts empty and is private", async () => {
    const u = await registerUser();
    assert.deepEqual(await wallet(u), { bitAward: 0, bitWord: 0, bitPhrase: 0 });
    assert.equal((await api("GET", "/api/progress/wallet")).status, 401);
  });
});
