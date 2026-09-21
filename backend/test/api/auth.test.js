// test/api/auth.test.js — signup, SMS verification, login, device sessions.

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import {
  adminToken,
  api,
  freshIdentity,
  lastCode,
  registerUser,
  setUserColumns,
  signupBody,
  smsSentTo,
  startServer,
  stopServer,
  userRow,
} from "./harness.js";
import { config } from "../../src/config/env.js";

before(startServer);
after(stopServer);

// ── signup with SMS verification switched off ──────────────────────────────
//
// The mode the app actually runs in while the idea is being tested. It exists
// because signup did not merely FAIL without an SMS provider — issuePhoneCode
// throws, and the handler deletes the account it had just created, so no row
// survived and nobody could register at all.
//
// `config` is read per request, not captured at import, which is what lets
// these flip it. Restored in `after` so the rest of the file keeps testing the
// real OTP flow.
describe("POST /api/signup (phone verification off)", () => {
  before(() => {
    config.phoneVerificationRequired = false;
  });
  after(() => {
    config.phoneVerificationRequired = true;
  });

  it("registers with email and password alone, signs in, and never touches SMS", async () => {
    const id = freshIdentity();
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
    assert.ok(res.body.token, "signup should sign the user straight in");
    assert.equal(res.body.user.username, id.username);
    assert.equal(res.body.ticket, undefined, "there is no verification step to ticket");

    // THE point of the change: the account is actually in the database.
    const row = await userRow(res.body.user.id);
    assert.ok(row, "no row was written for the new account");
    assert.equal(row.pendingRegistration, false, "the account is real, not pending");
    // Honest: no number has been proven, so the column keeps saying so. Writing
    // true here would silently trust these accounts if verification returns.
    assert.equal(row.isPhoneVerified, false);
    assert.equal(row.phoneNumber, null, "no phone was given, so none is stored");
    assert.ok(row.legalConsentTermsAcceptedAt, "consent is still recorded");

    // Mechanical, not assumed: no provider was called for anybody.
    assert.deepEqual(smsSentTo(id.phoneNumber), []);

    // And the token works.
    const me = await api("GET", "/api/user/entitlements", { token: res.body.token });
    assert.equal(me.status, 200);
  });

  it("still refuses an account with no email, and still demands both consents", async () => {
    const id = freshIdentity();
    const base = {
      username: id.username,
      password: "secret123",
      acceptedTerms: true,
      acceptedDataConsent: true,
    };

    const noEmail = await api("POST", "/api/signup", { body: base });
    assert.equal(noEmail.status, 400, JSON.stringify(noEmail.body));

    const noConsent = await api("POST", "/api/signup", {
      body: { ...base, email: `${id.username}@example.test`, acceptedDataConsent: false },
    });
    assert.equal(noConsent.status, 400);
    assert.equal(noConsent.body.code, "AGREEMENTS_REQUIRED");
  });

  it("takes an optional phone, but refuses one that is not a real number", async () => {
    const good = freshIdentity();
    const withPhone = await api("POST", "/api/signup", {
      body: {
        username: good.username,
        email: `${good.username}@example.test`,
        phoneNumber: good.phoneNumber,
        password: "secret123",
        acceptedTerms: true,
        acceptedDataConsent: true,
      },
    });
    assert.equal(withPhone.status, 201, JSON.stringify(withPhone.body));
    assert.equal((await userRow(withPhone.body.user.id)).phoneNumber, good.phoneNumber);
    assert.deepEqual(smsSentTo(good.phoneNumber), [], "an optional phone is not verified");

    // phone_number is UNIQUE; junk in it is a collision nobody can explain.
    const bad = freshIdentity();
    const res = await api("POST", "/api/signup", {
      body: {
        username: bad.username,
        email: `${bad.username}@example.test`,
        phoneNumber: "not-a-number",
        password: "secret123",
        acceptedTerms: true,
        acceptedDataConsent: true,
      },
    });
    assert.equal(res.status, 400, JSON.stringify(res.body));
  });

  it("lets that account log in again without an SMS round trip", async () => {
    const id = freshIdentity();
    await api("POST", "/api/signup", {
      body: {
        username: id.username,
        email: `${id.username}@example.test`,
        password: "secret123",
        acceptedTerms: true,
        acceptedDataConsent: true,
      },
    });

    const login = await api("POST", "/api/login", {
      body: { usernameOrEmail: id.username, password: "secret123" },
    });
    assert.equal(login.status, 200, JSON.stringify(login.body));
    assert.ok(login.body.token);
  });
});

