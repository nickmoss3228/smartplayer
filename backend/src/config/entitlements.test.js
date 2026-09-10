// config/entitlements.test.js
//
// Only the pure decision logic is covered here. That is the point of keeping
// config/entitlements.js free of Mongoose and env — the same argument
// sessions.test.js makes for config/sessions.js.
//
// What is deliberately NOT tested here: that Mongo applies a conditional
// update atomically. That is assumed, exactly as helpers/spendCurrency.js
// assumes it.

import test from "node:test";
import assert from "node:assert/strict";

import {
  accessFor,
  isActive,
  isPartVisible,
  isPaidStory,
  ownedStoryKeys,
  resolveAccess,
  storyKey,
} from "./entitlements.js";
import { PACK_STORIES, PAID_STORY_KEYS, STARTER_STORIES, PAID_PREVIEW_PARTS } from "./priceCatalog.js";
import { FREE_TRIAL_STORIES } from "./trial.js";

const NOW = Date.UTC(2026, 8, 5, 12, 0, 0);
const perpetual = (sku) => ({ sku, grantedAt: new Date(NOW), expiresAt: null });
const until = (sku, ms) => ({ sku, grantedAt: new Date(NOW), expiresAt: new Date(ms) });

const AUTHED = { authenticated: true, now: NOW };
const GUEST = { authenticated: false, now: NOW };

// A story from each category, resolved from the catalog so renaming a slug
// breaks this file loudly instead of silently testing nothing.
const PAID_EASY = PACK_STORIES["pack-easy"][0];
const PAID_EASY_SIBLING = PACK_STORIES["pack-easy"][1];
const PAID_MEDIUM = PACK_STORIES["pack-medium"][0];
const split = (key) => key.split("/");

test("isActive: a perpetual row never expires", () => {
  assert.equal(isActive(perpetual("pack-easy"), NOW), true);
  assert.equal(isActive(perpetual("pack-easy"), Date.UTC(2200, 0, 1)), true);
});

test("isActive: the expiry boundary is exclusive", () => {
  const row = until("all-access-90d", NOW);
  // One millisecond before: still yours. At the instant: gone. This is the
  // boundary a customer reads off a receipt, so it is pinned deliberately.
  assert.equal(isActive(row, NOW - 1), true, "1ms before expiry should be active");
  assert.equal(isActive(row, NOW), false, "at expiry should be expired");
  assert.equal(isActive(row, NOW + 1), false, "1ms after expiry should be expired");
});

test("isActive: junk fails closed rather than throwing", () => {
  for (const junk of [null, undefined, {}, { sku: 42 }, { sku: "x", expiresAt: "not a date" }]) {
    assert.equal(isActive(junk, NOW), false, `${JSON.stringify(junk)} should not be active`);
  }
});

test("a single-story SKU unlocks that story and not its sibling", () => {
  const ents = [perpetual(`story-${PAID_EASY.replace("/", "-")}`)];
  assert.equal(accessFor(ents, ...split(PAID_EASY), AUTHED).owned, true);
  assert.equal(accessFor(ents, ...split(PAID_EASY_SIBLING), AUTHED).owned, false);
});

test("a pack unlocks all three of its stories and nothing on another level", () => {
  const ents = [perpetual("pack-easy")];
  for (const key of PACK_STORIES["pack-easy"]) {
    assert.equal(accessFor(ents, ...split(key), AUTHED).owned, true, `${key} should be owned`);
  }
  assert.equal(accessFor(ents, ...split(PAID_MEDIUM), AUTHED).owned, false);
});

test("an active pass unlocks a story covered by no other SKU", () => {
  const ents = [until("all-access-90d", NOW + 86_400_000)];
  for (const key of PAID_STORY_KEYS) {
    assert.equal(accessFor(ents, ...split(key), AUTHED).owned, true, `${key} should be owned`);
  }
});

test("an expired pass unlocks nothing, but a separate story purchase survives it", () => {
  const ents = [
    until("all-access-90d", NOW - 1),
    perpetual(`story-${PAID_EASY.replace("/", "-")}`),
  ];
  assert.equal(accessFor(ents, ...split(PAID_EASY), AUTHED).owned, true);
  assert.equal(accessFor(ents, ...split(PAID_EASY_SIBLING), AUTHED).owned, false);
  assert.equal(accessFor(ents, ...split(PAID_MEDIUM), AUTHED).owned, false);
});

