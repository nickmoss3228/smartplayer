import bcrypt from "bcrypt";
import crypto from "crypto";
import { sessions, userDocs } from "../db/index.js";
import { sendPasswordResetEmail } from "../services/email.service.js";

export async function requestPasswordReset(req, res) {

  const BASE_URL = process.env.FRONTEND_URL
  try {
    const { email } = req.body;

    // Nothing about the outcome is logged from here on. The endpoint's whole
    // contract is that the reply does not say whether the address has an
    // account — printing "User found: YES" next to the request that carries
    // the address hands that answer to anyone with container log access, and
    // the logs outlive the request.

    // typeof, not just falsiness. The query below is parameterised, so an
    // object here can no longer become a Mongo-style operator — but it would
    // still crash on .toLowerCase(), and a 400 is the honest answer.
    if (!email || typeof email !== "string") {
      return res.status(400).json({ message: "Email is required" });
    }

    // Exact match on the stored value, NOT a pattern. An earlier version built
    // a case-insensitive RegExp from the request body, so {"email": ".*"}
    // matched the first account and mailed it a reset link nobody asked for,
    // defeating the no-enumeration response below. Emails are stored
    // lowercased, so lowercasing the input is all the case-insensitivity this
    // needs, and an equality match uses the unique index.
    // The link is built from FRONTEND_URL, so a server started without it
    // mails out "undefined/forgot-password?token=…" — a dead link, and the
    // token is spent either way. Refuse here, before anything is sent.
    if (!BASE_URL) {
      console.error("Password reset requested but FRONTEND_URL is not set");
      return res.status(500).json({ message: "Server error" });
    }

    const user = await userDocs.loadUserBy("email", email);

    // Don't reveal if user exists for security
    if (!user) {
      return res.status(200).json({
        message:
          "If an account exists with this email, a password reset link has been sent",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Save hashed token and expiry to user
    user.passwordResetToken = resetTokenHash;
    user.passwordResetExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send email with plain token
    // Deliberately NOT logged: the URL carries a live, unhashed reset token.
    // Anyone with container log access could use it to take over the account.
    const resetUrl = `${BASE_URL}/forgot-password?token=${resetToken}`;

    try {
      await sendPasswordResetEmail(user.email, resetUrl, user.username);

      res.status(200).json({
        message:
          "If an account exists with this email, a password reset link has been sent",
      });
    } catch (emailError) {
      // If email fails, remove token from database
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      console.error("Email sending failed:", emailError);
      return res.status(500).json({
        message: "Error sending email. Please try again later.",
      });
    }
  } catch (error) {
    console.error("Password reset request error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;

    if (typeof token !== "string" || !token || typeof newPassword !== "string" || !newPassword) {
      return res
        .status(400)
        .json({ message: "Token and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long",
      });
    }

    // Hash the token to compare with stored hash
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Find user with valid token and not expired
    const user = await userDocs.loadUserByResetToken(resetTokenHash);

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired reset token",
      });
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Every device is signed out, including the one doing the reset. Until
    // this, a reset changed the password and nothing else: the sessions are
    // JWTs bound to rows in user_session, and those rows survived, so a stolen
    // token stayed live for up to seven more days. Someone resetting BECAUSE
    // their account was taken kept the attacker signed in — which is the one
    // case the whole flow exists for.
    //
    // After the save, so a failure here cannot leave the account holding the
    // old password with its sessions torn down.
    await sessions.removeAll(user._id);

    res.status(200).json({
      message: "Password has been reset successfully",
    });
  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({ message: "Server error" });
  }
}
