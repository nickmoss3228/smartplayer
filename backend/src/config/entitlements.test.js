// config/entitlements.test.js
//
// Only the pure decision logic is covered here. That is the point of keeping
// config/entitlements.js free of Mongoose and env — the same argument
// sessions.test.js makes for config/sessions.js.

import test from "node:test";
import assert from "node:assert/strict";

import {
  accessFor,
  isActive,
  isPartVisible,
  isPreviewPart,
  isPaidStory,
  isFreeStory,
  ownedStoryKeys,
  resolveAccess,
  storyKey,
} from "./entitlements.js";
import {
  BUILT_IN_CATALOG,
  buildCatalog,
  FREE_PARTS_LONG_STORY,
  LONG_STORY_MIN_PARTS,
  PREVIEW_SECONDS,
  levelSku,
  setSku,
  storySku,
} from "./priceCatalog.js";

// The built-in rows stand in for "whatever the story table holds". These tests
// are about the RULES, so they pin a fixed catalog rather than a live one.
const { stories: CATALOG_STORIES, getProduct } = BUILT_IN_CATALOG;

const NOW = Date.UTC(2026, 8, 5, 12, 0, 0);
const perpetual = (sku) => ({ sku, grantedAt: new Date(NOW), expiresAt: null });
const until = (sku, ms) => ({ sku, grantedAt: new Date(NOW), expiresAt: new Date(ms) });

const AUTHED = { authenticated: true, now: NOW };
const GUEST = { authenticated: false, now: NOW };

const split = (key) => key.split("/");
const LONG = CATALOG_STORIES.find((s) => s.parts >= LONG_STORY_MIN_PARTS).key;
const SHORT = CATALOG_STORIES.find((s) => s.parts < LONG_STORY_MIN_PARTS).key;
const LEO_SET = getProduct(setSku("leo")).storyKeys;
const NEWS = CATALOG_STORIES.find((s) => s.category === "news").key;

test("isActive: a perpetual row never expires", () => {
  assert.equal(isActive(perpetual(storySku(LONG)), NOW), true);
  assert.equal(isActive(perpetual(storySku(LONG)), Date.UTC(2200, 0, 1)), true);
});

test("isActive: the expiry boundary is exclusive", () => {
  const row = until(storySku(LONG), NOW);
  assert.equal(isActive(row, NOW - 1), true, "1ms before expiry should be active");
  assert.equal(isActive(row, NOW), false, "at expiry should be expired");
});

test("isActive: junk fails closed rather than throwing", () => {
  for (const junk of [null, undefined, {}, { sku: 42 }, { sku: "x", expiresAt: "not a date" }]) {
    assert.equal(isActive(junk, NOW), false, `${JSON.stringify(junk)} should not be active`);
  }
});

test("a story SKU unlocks that story and nothing else", () => {
  const ents = [perpetual(storySku("easy/leo"))];
  assert.equal(accessFor(ents, "easy", "leo", AUTHED).owned, true);
  assert.equal(accessFor(ents, "easy", "leo-additional", AUTHED).owned, false);
});

test("a set unlocks every story about its character, but not the news", () => {
  const ents = [perpetual(setSku("leo"))];
  for (const key of LEO_SET) {
    assert.equal(accessFor(ents, ...split(key), AUTHED).owned, true, `${key} should be owned`);
  }
  assert.equal(LEO_SET.includes(NEWS), false, "fixture: news is not in the set");
  assert.equal(accessFor(ents, ...split(NEWS), AUTHED).owned, false);
  assert.equal(accessFor(ents, "medium", "maya", AUTHED).owned, false);
});

test("a level unlocks everything on it, news included", () => {
  const ents = [perpetual(levelSku("easy"))];
  for (const s of CATALOG_STORIES.filter((c) => c.key.startsWith("easy/"))) {
    assert.equal(accessFor(ents, ...split(s.key), AUTHED).owned, true, `${s.key} should be owned`);
  }
  assert.equal(accessFor(ents, "hard", "daniel", AUTHED).owned, false);
});

