// test/api/onboarding.test.js — the /welcome flow after sign-up.
//
// What the client relies on: every "you are signed in" body says whether the
// account still has to go through /welcome (onboardedAt null), the answers are
// saved as they are given, and finishing is idempotent.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";

import {
  adminToken,
  api,
  freshIdentity,
  lastCode,
  registerUser,
  startServer,
  stopServer,
  userRow,
} from "./harness.js";
import { config } from "../../src/config/env.js";
import { ENGLISH_LEVELS, LISTENING_EXPERIENCES } from "../../src/config/onboarding.js";

before(startServer);
after(stopServer);

describe("onboarding state on the auth payloads", () => {
  it("a new SMS sign-up is not onboarded on verify-phone, login and validate-token", async () => {
    const identity = freshIdentity("onb");
    const device = `dev-${identity.username}`;
    const signup = await api("POST", "/api/signup", {
      body: {
        username: identity.username,
        phoneNumber: identity.phoneNumber,
        password: identity.password,
        acceptedTerms: true,
        acceptedDataConsent: true,
      },
    });
    assert.equal(signup.status, 201, JSON.stringify(signup.body));

    const verify = await api("POST", "/api/verify-phone", {
      body: { ticket: signup.body.ticket, code: lastCode(identity.phoneNumber) },
      device,
    });
    assert.equal(verify.status, 200, JSON.stringify(verify.body));
    // null, not absent: absent is how an older server reads, and the client
    // treats that as "done".
    assert.equal(verify.body.user.onboardedAt, null);
    assert.equal(verify.body.user.englishLevel, null);
    assert.equal(verify.body.user.listeningExperience, null);

    const login = await api("POST", "/api/login", {
      body: { usernameOrEmail: identity.username, password: identity.password },
      device,
    });
    assert.equal(login.status, 200, JSON.stringify(login.body));
    assert.equal(login.body.user.onboardedAt, null);

    const me = await api("GET", "/api/validate-token", { token: login.body.token });
    assert.equal(me.status, 200);
    assert.equal(me.body.user.onboardedAt, null);
  });

  describe("with phone verification off", () => {
    before(() => {
      config.phoneVerificationRequired = false;
    });
    after(() => {
      config.phoneVerificationRequired = true;
    });

    it("an email sign-up is not onboarded either", async () => {
      const id = freshIdentity("onbmail");
      const res = await api("POST", "/api/signup", {
        body: {
          username: id.username,
          email: `${id.username}@example.test`,
          password: "secret123",
          acceptedTerms: true,
          acceptedDataConsent: true,
        },
      });
      assert.equal(res.status, 201, JSON.stringify(res.body));
      assert.equal(res.body.user.onboardedAt, null);
    });
  });
});

