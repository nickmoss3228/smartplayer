import bcrypt from "bcrypt";
import crypto from "crypto";
import { sessions, userDocs, users as usersRepo } from "../db/index.js";
import { attachSession, signDeviceTicket } from "../helpers/sessionStore.js";
import { config } from "../config/env.js";
import { sendVerificationSms } from "../services/sms.service.js";
import {
  normalizePhoneNumber,
  maskPhoneNumber,
  PHONE_CODE_TTL_MS,
  PHONE_TICKET_TTL_MS,
  PHONE_RESEND_COOLDOWN_MS,
  PHONE_MAX_ATTEMPTS,
} from "../config/phoneVerification.js";

function randomCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function makeTicket() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Bind `ticket` to this user and make sure a live code exists for it, sending
 * a fresh SMS unless the resend cooldown says one just went out.
 *
 * The ticket is rebound on EVERY call, including the cooldown one. That is the
 * whole point: the caller can always hand the client a working handle, so
 * hitting the cooldown means "we didn't text you again", not "you are now
 * locked out of a code you already received". The earlier version returned a
 * null ticket there, and a user who reloaded the page during the cooldown had
 * a valid SMS in hand and no way to submit it.
 *
 * Does NOT save — callers save, so one request is one write.
 */
async function issuePhoneCode(user, phoneNumber, ticket = makeTicket()) {
  const now = Date.now();
  // Read before the assignment below, so a change of number is detectable.
  const sameNumber = user.phoneNumber === phoneNumber;
  const sentRecently =
    user.phoneVerificationLastSentAt &&
    now - new Date(user.phoneVerificationLastSentAt).getTime() < PHONE_RESEND_COOLDOWN_MS;
  const codeStillLive =
    user.phoneVerificationCodeHash &&
    user.phoneVerificationExpires &&
    new Date(user.phoneVerificationExpires).getTime() > now;

  user.phoneNumber = phoneNumber;
  user.phoneVerificationTicketHash = hash(ticket);
  user.phoneVerificationTicketExpires = new Date(now + PHONE_TICKET_TTL_MS);

  // Reuse the outstanding code only when it would actually reach the same
  // handset. Typing a corrected number must always re-send, or the user would
  // be asked to confirm a code that went to the number they just fixed.
  if (sentRecently && codeStillLive && sameNumber) {
    return { cooldown: true, ticket };
  }

  const code = randomCode();
  user.phoneVerificationCodeHash = hash(code);
  user.phoneVerificationExpires = new Date(now + PHONE_CODE_TTL_MS);
  user.phoneVerificationAttempts = 0;
  user.phoneVerificationLastSentAt = new Date(now);
  await sendVerificationSms(phoneNumber, code);
  return { cooldown: false, ticket };
}

// SMS misconfiguration is an operator problem, not the caller's. Say so with a
// 503 rather than the generic 500 every other failure gets, so it is obvious
// from the browser's network tab that the server is missing credentials.
function isSmsConfigError(error) {
  return error.code === "SMS_NOT_CONFIGURED" || error.code === "SMS_PROVIDER_UNSUPPORTED";
}

/** A JSON body can carry any type; every identity field must be a real string. */
function isText(value) {
  return typeof value === "string" && value.length > 0;
}

function verificationResponse(user, ticket) {
  return {
    code: "PHONE_VERIFICATION_REQUIRED",
    message: "Verify your phone number to continue.",
    ticket,
    phoneNumber: maskPhoneNumber(user.phoneNumber),
  };
}

