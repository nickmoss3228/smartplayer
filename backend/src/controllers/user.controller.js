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

const VALID_AVATARS = [
  "cat", "fox", "bear", "rabbit", "owl",
  "wolf", "deer", "panda", "tiger", "frog",
];

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;
const PLAYERS_PAGE_LIMIT = 30;

export async function getProfile(req, res) {
  try {
    const user = await User.findById(req.user._id).select(
      "username email nickname avatar"
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      username: user.username,
      email: user.email,
      nickname: user.nickname ?? user.username,
      avatar: user.avatar ?? "cat",
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function updateProfile(req, res) {
  try {
    const { nickname, avatar } = req.body;
    const updates = {};

    if (nickname !== undefined) {
      const trimmed = nickname.trim();
      if (trimmed.length < 1 || trimmed.length > 30)
        return res
          .status(400)
          .json({ message: "Nickname must be between 1 and 30 characters" });
      updates.nickname = trimmed;
    }

    if (avatar !== undefined) {
      if (!VALID_AVATARS.includes(avatar))
        return res.status(400).json({ message: "Invalid avatar selection" });
      updates.avatar = avatar;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, select: "username email nickname avatar" }
    );

    res.json({
      username: user.username,
      email: user.email,
      nickname: user.nickname ?? user.username,
      avatar: user.avatar ?? "cat",
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// PATCH /user/heartbeat — called periodically by the frontend while a
// session is open, so other players see this user as "online" (see
// listPlayers below). Stateless JWT auth means there's no session table to
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

// GET /user/players?page=1 — the multiplayer player list. Every user is
// visible to every other logged-in user (no friends/classes concept exists),
// so this is a simple paginated scan excluding the requester.
export async function listPlayers(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = PLAYERS_PAGE_LIMIT;

    const [users, total] = await Promise.all([
      User.find({ _id: { $ne: req.user._id } })
        .select("username nickname avatar lastActiveAt")
        .sort({ lastActiveAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments({ _id: { $ne: req.user._id } }),
    ]);

    const now = Date.now();
    res.json({
      players: users.map((user) => ({
        id: user._id,
        username: user.username,
        nickname: user.nickname ?? user.username,
        avatar: user.avatar ?? "cat",
        online: now - new Date(user.lastActiveAt).getTime() < ONLINE_THRESHOLD_MS,
      })),
      page,
      hasMore: page * limit < total,
    });
  } catch (error) {
    console.error("List players error:", error);
    res.status(500).json({ message: "Server error" });
  }
}
