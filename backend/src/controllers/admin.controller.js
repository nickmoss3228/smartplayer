import jwt from "jsonwebtoken";
import { config } from "../config/env.js";

export const adminLogin = (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: "Code word is required." });
  }

  if (code !== config.adminCode) {
    return res.status(401).json({ error: "Invalid code word." });
  }

  const token = jwt.sign({ role: "admin" }, config.jwtSecret, {
    expiresIn: "12h",
  });

  res.json({ success: true, token });
};