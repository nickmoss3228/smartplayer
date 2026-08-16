import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { config } from "../config/env.js";

export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ message: "Token required" });
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(decoded.userId).select("-password");
    
    // `code` is what the frontend interceptor (services/apiClient.ts) branches
    // on to tell "you've been suspended" apart from "your session expired" —
    // materially different information, since a banned user who sees the
    // generic message will just keep retrying a login that also 403s.
    if (!user) return res.status(401).json({ message: "Invalid token", code: "INVALID_TOKEN" });
    if (user.banned) {
      return res
        .status(403)
        .json({ message: "This account has been banned.", code: "ACCOUNT_BANNED" });
    }

    req.user = user;
    next();

  } catch (error) {
    console.error("Token error:", error);
    // 401, not 403: a malformed or expired JWT is "you are not authenticated",
    // which leaves 403 to mean "authenticated but not allowed" (i.e. banned).
    // Safe to change because the interceptor treats both statuses identically.
    return res.status(401).json({ message: "Invalid token", code: "INVALID_TOKEN" });
  }
}
