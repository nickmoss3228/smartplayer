import { Progress } from "../models/Progress.js";
const difficulties = ["easy", "medium", "hard"];
const TOTAL_LEVELS = 10;

export async function getProgress(req, res) {
  try {
    const { difficulty } = req.params;
    const userId = req.user._id;
    if (!difficulties.includes(difficulty))
      return res.status(400).json({ message: "Invalid difficulty level" });

    let progress = await Progress.findOne({ userId, difficulty });
    if (!progress) {
      progress = await Progress.create({
        userId,
        difficulty,
        completedLevels: [],
        currentLevel: 1,
        levelResults: new Map(),
      });
    }

    res.json({
      completedLevels: progress.completedLevels,
      currentLevel: progress.currentLevel,
      levelResults: progress.levelResults,
      totalLevels: TOTAL_LEVELS,
    });
  } catch (error) {
    console.error("Get progress error:", error);
    res.status(500).json({ message: "Server error" });
  }
}
export async function completeLevel(req, res) {
  try {
    console.log('Request body:', req.body); // Debug line
    console.log('Request headers:', req.headers); // Debug line
    
    const { difficulty, level, correctAnswers, totalQuestions } = req.body;
    const userId = req.user._id;

     console.log('Completing level:', { difficulty, level, correctAnswers, totalQuestions, userId }); // Add logging

    if (!difficulties.includes(difficulty))
      return res.status(400).json({ message: "Invalid difficulty level" });
    if (!level || correctAnswers === undefined || !totalQuestions)
      return res.status(400).json({ message: "Missing required fields" });

    // Validate that correctAnswers is not greater than totalQuestions
    if (correctAnswers > totalQuestions) {
      return res.status(400).json({ message: "Invalid quiz results: correct answers cannot exceed total questions" });
    }

    const minCorrectAnswers = Math.ceil(totalQuestions * 0.7);
    const isCompleted = correctAnswers >= minCorrectAnswers;

    let progress = await Progress.findOne({ userId, difficulty });
    if (!progress) {
      progress = new Progress({
        userId,
        difficulty,
        completedLevels: [],
        currentLevel: 1,
        levelResults: new Map(),
      });
    }

    progress.levelResults.set(level.toString(), {
      completed: isCompleted,
      correctAnswers,
      totalQuestions,
      completedAt: new Date(),
    });

    if (isCompleted) {
      if (!progress.completedLevels.includes(level)) {
        progress.completedLevels.push(level);
        progress.completedLevels.sort((a, b) => a - b);
      }
      if (level === progress.currentLevel && level < TOTAL_LEVELS) {
        progress.currentLevel = level + 1;
      }
    }

    await progress.save();

     console.log('Progress saved:', progress); // Add logging

    res.json({
      message: isCompleted
        ? "Level completed successfully"
        : "Level is not completed. Try again!",
      completed: isCompleted,
      progress: {
        completedLevels: progress.completedLevels,
        currentLevel: progress.currentLevel,
        levelResults: Object.fromEntries(progress.levelResults),
      },
    });
  } catch (error) {
    console.error("Complete level error:", error);
    res.status(500).json({ message: "Server error" });
  }
}
export async function getOverview(req, res) {
  try {
    const userId = req.user._id;
    const progressData = await Progress.find({ userId });

    const overview = {
      easy: { completed: 0, total: TOTAL_LEVELS },
      medium: { completed: 0, total: TOTAL_LEVELS },
      hard: { completed: 0, total: TOTAL_LEVELS },
    };

    progressData.forEach((p) => {
      overview[p.difficulty].completed = p.completedLevels.length;
    });

    res.json(overview);
  } catch (error) {
    console.error("Get overview error:", error);
    res.status(500).json({ message: "Server error" });
  }
}