export async function signup(req, res) {
  try {
    const {
      username,
      email,
      phoneNumber: rawPhoneNumber,
      password,
      acceptedTerms,
      acceptedDataConsent,
      legalVersion,
    } = req.body;
    const phoneNumber = normalizePhoneNumber(rawPhoneNumber);

    // Read per request, never captured in a module const: config is mutable and
    // test/api/harness.js boots the app in-process, so a test flips this
    // between describes to exercise both signup shapes in one run.
    const verifyByPhone = config.phoneVerificationRequired;

    // Otherwise an object such as {"$gt": ""} reaches the INSERT and is stored
    // as its JSON text — a real account named `{"$gt":""}`.
    if (email !== undefined && email !== null && email !== "" && typeof email !== "string") {
      return res.status(400).json({ message: "Email must be a string" });
    }

    if (!isText(username) || !isText(password)) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    if (verifyByPhone) {
      if (!phoneNumber) {
        return res
          .status(400)
          .json({ message: "Username, phone number, and password are required" });
      }
    } else {
      // Phone verification is off, so the phone cannot be the identity. Email
      // takes its place as the thing that must be there — it is the only way
      // to reach this person, and the whole point of collecting it.
      if (!isText(email)) {
        return res.status(400).json({ message: "Username, email, and password are required" });
      }
      // A phone is welcome but optional. If one IS supplied it still has to be
      // a real number: phone_number is UNIQUE, and junk in a unique column is
      // a collision nobody can explain later.
      if (isText(rawPhoneNumber) && !phoneNumber) {
        return res.status(400).json({ message: "Enter a valid phone number, or leave it blank." });
      }
    }

    // Enforced here, not only in the form. The signup endpoint is reachable
    // without the page — and an account created without a recorded consent is
    // an account the operator cannot lawfully process data for, so refusing is
    // the only correct answer rather than defaulting the flags to true.
    //
    // `=== true`: a JSON body can carry "false", 0 or "on" for a checkbox, and
    // only an actual boolean true is an acceptance.
    if (acceptedTerms !== true || acceptedDataConsent !== true) {
      return res.status(400).json({
        code: "AGREEMENTS_REQUIRED",
        message:
          "The user agreement and the personal-data consent must both be accepted.",
      });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }

    // Email remains optional for password recovery; phone is the verified
    // identity used for signup/login.
    const existingUser = await userDocs.loadUserByAnyIdentity({ username, phoneNumber, email });

    // A signup that never got past the SMS step owns nothing: no progress, no
    // purchases, an unusable password. Clearing it lets the same person retry
    // — which is the normal case, because the reasons verification fails
    // (mistyped digit, SMS never delivered) are exactly the reasons someone
    // starts over. Without this, one typo burns that username permanently and
    // the retry is met with "Username already exists".
    //
    // pendingRegistration, not `!isPhoneVerified`, is what makes this safe:
    // a pre-phone-auth account that is mid-enrolment is also unverified and
    // also has a phone, and it holds everything the user has ever done.
    if (existingUser?.pendingRegistration) {
      await userDocs.deleteUser(existingUser._id, { pendingOnly: true });
    } else if (existingUser) {
      if (existingUser.username === username) {
        return res.status(400).json({ message: "Username already exists" });
      }
      if (email && existingUser.email === email.toLowerCase()) {
        return res.status(400).json({ message: "Email already exists" });
      }
      if (existingUser.phoneNumber === phoneNumber) {
        return res.status(400).json({ message: "Phone number already exists" });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // One timestamp for both: they were ticked on the same form, in the same
    // submission, and pretending to know a sub-second ordering between them
    // would be inventing precision.
    const consentedAt = new Date();

    const user = await userDocs.createUser({
      username,
      email: email?.toLowerCase(),
      phoneNumber,
      password: hashedPassword,
      // Only a phone-verified signup is "pending": that flag exists so an
      // abandoned SMS step can be cleared away and retried. With no SMS step
      // there is nothing to abandon, and the account is real immediately.
      pendingRegistration: verifyByPhone,
      legalConsent: {
        // Recorded as whatever the client said it was showing, and trimmed —
        // it is evidence of which text was on screen, not an instruction.
        version: typeof legalVersion === "string" ? legalVersion.slice(0, 32) : undefined,
        termsAcceptedAt: consentedAt,
        dataConsentAcceptedAt: consentedAt,
      },
    });
    // ── No SMS step: the account is finished, so sign them straight in ─────
    //
    // Nothing below may touch the SMS provider. That is the entire reason this
    // branch exists: issuePhoneCode's failure path deletes the account it was
    // called for, so with no provider configured signup did not merely fail,
    // it left no row behind — and counting sign-ups was impossible.
    //
    // isPhoneVerified stays FALSE on purpose. It records whether a number has
    // actually been proven, and no number has been. Writing true would be a
    // lie that survives into the future: switch verification back on and these
    // accounts would be trusted forever without ever having passed a code.
    if (!verifyByPhone) {
      const result = attachSession(user, req);
      await user.save();

      if (result.atCapacity) {
        // Same contract as login and verifyPhone, so the client's device
        // picker handles this without caring which endpoint it came from.
        return res.status(409).json({
          code: "DEVICE_LIMIT_REACHED",
          message: "This account is already signed in on the maximum number of devices.",
          ticket: signDeviceTicket(user._id),
          devices: result.devices,
        });
      }
      // Same body verifyPhone returns on success, so the client has exactly
      // one shape to understand for "you are signed in".
      return res.status(201).json({
        token: result.token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          phoneNumber: user.phoneNumber,
          createdAt: user.createdAt,
        },
      });
    }

    const ticket = makeTicket();
    try {
      await issuePhoneCode(user, phoneNumber, ticket);
    } catch (error) {
      // Do not leave an account permanently occupying its username/phone when
      // SMS setup is missing or the provider rejects the first message.
      await userDocs.deleteUser(user._id);
      throw error;
    }
    await user.save();

    res.status(201).json(verificationResponse(user, ticket));
  } catch (error) {
    console.error("Registration error:", error);
    if (isSmsConfigError(error)) {
      return res.status(503).json({ code: error.code, message: "SMS verification is not configured on the server." });
    }
    // Two accounts racing for the same username/phone lose the unique index
    // rather than the findOne above. Report the collision, not a server fault.
    if (userDocs.isUniqueViolation(error)) {
      return res.status(400).json({ message: "That username or phone number is already taken" });
    }
    res.status(500).json({ message: "Server error" });
  }
}

export async function login(req, res) {
  try {
    const { usernameOrEmail, password } = req.body;

    if (!isText(usernameOrEmail) || !isText(password)) {
      return res
        .status(400)
        .json({ message: "Username/email and password are required" });
    }

    // Find user by username OR email
    const normalizedPhone = normalizePhoneNumber(usernameOrEmail);
    const user = usernameOrEmail.includes("@")
      ? await userDocs.loadUserBy("email", usernameOrEmail)
      : normalizedPhone
        ? await userDocs.loadUserBy("phoneNumber", normalizedPhone)
        : await userDocs.loadUserBy("username", usernameOrEmail);

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.banned) {
      return res
        .status(403)
        .json({ message: "This account has been banned.", code: "ACCOUNT_BANNED" });
    }

    // Gated on the flag rather than on a column we could have flipped at
    // signup. Accounts made while verification was off genuinely have an
    // unproven number, and `isPhoneVerified` keeps saying so — so when
    // verification is switched back on they are asked for a code at their next
    // login, which is exactly right. Writing `true` at signup would have
    // silently trusted every one of them forever.
    if (config.phoneVerificationRequired && !user.isPhoneVerified) {
      if (!user.phoneNumber) {
        return res.status(403).json({
          code: "PHONE_REQUIRED",
          message: "Add and verify a phone number to continue.",
        });
      }
      // The cooldown is not an error here. Whether or not a new SMS went out,
      // the user has a live code and now a ticket to spend it with, so the
      // answer is the same either way: show the code form.
      const ticket = makeTicket();
      await issuePhoneCode(user, user.phoneNumber, ticket);
      await user.save();
      return res.status(403).json(verificationResponse(user, ticket));
    }

    // Bind this login to a device slot. A 4th device is refused rather than
    // silently evicting one of the other three: the whole point is that
    // sharing a password becomes visible and annoying, and a user who is
    // quietly logged out of their own phone has no idea why.
    const result = attachSession(user, req);
    // Saved on both paths — the capacity branch has its own bookkeeping to
    // persist (blockedLoginCount), which is a headline input to the sharing
    // score in the admin panel.
    await user.save();

    if (result.atCapacity) {
      // 409 Conflict, not 403: the credentials were correct and nothing is
      // forbidden. The request conflicts with the current state of the
      // account, and the client can resolve it by freeing a slot. The
      // frontend interceptor also treats 401/403 as "session died", so a 403
      // here would sign out the user's OTHER tabs on a failed login.
      return res.status(409).json({
        code: "DEVICE_LIMIT_REACHED",
        message:
          "This account is already signed in on the maximum number of devices.",
        // Scoped, 5-minute authorization to free one slot without holding a
        // session token — see signDeviceTicket().
        ticket: signDeviceTicket(user._id),
        devices: result.devices,
      });
    }

    res.json({
      message: "Login successful",
      token: result.token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    if (isSmsConfigError(error)) {
      return res.status(503).json({ code: error.code, message: "SMS verification is not configured on the server." });
    }
    res.status(500).json({ message: "Server error" });
  }
}

export const logout = async (req, res) => {
  try {
    // This used to be a no-op that only reported success — a stateless JWT had
    // nowhere to be invalidated, so "logging out" just meant the frontend threw
    // its copy away while the token stayed valid for up to seven more days.
    // Pulling the session row is what finally makes that token dead: the very
    // next request carrying it fails the jti lookup in middleware/auth.js.
    //
    // req.session is set by authenticateToken (this route is authenticated).
    // It is absent only for a legacy token still inside the grace window, in
    // which case there is no row to pull and success is the honest answer.
    if (req.session?.jti) {
      await sessions.removeByJti(req.session.jti);
    }

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Error during logout",
    });
  }
};

