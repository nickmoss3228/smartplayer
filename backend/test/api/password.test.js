// test/api/password.test.js — changing a password from the Dashboard.
//
// Its own file because the last block switches the rate limiters on, and the
// counters live in this process: sharing a file with signup-heavy tests would
// let one exhaust the other's budget.

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, describe, it } from "node:test";

import { api, registerUser, setUserColumns, startServer, stopServer, userRow } from "./harness.js";

before(startServer);
after(stopServer);

const login = (usernameOrEmail, password, device) =>
  api("POST", "/api/login", { body: { usernameOrEmail, password }, device });

const change = (u, currentPassword, newPassword) =>
  api("POST", "/api/change-password", {
    token: u.token,
    device: u.device,
    body: { currentPassword, newPassword },
  });

const isSignedIn = async (token) =>
  (await api("GET", "/api/validate-token", { token })).status === 200;

describe("POST /api/change-password", () => {
  it("changes the password, keeps this device and signs the others out", async () => {
    const u = await registerUser();
    const second = await login(u.username, u.password, "device-two");
    assert.equal(second.status, 200);

    const res = await change(u, u.password, "a-brand-new-pass");
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.ok(res.body.passwordChangedAt);

    assert.equal((await login(u.username, u.password, "device-three")).status, 401);
    assert.equal((await login(u.username, "a-brand-new-pass", "device-three")).status, 200);

    assert.equal(await isSignedIn(u.token), true, "the device that made the change stays signed in");
    assert.equal(await isSignedIn(second.body.token), false, "every other device is signed out");

    const row = await userRow(u.id);
    assert.ok(row.passwordChangedAt instanceof Date);

    const profile = await api("GET", "/api/user/profile", { token: u.token });
    assert.equal(profile.status, 200);
    assert.equal(new Date(profile.body.passwordChangedAt).getTime(), row.passwordChangedAt.getTime());
  });

  it("refuses a wrong current password with 400, not 401, and changes nothing", async () => {
    const u = await registerUser();
    const second = await login(u.username, u.password, "device-two");

    const res = await change(u, "not-my-password", "a-brand-new-pass");
    // 401/403 would make the frontend sign the user out for a typo.
    assert.equal(res.status, 400);
    assert.equal(res.body.code, "WRONG_PASSWORD");

    assert.equal(await isSignedIn(u.token), true);
    assert.equal(await isSignedIn(second.body.token), true);
    assert.equal((await userRow(u.id)).passwordChangedAt, null);
    // Last: signing in again as device-two replaces that device's session.
    assert.equal((await login(u.username, u.password, "device-two")).status, 200);
  });

  it("refuses a short password, the same password and malformed input", async () => {
    const u = await registerUser();

    const short = await change(u, u.password, "12345");
    assert.equal(short.status, 400);
    assert.equal(short.body.code, "PASSWORD_TOO_SHORT");

    const same = await change(u, u.password, u.password);
    assert.equal(same.status, 400);
    assert.equal(same.body.code, "SAME_PASSWORD");

    for (const body of [{}, { currentPassword: u.password }, { currentPassword: ["x"], newPassword: 1234567 }]) {
      const res = await api("POST", "/api/change-password", { token: u.token, device: u.device, body });
      assert.equal(res.status, 400, JSON.stringify(body));
      assert.equal(res.body.code, "PASSWORD_FIELDS_REQUIRED");
    }

    assert.equal((await login(u.username, u.password, u.device)).status, 200);
  });

  it("needs a session", async () => {
    const res = await api("POST", "/api/change-password", {
      body: { currentPassword: "whatever-1", newPassword: "whatever-2" },
    });
    assert.equal(res.status, 401);
  });

  it("cancels a reset link that was already mailed", async () => {
    const u = await registerUser();
    const token = crypto.randomBytes(32).toString("hex");
    await setUserColumns(u.id, {
      passwordResetToken: crypto.createHash("sha256").update(token).digest("hex"),
      passwordResetExpires: new Date(Date.now() + 60_000),
    });

    assert.equal((await change(u, u.password, "a-brand-new-pass")).status, 200);

    const reset = await api("POST", "/api/reset", { body: { token, newPassword: "attacker-pass" } });
    assert.equal(reset.status, 400);
    assert.equal((await login(u.username, "a-brand-new-pass", u.device)).status, 200);
  });

  it("a completed reset records the change too", async () => {
    const u = await registerUser();
    const token = crypto.randomBytes(32).toString("hex");
    await setUserColumns(u.id, {
      passwordResetToken: crypto.createHash("sha256").update(token).digest("hex"),
      passwordResetExpires: new Date(Date.now() + 60_000),
    });

    assert.equal((await api("POST", "/api/reset", { body: { token, newPassword: "reset-pass-1" } })).status, 200);
    assert.ok((await userRow(u.id)).passwordChangedAt instanceof Date);
  });
});

describe("POST /api/change-password rate limit (enabled for this block)", () => {
  let target;
  let bystander;

  before(async () => {
    // Registered while the limits are still off: signup has its own budget.
    target = await registerUser();
    bystander = await registerUser();
    process.env.RATE_LIMITS_DISABLED = "false";
  });
  after(() => {
    process.env.RATE_LIMITS_DISABLED = "true";
  });

  it("allows 5 wrong guesses per account, then answers 429 even to the right one", async () => {
    const statuses = [];
    for (let i = 0; i < 6; i++) {
      statuses.push((await change(target, `wrong-guess-${i}`, "a-brand-new-pass")).status);
    }
    assert.deepEqual(statuses, [400, 400, 400, 400, 400, 429]);

    const right = await change(target, target.password, "a-brand-new-pass");
    assert.equal(right.status, 429);
    assert.equal(right.body.code, "RATE_LIMITED");
  });

  it("counts per account, not per IP", async () => {
    // Same IP as the exhausted account above.
    const res = await change(bystander, bystander.password, "a-brand-new-pass");
    assert.equal(res.status, 200);
  });
});
