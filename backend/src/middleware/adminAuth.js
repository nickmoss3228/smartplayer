import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { ADMIN_AUDIENCE, ADMIN_ISSUER } from "../controllers/admin.controller.js";

export const adminAuth = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing admin token." });
  }

  const token = header.split(" ")[1];

  try {
    const payload = jwt.verify(token, config.jwtSecret, {
      audience: ADMIN_AUDIENCE,
      issuer: ADMIN_ISSUER,
    });
    if (payload.role !== "admin") throw new Error("Not admin");

    // This used to verify the token and then throw the payload away, which is
    // exactly why no controller could name who did anything. middleware/
    // auditLog.js reads req.admin — and its ABSENCE is also what excludes the
    // public POST /api/feedback from the audit log, since that route shares a
    // router with the admin-only DELETE /api/feedback/:id.
    req.admin = {
      name: payload.admin ?? "admin", // legacy tokens carry no name
      sessionId: payload.sid ?? null,
      tokenIssuedAt: payload.iat ? new Date(payload.iat * 1000) : null,
    };

    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired admin token." });
  }
};
