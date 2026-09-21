import { audit, isId } from "../db/index.js";

// These were Mongoose schema validators (maxLength on models/Feedback.js), so a
// long submission used to fail inside save() and surface as a 500. A text
// column has no such limit, so the rule now lives here — and answers 400.
const MAX_NAME = 100;
const MAX_MESSAGE = 2000;

// The admin tab renders everything it is given. The Mongo version returned the
// whole collection; this caps it rather than letting an anonymous endpoint grow
// an admin page without bound. Paging the tab is the real fix, and a separate one.
const LIST_LIMIT = 500;

// The admin tab keys rows on `_id`, as the Mongoose documents had it.
const toJson = (row) => ({
  _id: row.id,
  name: row.name,
  message: row.message,
  createdAt: row.createdAt,
});

export const createFeedback = async (req, res) => {
  try {
    const { name, message } = req.body;
    if (typeof name !== "string" || typeof message !== "string" || !name.trim() || !message.trim()) {
      return res.status(400).json({ error: "Name and message are required." });
    }
    if (name.trim().length > MAX_NAME || message.trim().length > MAX_MESSAGE) {
      return res.status(400).json({
        error: `Name must be at most ${MAX_NAME} characters and the message at most ${MAX_MESSAGE}.`,
      });
    }

    const feedback = await audit.createFeedback(name.trim(), message.trim());

    res.status(201).json({ success: true, feedback: toJson(feedback) });
  } catch (err) {
    console.error("createFeedback error:", err);
    res.status(500).json({ error: "Failed to save feedback." });
  }
};

export const getAllFeedback = async (req, res) => {
  try {
    const { rows } = await audit.listFeedback(0, LIST_LIMIT);
    res.json({ success: true, feedback: rows.map(toJson) });
  } catch (err) {
    console.error("getAllFeedback error:", err);
    res.status(500).json({ error: "Failed to load feedback." });
  }
};

export const deleteFeedback = async (req, res) => {
  try {
    // A malformed id would be a query ERROR against a uuid column, not an empty
    // result, so it is answered here instead of reaching the database.
    if (!isId(req.params.id)) {
      return res.status(404).json({ error: "Feedback not found." });
    }
    await audit.deleteFeedback(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error("deleteFeedback error:", err);
    res.status(500).json({ error: "Failed to delete feedback." });
  }
};
