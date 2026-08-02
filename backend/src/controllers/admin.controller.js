import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { User } from "../models/User.js";
import { awardCurrency } from "../helpers/awardCurrency.js";

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

// POST /api/admin/grant-currency  { email, bitAward?, bitWord?, bitPhrase? }
// Dev/support tool — manually top up a user's wallet. Admin-gated only (same
// code-word JWT as the feedback panel), not exposed to regular users.
export const grantCurrency = async (req, res) => {
  const { email, bitAward = 0, bitWord = 0, bitPhrase = 0 } = req.body;

  if (!email) {
    return res.status(400).json({ error: "email is required." });
  }
  const amounts = {
    bitAward: Number(bitAward) || 0,
    bitWord: Number(bitWord) || 0,
    bitPhrase: Number(bitPhrase) || 0,
  };
  if (!amounts.bitAward && !amounts.bitWord && !amounts.bitPhrase) {
    return res.status(400).json({ error: "At least one currency amount is required." });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select("_id");
  if (!user) {
    return res.status(404).json({ error: "No user with that email." });
  }

  const wallet = await awardCurrency(user._id, amounts);
  res.json({ success: true, wallet });
};