describe("PATCH /api/user/onboarding", () => {
  it("saves one answer at a time and leaves the flow unfinished", async () => {
    const user = await registerUser({ prefix: "onbp" });

    const first = await api("PATCH", "/api/user/onboarding", {
      token: user.token,
      body: { englishLevel: "intermediate" },
    });
    assert.equal(first.status, 200, JSON.stringify(first.body));
    assert.deepEqual(first.body.onboarding, {
      englishLevel: "intermediate",
      listeningExperience: null,
      onboardedAt: null,
    });

    const second = await api("PATCH", "/api/user/onboarding", {
      token: user.token,
      body: { listeningExperience: "subtitles" },
    });
    assert.equal(second.status, 200);
    assert.equal(second.body.onboarding.englishLevel, "intermediate", "the first answer is kept");
    assert.equal(second.body.onboarding.listeningExperience, "subtitles");

    // What a reload sees: the answers come back on validate-token.
    const me = await api("GET", "/api/validate-token", { token: user.token });
    assert.equal(me.body.user.englishLevel, "intermediate");
    assert.equal(me.body.user.listeningExperience, "subtitles");
    assert.equal(me.body.user.onboardedAt, null);
  });

  it("accepts every value config/onboarding.js lists — the DB CHECKs mirror it", async () => {
    // A value in the config but missing from the CHECK in db/schema.ts would
    // pass the controller and then 500 on the write.
    const user = await registerUser({ prefix: "onbm" });
    for (const englishLevel of ENGLISH_LEVELS) {
      const res = await api("PATCH", "/api/user/onboarding", { token: user.token, body: { englishLevel } });
      assert.equal(res.status, 200, `${englishLevel}: ${JSON.stringify(res.body)}`);
    }
    for (const listeningExperience of LISTENING_EXPERIENCES) {
      const res = await api("PATCH", "/api/user/onboarding", {
        token: user.token,
        body: { listeningExperience },
      });
      assert.equal(res.status, 200, `${listeningExperience}: ${JSON.stringify(res.body)}`);
    }
  });

  it("refuses unknown values and empty bodies", async () => {
    const user = await registerUser({ prefix: "onbr" });
    for (const body of [
      {},
      { englishLevel: "expert" },
      { englishLevel: 42 },
      { englishLevel: null },
      { listeningExperience: "podcasts" },
      { englishLevel: "advanced", listeningExperience: ["none"] },
    ]) {
      const res = await api("PATCH", "/api/user/onboarding", { token: user.token, body });
      assert.equal(res.status, 400, `${JSON.stringify(body)} → ${res.status}`);
      assert.equal(res.body.code, "INVALID_ONBOARDING_ANSWER");
    }
    // Nothing half-written by the refused mixed body.
    const row = await userRow(user.id);
    assert.equal(row.onboardingEnglishLevel, null);
  });

  it("needs a session", async () => {
    const res = await api("PATCH", "/api/user/onboarding", { body: { englishLevel: "beginner" } });
    assert.equal(res.status, 401);
  });
});