test("a row naming a SKU that has left the catalog grants nothing and does not throw", () => {
  const ents = [perpetual("all-access-90d"), perpetual("pack-easy")];
  assert.doesNotThrow(() => accessFor(ents, ...split(LONG), AUTHED));
  assert.equal(accessFor(ents, ...split(LONG), AUTHED).owned, false);
  assert.equal(resolveAccess(ents, NOW).stories.size, 0);
});

test("missing or malformed entitlements are treated as owning nothing", () => {
  for (const ents of [[], null, undefined, "nonsense", [null], [{}]]) {
    assert.doesNotThrow(() => accessFor(ents, ...split(LONG), AUTHED));
    assert.equal(accessFor(ents, ...split(LONG), AUTHED).owned, false);
  }
});

test("a long story gives its first parts away, to guests and members alike", () => {
  for (const opts of [GUEST, AUTHED]) {
    const access = accessFor([], ...split(LONG), opts);
    assert.equal(access.owned, false);
    assert.equal(access.freeParts, FREE_PARTS_LONG_STORY);
    assert.equal(access.previewSeconds, null);
    assert.equal(isPartVisible(access, FREE_PARTS_LONG_STORY), true);
    assert.equal(isPartVisible(access, FREE_PARTS_LONG_STORY + 1), false);
    assert.equal(isPreviewPart(access, 1), false, "a free part is not a preview");
  }
});

test("a short story gives away only a timed preview of part 1", () => {
  for (const opts of [GUEST, AUTHED]) {
    const access = accessFor([], ...split(SHORT), opts);
    assert.equal(access.freeParts, 0);
    assert.equal(access.previewSeconds, PREVIEW_SECONDS);
    assert.equal(isPartVisible(access, 1), true);
    assert.equal(isPreviewPart(access, 1), true);
    assert.equal(isPartVisible(access, 2), false);
  }
});

test("a guest's allowance never differs from a signed-in non-owner's", () => {
  for (const { key } of CATALOG_STORIES) {
    const guest = accessFor([], ...split(key), GUEST);
    const member = accessFor([], ...split(key), AUTHED);
    assert.equal(guest.freeParts, member.freeParts, key);
    assert.equal(guest.previewSeconds, member.previewSeconds, key);
  }
});

test("a guest owns nothing even if rows are passed", () => {
  assert.equal(accessFor([perpetual(storySku(LONG))], ...split(LONG), GUEST).owned, false);
});

test("an owner sees every part, with no preview cut", () => {
  const access = accessFor([perpetual(storySku(SHORT))], ...split(SHORT), AUTHED);
  assert.equal(isPartVisible(access, 1), true);
  assert.equal(isPartVisible(access, 999), true);
  assert.equal(isPreviewPart(access, 1), false);
});

// The inverse of this test used to pass, and it is what put Story Builder
// stories on every logged-out learner's shelf: each one was a key the catalog
// had never heard of, so each one was free. An unknown story is now refused.
test("a story the catalog has never heard of is refused, not given away", () => {
  const key = "easy/some-story-the-catalog-never-heard-of";
  assert.equal(isPaidStory(key), false, "it is not for sale either — it does not exist");
  assert.equal(accessFor([], ...split(key), AUTHED).owned, false);
  assert.equal(accessFor([], ...split(key), GUEST).owned, false);
  // Nothing plays, not even a preview: there is no row to say how much is free.
  assert.equal(isPartVisible(accessFor([], ...split(key), GUEST), 1), false);
  assert.equal(accessFor([], ...split(key), GUEST).reason, "unlisted");
});

test("a row marked free is the ONLY way a story is free, and gives every part away", () => {
  const catalog = buildCatalog([{ key: "easy/gift", character: "leo", parts: 4, paid: false }]);
  const access = accessFor([], "easy", "gift", { ...GUEST, catalog });
  assert.equal(access.owned, true);
  assert.equal(access.reason, "free");
  assert.equal(isPartVisible(access, 4), true);
  assert.equal(isFreeStory("easy/gift", catalog), true);
  // Free content is never bundled into a set — a buyer must not be charged
  // for something already given away.
  assert.equal(catalog.getProduct(setSku("leo")), null);
});