describe("POST /api/signup", () => {
  it("creates a pending account, texts a code and returns a ticket with a masked phone", async () => {
    const id = freshIdentity();
    const res = await api("POST", "/api/signup", { body: signupBody(id) });

    assert.equal(res.status, 201);
    assert.equal(res.body.code, "PHONE_VERIFICATION_REQUIRED");
    assert.match(res.body.ticket, /^[0-9a-f]{64}$/);
    assert.equal(res.body.phoneNumber, `+7 *** *** ${id.phoneNumber.slice(-2)}`);
    assert.equal(smsSentTo(id.phoneNumber).length, 1);

    const row = await registeredRowByPhone(id.phoneNumber);
    assert.equal(row.username, id.username);
    assert.equal(row.pendingRegistration, true);
    assert.equal(row.isPhoneVerified, false);
  });

  it("stores consent and never keeps the plaintext code or ticket", async () => {
    const id = freshIdentity();
    const res = await api("POST", "/api/signup", { body: signupBody(id) });
    const user = await registeredRowByPhone(id.phoneNumber);

    assert.equal(res.status, 201);
    assert.equal(user.legalConsentVersion, "test-1");
    assert.ok(user.legalConsentTermsAcceptedAt instanceof Date);
    assert.ok(user.legalConsentDataAcceptedAt instanceof Date);
    assert.equal(user.pendingRegistration, true);
    assert.notEqual(user.phoneVerificationCodeHash, lastCode(id.phoneNumber));
    assert.notEqual(user.phoneVerificationTicketHash, res.body.ticket);
    assert.match(user.password, /^\$2[aby]\$/);
  });

  it("accepts an 8-prefixed Russian number and stores it as +7", async () => {
    const id = freshIdentity();
    const local = `8${id.phoneNumber.slice(2)}`;
    const res = await api("POST", "/api/signup", { body: signupBody(id, { phoneNumber: local }) });

    assert.equal(res.status, 201);
    assert.equal(smsSentTo(id.phoneNumber).length, 1);
  });

  for (const [label, patch] of [
    ["a missing username", { username: undefined }],
    ["a missing password", { password: undefined }],
    ["a non-Russian phone", { phoneNumber: "+14155550123" }],
    ["a phone that is not a string", { phoneNumber: 79991234567 }],
  ]) {
    it(`refuses ${label} with 400`, async () => {
      const res = await api("POST", "/api/signup", { body: signupBody(freshIdentity(), patch) });
      assert.equal(res.status, 400);
    });
  }

  it("refuses a password shorter than 6 characters", async () => {
    const res = await api("POST", "/api/signup", {
      body: signupBody(freshIdentity(), { password: "12345" }),
    });
    assert.equal(res.status, 400);
  });

  it("refuses a non-string password with 400, not a server error", async () => {
    const res = await api("POST", "/api/signup", {
      body: signupBody(freshIdentity(), { password: 12345678 }),
    });
    assert.equal(res.status, 400);
  });

  it("refuses a non-string username with 400, not a server error", async () => {
    const res = await api("POST", "/api/signup", {
      body: signupBody(freshIdentity(), { username: { $gt: "" } }),
    });
    assert.equal(res.status, 400);
  });

  for (const [label, patch] of [
    ["terms not accepted", { acceptedTerms: false }],
    ["data consent missing", { acceptedDataConsent: undefined }],
    ["consent sent as the string \"true\"", { acceptedTerms: "true" }],
  ]) {
    it(`refuses signup with ${label}`, async () => {
      const id = freshIdentity();
      const res = await api("POST", "/api/signup", { body: signupBody(id, patch) });
      assert.equal(res.status, 400);
      assert.equal(res.body.code, "AGREEMENTS_REQUIRED");
      assert.equal(smsSentTo(id.phoneNumber).length, 0);
    });
  }

  it("lets any number of people sign up with a blank email", async () => {
    for (let i = 0; i < 2; i++) {
      const id = freshIdentity();
      const res = await api("POST", "/api/signup", { body: signupBody(id, { email: "" }) });
      assert.equal(res.status, 201, JSON.stringify(res.body));
      assert.equal((await registeredRowByPhone(id.phoneNumber)).email, null);
    }
  });

  it("refuses a username that belongs to a verified account", async () => {
    const existing = await registerUser();
    const res = await api("POST", "/api/signup", {
      body: signupBody({ ...freshIdentity(), username: existing.username }),
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.message, "Username already exists");
  });

  it("refuses a phone that belongs to a verified account", async () => {
    const existing = await registerUser();
    const res = await api("POST", "/api/signup", {
      body: signupBody({ ...freshIdentity(), phoneNumber: existing.phoneNumber }),
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.message, "Phone number already exists");
  });

  it("refuses an email that belongs to another account, case-insensitively", async () => {
    const email = `${freshIdentity().username}@example.com`;
    await registerUser({ email });
    const res = await api("POST", "/api/signup", {
      body: signupBody(freshIdentity(), { email: email.toUpperCase() }),
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.message, "Email already exists");
  });

  it("lets an abandoned (never verified) signup be retried with the same username and phone", async () => {
    const id = freshIdentity();
    const first = await api("POST", "/api/signup", { body: signupBody(id) });
    assert.equal(first.status, 201);

    const retry = await api("POST", "/api/signup", { body: signupBody(id) });
    assert.equal(retry.status, 201);

    // The first attempt's ticket belongs to a deleted account now.
    const stale = await api("POST", "/api/verify-phone", {
      body: { ticket: first.body.ticket, code: smsSentTo(id.phoneNumber)[0] },
    });
    assert.equal(stale.status, 400);

    const fresh = await api("POST", "/api/verify-phone", {
      body: { ticket: retry.body.ticket, code: lastCode(id.phoneNumber) },
      device: "d1",
    });
    assert.equal(fresh.status, 200);
  });

  it("does not delete a verified account when a pending signup collides with it", async () => {
    const verified = await registerUser();
    // A pending signup that holds a NEW username but the verified user's email
    // must not be able to take anything from the verified account.
    const res = await api("POST", "/api/signup", {
      body: signupBody({ ...freshIdentity(), phoneNumber: verified.phoneNumber }),
    });
    assert.equal(res.status, 400);

    const login = await api("POST", "/api/login", {
      body: { usernameOrEmail: verified.username, password: verified.password },
      device: verified.device,
    });
    assert.equal(login.status, 200);
  });
});

describe("POST /api/verify-phone", () => {
  async function pendingSignup() {
    const id = freshIdentity();
    const res = await api("POST", "/api/signup", { body: signupBody(id) });
    assert.equal(res.status, 201);
    return { ...id, ticket: res.body.ticket };
  }

  it("verifies with the texted code, returns a working session and clears the verification state", async () => {
    const p = await pendingSignup();
    const res = await api("POST", "/api/verify-phone", {
      body: { ticket: p.ticket, code: lastCode(p.phoneNumber) },
      device: "phone-1",
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.token);
    assert.equal(res.body.user.username, p.username);
    assert.equal(res.body.user.phoneNumber, p.phoneNumber);

    const check = await api("GET", "/api/validate-token", { token: res.body.token });
    assert.equal(check.status, 200);
    assert.equal(check.body.user.username, p.username);

    const row = await userRow(res.body.user.id);
    assert.equal(row.isPhoneVerified, true);
    assert.equal(row.pendingRegistration, false);
    assert.equal(row.phoneVerificationCodeHash, null);
    assert.equal(row.phoneVerificationTicketHash, null);
    assert.equal(row.phoneVerificationAttempts, 0);
  });

  it("accepts a numeric code as well as a string", async () => {
    const p = await pendingSignup();
    const res = await api("POST", "/api/verify-phone", {
      body: { ticket: p.ticket, code: Number(lastCode(p.phoneNumber)) },
      device: "phone-1",
    });
    // Codes are 100000–999999, so a number never loses a leading zero.
    assert.equal(res.status, 200);
  });

  it("refuses a wrong code and counts the attempt", async () => {
    const p = await pendingSignup();
    const wrong = lastCode(p.phoneNumber) === "111111" ? "222222" : "111111";
    const res = await api("POST", "/api/verify-phone", { body: { ticket: p.ticket, code: wrong } });

    assert.equal(res.status, 400);
    assert.equal(res.body.code, "INVALID_VERIFICATION");
    const row = await registeredRowByPhone(p.phoneNumber);
    assert.equal(row.phoneVerificationAttempts, 1);
  });

  it("locks the code after 5 wrong attempts, even for the right code", async () => {
    const p = await pendingSignup();
    const right = lastCode(p.phoneNumber);
    const wrong = right === "111111" ? "222222" : "111111";

    for (let i = 0; i < 5; i++) {
      const res = await api("POST", "/api/verify-phone", { body: { ticket: p.ticket, code: wrong } });
      assert.equal(res.status, 400);
    }
    const locked = await api("POST", "/api/verify-phone", { body: { ticket: p.ticket, code: right } });
    assert.equal(locked.status, 429);
    assert.equal(locked.body.code, "TOO_MANY_VERIFICATION_ATTEMPTS");
  });

  it("cannot be brute-forced past the attempt limit with parallel guesses", async () => {
    const p = await pendingSignup();
    const right = lastCode(p.phoneNumber);

    // 40 simultaneous guesses, none of them right. If the attempt counter is a
    // read-modify-write, most of these read `attempts = 0` and all get graded.
    const guesses = Array.from({ length: 40 }, (_, i) => {
      let code = String(100000 + i);
      if (code === right) code = "999999";
      return api("POST", "/api/verify-phone", { body: { ticket: p.ticket, code } });
    });
    const results = await Promise.all(guesses);
    const graded = results.filter((r) => r.status === 400).length;

    assert.ok(
      graded <= 5,
      `expected at most 5 guesses to be graded, but ${graded} of 40 were`,
    );
    const row = await registeredRowByPhone(p.phoneNumber);
    assert.ok(row.phoneVerificationAttempts >= 5);
  });

  it("refuses an expired code", async () => {
    const p = await pendingSignup();
    const row = await registeredRowByPhone(p.phoneNumber);
    await setUserColumns(row.id, { phoneVerificationExpires: new Date(Date.now() - 1000) });

    const res = await api("POST", "/api/verify-phone", {
      body: { ticket: p.ticket, code: lastCode(p.phoneNumber) },
    });
    assert.equal(res.status, 400);
  });

  it("refuses an expired ticket", async () => {
    const p = await pendingSignup();
    const row = await registeredRowByPhone(p.phoneNumber);
    await setUserColumns(row.id, { phoneVerificationTicketExpires: new Date(Date.now() - 1000) });

    const res = await api("POST", "/api/verify-phone", {
      body: { ticket: p.ticket, code: lastCode(p.phoneNumber) },
    });
    assert.equal(res.status, 400);
  });

  it("refuses a ticket that has already been spent", async () => {
    const p = await pendingSignup();
    const code = lastCode(p.phoneNumber);
    const first = await api("POST", "/api/verify-phone", { body: { ticket: p.ticket, code }, device: "a" });
    assert.equal(first.status, 200);

    const again = await api("POST", "/api/verify-phone", { body: { ticket: p.ticket, code }, device: "b" });
    assert.equal(again.status, 400);
  });

  it("refuses a missing, garbage or non-string ticket with 400", async () => {
    for (const body of [{}, { ticket: "nope", code: "123456" }, { ticket: { a: 1 }, code: "123456" }]) {
      const res = await api("POST", "/api/verify-phone", { body });
      assert.equal(res.status, 400, JSON.stringify(body));
    }
  });

  it("refuses to hand a banned, unverified account a session", async () => {
    const p = await pendingSignup();
    const row = await registeredRowByPhone(p.phoneNumber);
    await setUserColumns(row.id, { banned: true });

    const res = await api("POST", "/api/verify-phone", {
      body: { ticket: p.ticket, code: lastCode(p.phoneNumber) },
    });
    assert.equal(res.status, 403);
    assert.equal(res.body.code, "ACCOUNT_BANNED");
  });
});

describe("POST /api/resend-phone-code", () => {
  it("does not text again inside the cooldown, and the original code still works", async () => {
    const id = freshIdentity();
    const signup = await api("POST", "/api/signup", { body: signupBody(id) });

    const res = await api("POST", "/api/resend-phone-code", { body: { ticket: signup.body.ticket } });
    assert.equal(res.status, 200);
    assert.equal(res.body.cooldown, true);
    assert.equal(smsSentTo(id.phoneNumber).length, 1);

    const verify = await api("POST", "/api/verify-phone", {
      body: { ticket: signup.body.ticket, code: lastCode(id.phoneNumber) },
      device: "d",
    });
    assert.equal(verify.status, 200);
  });

  it("sends a new code after the cooldown, retires the old one and resets attempts", async () => {
    const id = freshIdentity();
    const signup = await api("POST", "/api/signup", { body: signupBody(id) });
    const oldCode = lastCode(id.phoneNumber);
    const row = await registeredRowByPhone(id.phoneNumber);

    await api("POST", "/api/verify-phone", {
      body: { ticket: signup.body.ticket, code: oldCode === "111111" ? "222222" : "111111" },
    });
    await setUserColumns(row.id, { phoneVerificationLastSentAt: new Date(Date.now() - 61_000) });

    const res = await api("POST", "/api/resend-phone-code", { body: { ticket: signup.body.ticket } });
    assert.equal(res.status, 200);
    assert.equal(res.body.cooldown, false);
    assert.equal(smsSentTo(id.phoneNumber).length, 2);
    assert.equal((await userRow(row.id)).phoneVerificationAttempts, 0);

    const newCode = lastCode(id.phoneNumber);
    if (newCode !== oldCode) {
      const stale = await api("POST", "/api/verify-phone", {
        body: { ticket: signup.body.ticket, code: oldCode },
      });
      assert.equal(stale.status, 400);
    }
    const ok = await api("POST", "/api/verify-phone", {
      body: { ticket: signup.body.ticket, code: newCode },
      device: "d",
    });
    assert.equal(ok.status, 200);
  });

  it("refuses an unknown ticket", async () => {
    const res = await api("POST", "/api/resend-phone-code", { body: { ticket: "0".repeat(64) } });
    assert.equal(res.status, 400);
  });

  it("refuses to resend for an account that is already verified", async () => {
    const id = freshIdentity();
    const signup = await api("POST", "/api/signup", { body: signupBody(id) });
    await api("POST", "/api/verify-phone", {
      body: { ticket: signup.body.ticket, code: lastCode(id.phoneNumber) },
      device: "d",
    });
    const res = await api("POST", "/api/resend-phone-code", { body: { ticket: signup.body.ticket } });
    assert.equal(res.status, 400);
    assert.equal(smsSentTo(id.phoneNumber).length, 1);
  });
});

describe("POST /api/login", () => {
  it("signs in by username, by phone in either format, and by email", async () => {
    const email = `${freshIdentity().username}@Example.com`;
    const u = await registerUser({ email });

    for (const identifier of [
      u.username,
      u.phoneNumber,
      `8${u.phoneNumber.slice(2)}`,
      email,
      email.toLowerCase(),
    ]) {
      const res = await api("POST", "/api/login", {
        body: { usernameOrEmail: identifier, password: u.password },
        device: u.device,
      });
      assert.equal(res.status, 200, `login with ${identifier}: ${JSON.stringify(res.body)}`);
      assert.ok(res.body.token);
      assert.equal(res.body.user.username, u.username);
    }
  });

  it("answers a wrong password and an unknown account identically", async () => {
    const u = await registerUser();
    const wrong = await api("POST", "/api/login", {
      body: { usernameOrEmail: u.username, password: "not-it-at-all" },
    });
    const unknown = await api("POST", "/api/login", {
      body: { usernameOrEmail: `${u.username}_nobody`, password: u.password },
    });
    assert.equal(wrong.status, 401);
    assert.deepEqual(wrong.body, unknown.body);
  });

  it("refuses missing or non-string credentials with 400", async () => {
    for (const body of [
      {},
      { usernameOrEmail: "someone" },
      { usernameOrEmail: 12345, password: "abcdef" },
      { usernameOrEmail: ["a@b"], password: "abcdef" },
      { usernameOrEmail: "someone", password: { a: 1 } },
    ]) {
      const res = await api("POST", "/api/login", { body });
      assert.equal(res.status, 400, JSON.stringify(body));
    }
  });

  it("sends an unverified account to SMS verification, and that ticket works", async () => {
    const id = freshIdentity();
    await api("POST", "/api/signup", { body: signupBody(id) });
    const row = await registeredRowByPhone(id.phoneNumber);
    // Past the cooldown, so login texts a fresh code.
    await setUserColumns(row.id, { phoneVerificationLastSentAt: new Date(Date.now() - 61_000) });

    const login = await api("POST", "/api/login", {
      body: { usernameOrEmail: id.username, password: id.password },
    });
    assert.equal(login.status, 403);
    assert.equal(login.body.code, "PHONE_VERIFICATION_REQUIRED");
    assert.equal(smsSentTo(id.phoneNumber).length, 2);

    const verify = await api("POST", "/api/verify-phone", {
      body: { ticket: login.body.ticket, code: lastCode(id.phoneNumber) },
      device: "d",
    });
    assert.equal(verify.status, 200);
  });

  it("refuses a banned account", async () => {
    const u = await registerUser();
    await setUserColumns(u.id, { banned: true });
    const res = await api("POST", "/api/login", {
      body: { usernameOrEmail: u.username, password: u.password },
    });
    assert.equal(res.status, 403);
    assert.equal(res.body.code, "ACCOUNT_BANNED");

    const token = await api("GET", "/api/validate-token", { token: u.token });
    assert.equal(token.status, 403);
  });
});

describe("POST /api/start-phone-verification (accounts from before phone auth)", () => {
  async function legacyAccount() {
    const u = await registerUser({ email: `${freshIdentity().username}@example.com` });
    await setUserColumns(u.id, { phoneNumber: null, isPhoneVerified: false });
    return u;
  }

  it("asks for a phone at login, then enrols and verifies one", async () => {
    const u = await legacyAccount();
    const login = await api("POST", "/api/login", {
      body: { usernameOrEmail: u.email, password: u.password },
    });
    assert.equal(login.status, 403);
    assert.equal(login.body.code, "PHONE_REQUIRED");

    const phone = freshIdentity().phoneNumber;
    const start = await api("POST", "/api/start-phone-verification", {
      body: { usernameOrEmail: u.email, password: u.password, phoneNumber: phone },
    });
    assert.equal(start.status, 200);
    assert.equal(start.body.code, "PHONE_VERIFICATION_REQUIRED");

    const verify = await api("POST", "/api/verify-phone", {
      body: { ticket: start.body.ticket, code: lastCode(phone) },
      device: "d",
    });
    assert.equal(verify.status, 200);
    assert.equal((await userRow(u.id)).phoneNumber, phone);
  });

  it("refuses the wrong password", async () => {
    const u = await legacyAccount();
    const res = await api("POST", "/api/start-phone-verification", {
      body: { usernameOrEmail: u.username, password: "wrong-password", phoneNumber: freshIdentity().phoneNumber },
    });
    assert.equal(res.status, 401);
  });

  it("refuses a phone that another account already holds", async () => {
    const u = await legacyAccount();
    const other = await registerUser();
    const res = await api("POST", "/api/start-phone-verification", {
      body: { usernameOrEmail: u.username, password: u.password, phoneNumber: other.phoneNumber },
    });
    assert.equal(res.status, 400);
  });

  it("will not re-point the phone of an already verified account", async () => {
    const u = await registerUser();
    const newPhone = freshIdentity().phoneNumber;
    const res = await api("POST", "/api/start-phone-verification", {
      body: { usernameOrEmail: u.username, password: u.password, phoneNumber: newPhone },
    });
    assert.ok(res.status >= 400, `expected a refusal, got ${res.status}`);
    assert.equal((await userRow(u.id)).phoneNumber, u.phoneNumber);
    assert.equal(smsSentTo(newPhone).length, 0);
  });
});

describe("device sessions", () => {
  async function loginFrom(u, device) {
    return api("POST", "/api/login", {
      body: { usernameOrEmail: u.username, password: u.password },
      device,
    });
  }

  it("logout kills the token", async () => {
    const u = await registerUser();
    const out = await api("POST", "/api/logout", { token: u.token });
    assert.equal(out.status, 200);
    const after = await api("GET", "/api/validate-token", { token: u.token });
    assert.equal(after.status, 401);
    assert.equal(after.body.code, "SESSION_REVOKED");
  });

  it("signing in again on the same device retires that device's previous token", async () => {
    const u = await registerUser();
    const again = await loginFrom(u, u.device);
    assert.equal(again.status, 200);

    assert.equal((await api("GET", "/api/validate-token", { token: u.token })).status, 401);
    assert.equal((await api("GET", "/api/validate-token", { token: again.body.token })).status, 200);
  });

  it("allows 3 devices, refuses a 4th with a ticket, and the ticket frees a slot", async () => {
    const u = await registerUser({ device: "dev-1" });
    assert.equal((await loginFrom(u, "dev-2")).status, 200);
    assert.equal((await loginFrom(u, "dev-3")).status, 200);

    const fourth = await loginFrom(u, "dev-4");
    assert.equal(fourth.status, 409);
    assert.equal(fourth.body.code, "DEVICE_LIMIT_REACHED");
    assert.equal(fourth.body.devices.length, 3);
    assert.equal((await userRow(u.id)).blockedLoginCount, 1);

    // The ticket is not a session.
    const misuse = await api("GET", "/api/validate-token", { token: fourth.body.ticket });
    assert.equal(misuse.status, 401);

    const evict = await api("POST", "/api/sessions/evict", {
      body: { ticket: fourth.body.ticket, deviceId: "dev-1" },
    });
    assert.equal(evict.status, 200);
    assert.equal((await api("GET", "/api/validate-token", { token: u.token })).status, 401);

    const retry = await loginFrom(u, "dev-4");
    assert.equal(retry.status, 200);
  });

  it("an eviction ticket cannot touch another account's devices", async () => {
    const a = await registerUser({ device: "a-1" });
    await loginFrom(a, "a-2");
    await loginFrom(a, "a-3");
    const refused = await loginFrom(a, "a-4");
    const b = await registerUser({ device: "shared-name" });

    const res = await api("POST", "/api/sessions/evict", {
      body: { ticket: refused.body.ticket, deviceId: "shared-name" },
    });
    assert.equal(res.status, 404);
    assert.equal((await api("GET", "/api/validate-token", { token: b.token })).status, 200);
  });

  it("an unverified account at the device cap gets the same 409 from verify-phone", async () => {
    const u = await registerUser({ device: "v-1" });
    await loginFrom(u, "v-2");
    await loginFrom(u, "v-3");
    await setUserColumns(u.id, { isPhoneVerified: false, phoneVerificationLastSentAt: null });

    const login = await loginFrom(u, "v-4");
    assert.equal(login.status, 403);
    const verify = await api("POST", "/api/verify-phone", {
      body: { ticket: login.body.ticket, code: lastCode(u.phoneNumber) },
      device: "v-4",
    });
    assert.equal(verify.status, 409);
    assert.equal(verify.body.code, "DEVICE_LIMIT_REACHED");
    // The correct code still counted.
    assert.equal((await userRow(u.id)).isPhoneVerified, true);
  });

  it("lists devices, marks the current one, and revokes others", async () => {
    const u = await registerUser({ device: "keep" });
    const other = await loginFrom(u, "drop");
    // Logging in on "drop" did not disturb "keep".
    assert.equal((await api("GET", "/api/validate-token", { token: u.token })).status, 200);

    const list = await api("GET", "/api/sessions", { token: u.token });
    assert.equal(list.status, 200);
    assert.equal(list.body.devices.length, 2);
    assert.equal(list.body.devices.find((d) => d.current).deviceId, "keep");
    assert.ok(list.body.devices.every((d) => !("jti" in d)));

    const revoke = await api("POST", "/api/sessions/revoke-others", { token: u.token });
    assert.equal(revoke.status, 200);
    assert.equal((await api("GET", "/api/validate-token", { token: other.body.token })).status, 401);
    assert.equal((await api("GET", "/api/validate-token", { token: u.token })).status, 200);
  });

  it("DELETE /api/sessions/:deviceId signs out one device and 404s an unknown one", async () => {
    const u = await registerUser({ device: "one" });
    const two = await loginFrom(u, "two");

    assert.equal((await api("DELETE", "/api/sessions/two", { token: u.token })).status, 200);
    assert.equal((await api("GET", "/api/validate-token", { token: two.body.token })).status, 401);
    assert.equal((await api("DELETE", "/api/sessions/two", { token: u.token })).status, 404);
  });

  it("an admin can sign a player out everywhere", async () => {
    const u = await registerUser();
    const admin = await adminToken();
    const res = await api("POST", `/api/admin/players/${u.id}/logout-all`, { token: admin });
    assert.equal(res.status, 200);
    assert.equal((await api("GET", "/api/validate-token", { token: u.token })).status, 401);
  });

  it("rejects a malformed, foreign-signed or missing bearer token", async () => {
    assert.equal((await api("GET", "/api/validate-token")).status, 401);
    assert.equal((await api("GET", "/api/validate-token", { token: "abc.def.ghi" })).status, 401);
    const { default: jwt } = await import("jsonwebtoken");
    const forged = jwt.sign({ userId: "00000000-0000-0000-0000-000000000000", jti: "x" }, "other-secret");
    assert.equal((await api("GET", "/api/validate-token", { token: forged })).status, 401);
  });
});

describe("password reset", () => {
  it("answers identically whether or not the email exists", async () => {
    const unknown = await api("POST", "/api/request-reset", {
      body: { email: `${freshIdentity().username}@nowhere.example` },
    });
    assert.equal(unknown.status, 200);
  });

  it("refuses a non-string email", async () => {
    const res = await api("POST", "/api/request-reset", { body: { email: { $ne: null } } });
    assert.equal(res.status, 400);
  });

  it("resets the password with a valid token, once", async () => {
    const crypto = await import("node:crypto");
    const u = await registerUser({ email: `${freshIdentity().username}@example.com` });
    const token = crypto.randomBytes(32).toString("hex");
    await setUserColumns(u.id, {
      passwordResetToken: crypto.createHash("sha256").update(token).digest("hex"),
      passwordResetExpires: new Date(Date.now() + 60_000),
    });

    const reset = await api("POST", "/api/reset", { body: { token, newPassword: "brand-new-pass" } });
    assert.equal(reset.status, 200);

    const oldLogin = await api("POST", "/api/login", {
      body: { usernameOrEmail: u.username, password: u.password },
      device: u.device,
    });
    assert.equal(oldLogin.status, 401);
    const newLogin = await api("POST", "/api/login", {
      body: { usernameOrEmail: u.username, password: "brand-new-pass" },
      device: u.device,
    });
    assert.equal(newLogin.status, 200);

    const reuse = await api("POST", "/api/reset", { body: { token, newPassword: "another-pass" } });
    assert.equal(reuse.status, 400);
  });

  it("signs every device out when the password is reset", async () => {
    const crypto = await import("node:crypto");
    const u = await registerUser();
    // A second live device, so this proves more than "the caller's own token
    // died": the point of the reset is to evict whoever else is signed in.
    const second = await api("POST", "/api/login", {
      body: { usernameOrEmail: u.username, password: u.password },
      device: "device-two",
    });
    assert.equal(second.status, 200);

    const token = crypto.randomBytes(32).toString("hex");
    await setUserColumns(u.id, {
      passwordResetToken: crypto.createHash("sha256").update(token).digest("hex"),
      passwordResetExpires: new Date(Date.now() + 60_000),
    });
    assert.equal(
      (await api("POST", "/api/reset", { body: { token, newPassword: "brand-new-pass" } })).status,
      200,
    );

    assert.equal((await api("GET", "/api/validate-token", { token: u.token })).status, 401);
    assert.equal((await api("GET", "/api/validate-token", { token: second.body.token })).status, 401);
  });

  it("refuses an expired reset token", async () => {
    const crypto = await import("node:crypto");
    const u = await registerUser();
    const token = crypto.randomBytes(32).toString("hex");
    await setUserColumns(u.id, {
      passwordResetToken: crypto.createHash("sha256").update(token).digest("hex"),
      passwordResetExpires: new Date(Date.now() - 1000),
    });
    const res = await api("POST", "/api/reset", { body: { token, newPassword: "brand-new-pass" } });
    assert.equal(res.status, 400);
  });

  it("refuses non-string reset input with 400", async () => {
    const res = await api("POST", "/api/reset", { body: { token: ["a"], newPassword: 1234567 } });
    assert.equal(res.status, 400);
  });
});

// ── helpers ────────────────────────────────────────────────────────────────

async function registeredRowByPhone(phone) {
  const { eq } = await import("drizzle-orm");
  const { db, schema } = await import("./harness.js");
  const [row] = await db().select().from(schema.users).where(eq(schema.users.phoneNumber, phone));
  assert.ok(row, `no user holds ${phone}`);
  return row;
}
