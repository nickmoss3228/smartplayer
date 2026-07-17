import { Feedback } from "../models/Feedback.js";

export const createFeedback = async (req, res) => {
  try {
    const { name, message } = req.body;
    if (!name?.trim() || !message?.trim()) {
      return res.status(400).json({ error: "Name and message are required." });
    }

    const feedback = await Feedback.create({
      name: name.trim(),
      message: message.trim(),
    });

    res.status(201).json({ success: true, feedback });
  } catch (err) {
    console.error("createFeedback error:", err);
    res.status(500).json({ error: "Failed to save feedback." });
  }
};

export const getAllFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.find().sort({ createdAt: -1 });
    res.json({ success: true, feedback });
  } catch (err) {
    console.error("getAllFeedback error:", err);
    res.status(500).json({ error: "Failed to load feedback." });
  }
};