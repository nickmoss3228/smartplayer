import jwt from "jsonwebtoken";
import { config } from "../config/env.js";

export const adminAuth = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing admin token." });
  }

  const token = header.split(" ")[1];

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    if (payload.role !== "admin") throw new Error("Not admin");
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired admin token." });
  }
};