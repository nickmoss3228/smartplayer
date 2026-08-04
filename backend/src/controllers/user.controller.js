// export async function getDashboard(req, res) {
//   res.json({
//     user: {
//       id: req.user._id,
//       username: req.user.username,
//       createdAt: req.user.createdAt,
//       email: req.user.email
//     },
//   });
// }
// controllers/user.controller.js
import { User } from "../models/User.js";
import { escapeRegex } from "../helpers/regex.js";

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;
const SEARCH_MIN_LENGTH = 2;
const SEARCH_RESULTS_LIMIT = 20;

export async function getProfile(req, res) {
  try {
    const user = await User.findById(req.user._id).select(
      "username email nickname"
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      username: user.username,
      email: user.email,
      nickname: user.nickname ?? user.username,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function updateProfile(req, res) {
  try {
    const { nickname } = req.body;
    const updates = {};

    if (nickname !== undefined) {
      const trimmed = nickname.trim();
      if (trimmed.length < 1 || trimmed.length > 30)
        return res
          .status(400)
          .json({ message: "Nickname must be between 1 and 30 characters" });
      updates.nickname = trimmed;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, select: "username email nickname" }
    );

    res.json({
      username: user.username,
      email: user.email,
      nickname: user.nickname ?? user.username,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// PATCH /user/heartbeat — called periodically by the frontend while a
// session is open, so other players see this user as "online" (see
// searchPlayers below). Stateless JWT auth means there's no session table to
// query, so a bumped timestamp is the simplest presence signal.
export async function heartbeat(req, res) {
  try {
    await User.findByIdAndUpdate(req.user._id, { lastActiveAt: new Date() });
    res.json({ ok: true });
  } catch (error) {
    console.error("Heartbeat error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /user/search?q=... — find a specific player by username/nickname or
// exact email, rather than exposing a full browsable roster (no directory of
// every signed-up user — you have to already know who you're looking for).
// An email match must be exact (case-insensitive) so a partial guess can't
// be used to enumerate other users' addresses; username/nickname allow a
// partial, case-insensitive match since those are already shown to other
// players once found.
export async function searchPlayers(req, res) {
  try {
    const q = (req.query.q ?? "").trim();
    if (q.length < SEARCH_MIN_LENGTH) return res.json({ players: [] });

    const isEmail = q.includes("@");
    const filter = isEmail
      ? { email: q.toLowerCase() }
      : {
          $or: [
            { username: new RegExp(escapeRegex(q), "i") },
            { nickname: new RegExp(escapeRegex(q), "i") },
          ],
        };

    const users = await User.find({ $and: [filter, { _id: { $ne: req.user._id } }] })
      .select("username nickname character lastActiveAt")
      .limit(SEARCH_RESULTS_LIMIT);

    const now = Date.now();
    res.json({
      players: users.map((user) => ({
        id: user._id,
        username: user.username,
        nickname: user.nickname ?? user.username,
        character: user.character,
        online: now - new Date(user.lastActiveAt).getTime() < ONLINE_THRESHOLD_MS,
      })),
    });
  } catch (error) {
    console.error("Search players error:", error);
    res.status(500).json({ message: "Server error" });
  }
}
