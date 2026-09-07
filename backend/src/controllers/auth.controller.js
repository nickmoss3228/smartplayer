import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { config } from "../config/env.js";

export async function signup(req, res) {
  try {
    const {
      username,
      email,
      password,
      acceptedTerms,
      acceptedDataConsent,
      legalVersion,
    } = req.body;

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ message: "Username, email, and password are required" });
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

    // Check if username or email already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      if (existingUser.username === username) {
        return res.status(400).json({ message: "Username already exists" });
      }
      if (existingUser.email === email) {
        return res.status(400).json({ message: "Email already exists" });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // One timestamp for both: they were ticked on the same form, in the same
    // submission, and pretending to know a sub-second ordering between them
    // would be inventing precision.
    const consentedAt = new Date();

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      legalConsent: {
        // Recorded as whatever the client said it was showing, and trimmed —
        // it is evidence of which text was on screen, not an instruction.
        version:
          typeof legalVersion === "string" ? legalVersion.slice(0, 32) : undefined,
        termsAcceptedAt: consentedAt,
        dataConsentAcceptedAt: consentedAt,
      },
    });

    const token = jwt.sign({ userId: user._id }, config.jwtSecret, {
      expiresIn: "7d",
    });

    res.status(201).json({
      message: "User created successfully",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function login(req, res) {
  try {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
      return res
        .status(400)
        .json({ message: "Username/email and password are required" });
    }

    // Find user by username OR email
    const user = await User.findOne({
      $or: [
        { username: usernameOrEmail },
        { email: usernameOrEmail.toLowerCase() },
      ],
    });

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

    const token = jwt.sign({ userId: user._id }, config.jwtSecret, {
      expiresIn: "7d",
    });

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export const logout = async (req, res) => {
  try {
    // Since JWT tokens are stateless, we can't actually "invalidate" them on the server
    // The logout is primarily handled on the frontend by removing the token
    // But we can still send a success response
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
