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
    
    if (!user) return res.status(401).json({ message: "Invalid token" });

    req.user = user;
    next();
      
  } catch (error) {
    console.error("Token error:", error);
    return res.status(403).json({ message: "Invalid token" });
  }
}