test("a row naming a SKU that has left the catalog grants nothing and does not throw", () => {
  // Catalogs get edited; rows are permanent. An exception here would take the
  // story endpoint down for exactly one user, which is the worst way to find out.
  const ents = [perpetual("pack-atlantis"), perpetual("story-easy-does-not-exist")];
  assert.doesNotThrow(() => accessFor(ents, ...split(PAID_EASY), AUTHED));
  assert.equal(accessFor(ents, ...split(PAID_EASY), AUTHED).owned, false);
  assert.deepEqual(resolveAccess(ents, NOW).stories.size, 0);
});

test("missing or malformed entitlements are treated as owning nothing", () => {
  for (const ents of [[], null, undefined, "nonsense", [null], [{}]]) {
    assert.doesNotThrow(() => accessFor(ents, ...split(PAID_EASY), AUTHED));
    assert.equal(accessFor(ents, ...split(PAID_EASY), AUTHED).owned, false);
  }
});

test("every starter story is free to a registered user who has bought nothing", () => {
  for (const key of STARTER_STORIES) {
    const access = accessFor([], ...split(key), AUTHED);
    assert.equal(access.owned, true, `${key} should be free after registration`);
  }
});

test("a guest keeps exactly the trial they had before the paywall", () => {
  for (const key of STARTER_STORIES) {
    const access = accessFor([], ...split(key), GUEST);
    assert.equal(access.owned, false);
    assert.equal(access.freeParts, FREE_TRIAL_STORIES);
    assert.equal(isPartVisible(access, FREE_TRIAL_STORIES), true);
    assert.equal(isPartVisible(access, FREE_TRIAL_STORIES + 1), false);
  }
});

test("signing out never shows you more of a paid story than signing in", () => {
  const guest = accessFor([], ...split(PAID_EASY), GUEST);
  const member = accessFor([], ...split(PAID_EASY), AUTHED);
  assert.equal(guest.freeParts, member.freeParts);
  assert.equal(member.freeParts, PAID_PREVIEW_PARTS);
});

test("an owner sees every part, however many there are", () => {
  const access = accessFor([perpetual("all-access-90d")], ...split(PAID_EASY), AUTHED);
  assert.equal(isPartVisible(access, 1), true);
  assert.equal(isPartVisible(access, 999), true);
});

test("a story nobody sells stays free, so unlisted content is not bricked", () => {
  // An admin publishing through the Story Builder must not have to edit the
  // price catalog before anyone can hear it.
  const key = "easy/some-story-the-catalog-never-heard-of";
  assert.equal(isPaidStory(key), false);
  assert.equal(accessFor([], ...split(key), AUTHED).owned, true);
  assert.equal(accessFor([], ...split(key), GUEST).freeParts, FREE_TRIAL_STORIES);
});

test("no paid story is also in the free starter pack", () => {
  for (const key of PAID_STORY_KEYS) {
    assert.equal(STARTER_STORIES.includes(key), false, `${key} is both free and for sale`);
  }
});

test("ownedStoryKeys lists the starter pack even for a user who bought nothing", () => {
  const owned = ownedStoryKeys([], NOW);
  for (const key of STARTER_STORIES) assert.ok(owned.includes(key), `${key} missing`);
  for (const key of PAID_STORY_KEYS) assert.equal(owned.includes(key), false);
});

test("ownedStoryKeys expands an active pass into every paid story", () => {
  const owned = ownedStoryKeys([until("all-access-90d", NOW + 1000)], NOW);
  for (const key of [...STARTER_STORIES, ...PAID_STORY_KEYS]) {
    assert.ok(owned.includes(key), `${key} missing under an active pass`);
  }
});

test("two overlapping passes report the later expiry", () => {
  const early = NOW + 1000;
  const late = NOW + 9_000_000;
  const { allAccess, allAccessExpiresAt } = resolveAccess(
    [until("all-access-90d", early), until("all-access-90d", late)],
    NOW,
  );
  assert.equal(allAccess, true);
  assert.equal(+new Date(allAccessExpiresAt), late);
});

test("storyKey is difficulty-qualified, because slugs repeat across levels", () => {
  assert.equal(storyKey("easy", "leo"), "easy/leo");
  assert.notEqual(storyKey("easy", "x"), storyKey("hard", "x"));
});
