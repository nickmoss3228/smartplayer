import bcrypt from "bcrypt";
import crypto from "crypto";
import { User } from "../models/User.js";
import { sendPasswordResetEmail } from "../services/email.service.js";

export async function requestPasswordReset(req, res) {
  try {
    const { email } = req.body;

    const allUsers = await User.find({});
    console.log(
      "All users in DB:",
      allUsers.map((u) => u.email)
    );

    console.log("=== PASSWORD RESET REQUEST ===");
    console.log("Email received:", email);

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({
      email: { $regex: new RegExp(`^${email}$`, "i") },
    });
    console.log("User found:", user ? "YES" : "NO");

    // Don't reveal if user exists for security
    if (!user) {
      console.log("User not found - sending generic response");
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

    console.log(
      "Token generated (first 10 chars):",
      resetToken.substring(0, 10)
    );

    // Save hashed token and expiry to user
    user.passwordResetToken = resetTokenHash;
    user.passwordResetExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    console.log("User updated with reset token");

    // Send email with plain token
    const resetUrl = `${process.env.FRONTEND_URL}/forgot-password?token=${resetToken}`;

    try {
      await sendPasswordResetEmail(user.email, resetUrl, user.username);

      console.log("Password reset email sent successfully");
      console.log("==============================");

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
      console.error("==============================");
      return res.status(500).json({
        message: "Error sending email. Please try again later.",
      });
    }
  } catch (error) {
    console.error("Password reset request error:", error);
    console.error("==============================");
    res.status(500).json({ message: "Server error" });
  }
}

export async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;

    console.log("=== PASSWORD RESET CONFIRMATION ===");
    console.log("Token received (first 10 chars):", token?.substring(0, 10));

    if (!token || !newPassword) {
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
    const user = await User.findOne({
      passwordResetToken: resetTokenHash,
      passwordResetExpires: { $gt: Date.now() },
    });

    console.log("User found with valid token:", user ? "YES" : "NO");

    if (!user) {
      console.log("Invalid or expired token");
      console.log("===================================");
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

    console.log("Password reset successful for user:", user.email);
    console.log("===================================");

    res.status(200).json({
      message: "Password has been reset successfully",
    });
  } catch (error) {
    console.error("Password reset error:", error);
    console.error("===================================");
    res.status(500).json({ message: "Server error" });
  }
}