test("a row may override the length-derived price and free allowance", () => {
  const catalog = buildCatalog([
    { key: "easy/custom", character: "leo", parts: 10, priceMinor: 9900, freeParts: 1 },
  ]);
  assert.equal(catalog.getProduct(storySku("easy/custom")).amountMinor, 9900);
  const access = accessFor([], "easy", "custom", { ...GUEST, catalog });
  assert.equal(access.freeParts, 1, "1, not the 3 a 10-part story would derive");
  assert.equal(isPartVisible(access, 1), true);
  assert.equal(isPartVisible(access, 2), false);
});

// ── the paywall switched off (config.payments.paywallEnabled) ──────────────
//
// The register wall replaces the paywall: an account, not a purchase, is what
// opens the catalogue. Everything here passes `paywallEnabled: false`; the
// DEFAULT is true, which is why every test above needed no change.
const OFF_AUTHED = { authenticated: true, now: NOW, paywallEnabled: false };
const OFF_GUEST = { authenticated: false, now: NOW, paywallEnabled: false };

test("paywall off: a signed-in user gets every part of a paid story, having bought nothing", () => {
  const access = accessFor([], ...split(LONG), OFF_AUTHED);
  assert.equal(access.owned, true);
  assert.equal(access.reason, "paywall-off");
  assert.equal(isPartVisible(access, 999), true);
  assert.equal(isPreviewPart(access, 1), false);
});

test("paywall off: a short story opens too, with no timed preview", () => {
  const access = accessFor([], ...split(SHORT), OFF_AUTHED);
  assert.equal(access.owned, true);
  assert.equal(access.previewSeconds, null);
  assert.equal(isPartVisible(access, 1), true);
});

// The whole point of the register wall: a guest must still be able to taste
// the thing before being asked for their details, but not to take all of it.
test("paywall off: a guest keeps the same taster and no more", () => {
  const access = accessFor([], ...split(LONG), OFF_GUEST);
  assert.equal(access.owned, false);
  assert.equal(access.reason, "register-wall");
  assert.equal(access.freeParts, FREE_PARTS_LONG_STORY);
  assert.equal(isPartVisible(access, FREE_PARTS_LONG_STORY), true);
  assert.equal(isPartVisible(access, FREE_PARTS_LONG_STORY + 1), false);
});

test("paywall off: signing in shows MORE, which is the one time that is allowed", () => {
  const guest = accessFor([], ...split(LONG), OFF_GUEST);
  const member = accessFor([], ...split(LONG), OFF_AUTHED);
  assert.equal(guest.owned, false);
  assert.equal(member.owned, true);
});

// Turning selling off must not also turn off the guard that keeps
// half-finished Story Builder drafts away from learners.
test("paywall off: a story the catalog does not list is STILL refused", () => {
  const key = "easy/not-a-story";
  assert.equal(accessFor([], ...split(key), OFF_AUTHED).owned, false);
  assert.equal(accessFor([], ...split(key), OFF_AUTHED).reason, "unlisted");
  assert.equal(isPartVisible(accessFor([], ...split(key), OFF_AUTHED), 1), false);
});

test("paywall off changes nothing about a story that was already free", () => {
  const catalog = buildCatalog([{ key: "easy/gift", character: "leo", parts: 4, paid: false }]);
  const access = accessFor([], "easy", "gift", { ...OFF_GUEST, catalog });
  assert.equal(access.owned, true);
  assert.equal(access.reason, "free");
});

test("ownedStoryKeys lists only what was bought, expanded through sets", () => {
  assert.deepEqual(ownedStoryKeys([], NOW), []);
  assert.deepEqual(ownedStoryKeys([perpetual(setSku("leo"))], NOW).sort(), [...LEO_SET].sort());
});

test("storyKey is difficulty-qualified, because slugs repeat across levels", () => {
  assert.equal(storyKey("easy", "leo"), "easy/leo");
  assert.notEqual(storyKey("easy", "x"), storyKey("hard", "x"));
});