describe("POST /api/user/onboarding/complete", () => {
  it("needs both answers", async () => {
    const user = await registerUser({ prefix: "onbc" });
    const res = await api("POST", "/api/user/onboarding/complete", {
      token: user.token,
      body: { englishLevel: "beginner" },
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, "ONBOARDING_INCOMPLETE");

    const bad = await api("POST", "/api/user/onboarding/complete", {
      token: user.token,
      body: { englishLevel: "beginner", listeningExperience: "radio" },
    });
    assert.equal(bad.status, 400);
    assert.equal(bad.body.code, "INVALID_ONBOARDING_ANSWER");

    assert.equal((await userRow(user.id)).onboardedAt, null, "a refused finish finishes nothing");
  });

  it("finishes once, and a second call keeps the first time", async () => {
    const user = await registerUser({ prefix: "onbf" });
    const body = { englishLevel: "upper_intermediate", listeningExperience: "no_subtitles" };

    const first = await api("POST", "/api/user/onboarding/complete", { token: user.token, body });
    assert.equal(first.status, 200, JSON.stringify(first.body));
    assert.equal(first.body.onboarding.englishLevel, "upper_intermediate");
    assert.equal(first.body.onboarding.listeningExperience, "no_subtitles");
    const finishedAt = first.body.onboarding.onboardedAt;
    assert.ok(finishedAt && !Number.isNaN(Date.parse(finishedAt)), `not a date: ${finishedAt}`);

    const again = await api("POST", "/api/user/onboarding/complete", {
      token: user.token,
      body: { ...body, englishLevel: "advanced" },
    });
    assert.equal(again.status, 200);
    assert.equal(again.body.onboarding.onboardedAt, finishedAt, "onboardedAt must not move");
    assert.equal(again.body.onboarding.englishLevel, "advanced", "the answers stay editable");

    const me = await api("GET", "/api/validate-token", { token: user.token });
    assert.equal(me.body.user.onboardedAt, finishedAt);
    const row = await userRow(user.id);
    assert.ok(row.onboardedAt instanceof Date);
  });

  it("survives a later user.save() elsewhere (the doc layer round-trips the columns)", async () => {
    const user = await registerUser({ prefix: "onbs" });
    await api("POST", "/api/user/onboarding/complete", {
      token: user.token,
      body: { englishLevel: "beginner", listeningExperience: "none" },
    });
    // A login saves the whole user doc (attachSession + user.save()).
    const login = await api("POST", "/api/login", {
      body: { usernameOrEmail: user.username, password: user.password },
      device: user.device,
    });
    assert.equal(login.status, 200, JSON.stringify(login.body));
    const row = await userRow(user.id);
    assert.equal(row.onboardingEnglishLevel, "beginner");
    assert.equal(row.onboardingListeningExperience, "none");
    assert.ok(row.onboardedAt, "save() must not wipe onboarded_at");
  });
});

describe("POST /api/user/onboarding/restart", () => {
  it("sends a finished account back through /welcome, answers cleared", async () => {
    const user = await registerUser({ prefix: "onbre" });
    const body = { englishLevel: "advanced", listeningExperience: "immersion" };
    const first = await api("POST", "/api/user/onboarding/complete", { token: user.token, body });
    assert.equal(first.status, 200);

    const restart = await api("POST", "/api/user/onboarding/restart", { token: user.token });
    assert.equal(restart.status, 200, JSON.stringify(restart.body));
    assert.deepEqual(restart.body.onboarding, {
      englishLevel: null,
      listeningExperience: null,
      onboardedAt: null,
    });
    // What the gate reads on the next load.
    const me = await api("GET", "/api/validate-token", { token: user.token });
    assert.equal(me.body.user.onboardedAt, null);

    // Finishing again records the new finish, not the old one.
    const again = await api("POST", "/api/user/onboarding/complete", { token: user.token, body });
    assert.equal(again.status, 200);
    assert.ok(Date.parse(again.body.onboarding.onboardedAt) >= Date.parse(first.body.onboarding.onboardedAt));
    assert.ok((await userRow(user.id)).onboardedAt, "finished again");
  });

  it("needs a session", async () => {
    assert.equal((await api("POST", "/api/user/onboarding/restart")).status, 401);
  });
});

describe("POST /api/admin/players/:userId/reset-onboarding", () => {
  it("lets an admin send one player back through the flow, and lists where each one is", async () => {
    const admin = await adminToken();
    const user = await registerUser({ prefix: "onbad" });
    await api("POST", "/api/user/onboarding/complete", {
      token: user.token,
      body: { englishLevel: "elementary", listeningExperience: "courses" },
    });

    const listed = await api("GET", `/api/admin/players?q=${encodeURIComponent(user.username)}`, { token: admin });
    assert.equal(listed.status, 200, JSON.stringify(listed.body));
    const row = listed.body.players.find((p) => p.id === user.id);
    assert.equal(row.onboarding.englishLevel, "elementary");
    assert.equal(row.onboarding.listeningExperience, "courses");
    assert.ok(row.onboarding.onboardedAt);

    const reset = await api("POST", `/api/admin/players/${user.id}/reset-onboarding`, { token: admin });
    assert.equal(reset.status, 200, JSON.stringify(reset.body));
    assert.equal(reset.body.onboarding.onboardedAt, null);
    assert.equal((await userRow(user.id)).onboardedAt, null);
    assert.equal((await api("GET", "/api/validate-token", { token: user.token })).body.user.onboardedAt, null);
  });

  it("is admin-only and 404s an unknown player", async () => {
    const admin = await adminToken();
    const user = await registerUser({ prefix: "onbaz" });
    const asUser = await api("POST", `/api/admin/players/${user.id}/reset-onboarding`, { token: user.token });
    assert.ok([401, 403].includes(asUser.status), `a learner token got ${asUser.status}`);
    const unknown = await api("POST", "/api/admin/players/00000000-0000-4000-8000-000000000000/reset-onboarding", {
      token: admin,
    });
    assert.equal(unknown.status, 404);
  });
});

describe("existing accounts", () => {
  it("are NOT marked onboarded by any migration — they go through /welcome too", () => {
    // Decided 2026-10-04, reversing the first draft of 0007: accounts from
    // before the flow see it on their next visit. A fresh test database has
    // no such accounts, so pin it at the source — no migration may write
    // onboarded_at.
    const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../src/db/migrations");
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".sql"))) {
      const sql = fs.readFileSync(path.join(dir, file), "utf8").replace(/--.*$/gm, "");
      assert.doesNotMatch(sql, /UPDATE[^;]*"onboarded_at"/i, `${file} writes onboarded_at`);
    }
  });
});