export async function verifyPhone(req, res) {
  try {
    const { ticket, code } = req.body;
    const expired = { code: "INVALID_VERIFICATION", message: "Verification expired. Please request a new code." };
    if (typeof ticket !== "string" || !ticket) return res.status(400).json(expired);
    if (typeof code !== "string" && typeof code !== "number") {
      return res.status(400).json({ code: "INVALID_VERIFICATION", message: "The verification code is incorrect or expired." });
    }

    const ticketHash = hash(ticket);
    // The attempt is spent atomically BEFORE anything is graded — see
    // claimPhoneVerificationAttempt. Counting it on the loaded doc and saving
    // afterwards let parallel guesses all read the same count and all be graded.
    const claim = await usersRepo.claimPhoneVerificationAttempt(ticketHash, PHONE_MAX_ATTEMPTS);
    if (claim === "unknown") return res.status(400).json(expired);

    const user = await userDocs.loadUserByPhoneTicket(ticketHash);
    if (!user) return res.status(400).json(expired);
    // Checked here as well as at login: an unverified banned account reaches
    // this endpoint without ever passing through login's ban check, and
    // verifying is precisely what would hand it a session token.
    if (user.banned) {
      return res
        .status(403)
        .json({ message: "This account has been banned.", code: "ACCOUNT_BANNED" });
    }
    if (claim === "exhausted") {
      return res.status(429).json({ code: "TOO_MANY_VERIFICATION_ATTEMPTS", message: "Too many incorrect codes. Request a new code." });
    }
    if (new Date(user.phoneVerificationExpires).getTime() < Date.now() || hash(String(code)) !== user.phoneVerificationCodeHash) {
      return res.status(400).json({ code: "INVALID_VERIFICATION", message: "The verification code is incorrect or expired." });
    }

    user.isPhoneVerified = true;
    // The account is real from here on; it can no longer be cleared away by
    // someone signing up with the same username.
    user.pendingRegistration = false;
    user.phoneVerificationCodeHash = null;
    user.phoneVerificationExpires = null;
    user.phoneVerificationTicketHash = null;
    user.phoneVerificationTicketExpires = null;
    user.phoneVerificationAttempts = 0;
    user.phoneVerificationLastSentAt = null;

    const result = attachSession(user, req);
    // Saved either way. The verification itself succeeded and must stick even
    // when no device slot is free — otherwise freeing a slot sends the user
    // back through an SMS they have already paid for with a correct code.
    await user.save();

    if (result.atCapacity) {
      // Same 409 contract as login, so the frontend's device picker handles
      // both without caring which one it came from. Before this, attachSession
      // returned no token here and the client threw "Verification response was
      // incomplete" — a correct code looking like a server bug.
      return res.status(409).json({
        code: "DEVICE_LIMIT_REACHED",
        message: "This account is already signed in on the maximum number of devices.",
        ticket: signDeviceTicket(user._id),
        devices: result.devices,
      });
    }

    res.json({ token: result.token, user: { id: user._id, username: user.username, email: user.email, phoneNumber: user.phoneNumber, createdAt: user.createdAt } });
  } catch (error) {
    console.error("Phone verification error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function resendPhoneCode(req, res) {
  try {
    const { ticket } = req.body;
    const user = isText(ticket) ? await userDocs.loadUserByPhoneTicket(hash(ticket)) : null;
    if (!user) return res.status(400).json({ code: "INVALID_VERIFICATION", message: "Verification expired. Please start again." });
    const result = await issuePhoneCode(user, user.phoneNumber, ticket);
    await user.save();
    // 200 even when throttled: the outstanding code is still good, so the user
    // is not blocked, and `cooldown` lets the UI say "check the SMS you already
    // have" instead of claiming a new one is on its way.
    res.json({ ok: true, cooldown: result.cooldown, phoneNumber: maskPhoneNumber(user.phoneNumber) });
  } catch (error) {
    console.error("Phone code resend error:", error);
    if (isSmsConfigError(error)) {
      return res.status(503).json({ code: error.code, message: "SMS verification is not configured on the server." });
    }
    res.status(500).json({ message: "Could not send the verification SMS" });
  }
}

// Migration path for accounts created before phone verification existed.
// Password proof is required before a phone can be attached to an account.
export async function startPhoneVerification(req, res) {
  try {
    const { usernameOrEmail, password, phoneNumber: rawPhoneNumber } = req.body;
    const phoneNumber = normalizePhoneNumber(rawPhoneNumber);
    if (!isText(usernameOrEmail) || !isText(password) || !phoneNumber) {
      return res.status(400).json({ message: "Username/email, password, and a valid Russian phone number are required" });
    }
    const user = usernameOrEmail.includes("@")
      ? await userDocs.loadUserBy("email", usernameOrEmail)
      : await userDocs.loadUserBy("username", usernameOrEmail);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    if (user.banned) {
      return res
        .status(403)
        .json({ message: "This account has been banned.", code: "ACCOUNT_BANNED" });
    }
    // This endpoint enrols a FIRST phone. Without this guard, the password
    // alone was enough to point a verified account at a different number — and
    // issuePhoneCode writes that number before it is confirmed, so the owner's
    // phone login broke on the spot even if the new code was never entered.
    // Changing a verified number needs proof from the old handset, which this
    // flow does not have.
    if (user.isPhoneVerified) {
      return res.status(409).json({
        code: "PHONE_ALREADY_VERIFIED",
        message: "This account already has a verified phone number. Sign in instead.",
      });
    }
    if (await userDocs.phoneTakenByOther(phoneNumber, user._id)) {
      return res.status(400).json({ message: "Phone number already exists" });
    }
    const ticket = makeTicket();
    // Cooldown is not a failure — see login. The ticket is live regardless, so
    // hand back the same response and let the user enter the code they have.
    await issuePhoneCode(user, phoneNumber, ticket);
    await user.save();
    res.status(200).json(verificationResponse(user, ticket));
  } catch (error) {
    console.error("Phone enrollment error:", error);
    if (isSmsConfigError(error)) {
      return res.status(503).json({ code: error.code, message: "SMS verification is not configured on the server." });
    }
    res.status(500).json({ message: "Server error" });
  }
}

export const validateToken = async (req, res) => {
  try {
    // If we reach here, the token is valid (thanks to authenticateToken middleware)
    // req.user should contain the decoded user info from the JWT

    // Optionally, you can fetch fresh user data from the database
    // const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      message: "Token is valid",
      user: {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email,
      },
    });
  } catch (error) {
    console.error("Token validation error:", error);
    res.status(500).json({
      success: false,
      message: "Error validating token",
    });
  }
};
