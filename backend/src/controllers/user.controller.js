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
