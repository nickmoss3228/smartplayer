import express from "express"; 
import { corsMiddleware } from "./middleware/cors.js";
import routes from "./routes/index.js";

const app = express();

// Logging middleware comes 1st to log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use(corsMiddleware);
app.use(express.json()); // parses JSON request bodies
app.use(express.urlencoded({ extended: true })); // parses URL-encoded bodies

// Add this root route handler
app.get('/', (req, res) => {
  res.json({ 
    message: 'Express server is running!',
    version: '1.0.0',
    endpoints: {
      auth: '/api/signup, /api/login, /api/logout, /api/validate-token',
      user: '/api/dashboard',
      progress: '/api/progress/:difficulty, /api/progress/complete, /api/progress/overview'
    }
  });
});

app.use("/api", routes);

// Error handling middleware should be last
app.use((err, req, res, next) => {
  console.error(`Error: ${err.message}`);
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

export default app;

// import express from 'express';
// import jwt from 'jsonwebtoken'
// import mongoose from 'mongoose'
// import bodyParser from 'body-parser';
// import cors from 'cors'
// import bcrypt from 'bcrypt'
// import dotenv from 'dotenv';

// const app = express();

// dotenv.config();

// //middleware
// app.use(cors({
//     origin: ['http://localhost:5173', 'http://localhost:3000'], // origins
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization'],
//     credentials: true
// }));

// app.use(bodyParser.json())

// mongoose.connect(process.env.MONGODB_URI)
//   .then(() => console.log('Connected to MongoDB'))
//   .catch(err => console.error('MongoDB connection error:', err));

// // User's model
// const userSchema = new mongoose.Schema({
//     username: {
//         type: String,
//         required: true,
//         unique: true,
//         trim: true,
//         minLength: 3,
//         maxLength: 30
//     },
//     password: {
//         type: String,
//         required: true,
//         minLength:6
//     },
//     createdAt: {
//         type: Date,
//         default:Date.now
//     }
// })

// const progressSchema = new mongoose.Schema({
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   difficulty: {
//     type: String,
//     required: true,
//     enum: ['easy', 'medium', 'hard']
//   },
//   completedLevels: [{
//     type: Number
//   }],
//   currentLevel: {
//     type: Number,
//     default: 1
//   },
//   levelResults: {
//     type:Map,
//     of: {
//       completed: Boolean,
//       correctAnswers: Number,
//       totalQuestions: Number,
//       completedAt: Date
//     }
//   }
// }, { timestamps: true })

// // Index for difficulty+userId
// progressSchema.index({userId: 1, difficulty: 1}, {unique:true})

// const User = mongoose.model('User', userSchema)
// const Progress = mongoose.model('Progress', progressSchema)

// // Middleware for checking the token
// const authenticateToken = async (req, res, next) => {
//     const authHeader = req.headers['authorization']
//     const token = authHeader && authHeader.split(' ')[1];
//     if (!token) return res.status(401).json({ message: 'Token required' })

//     try {
//       const decoded = jwt.verify(token, process.env.JWT_SECRET)
//       const user = await User.findById(decoded.userId).select('-password')
//     if (!user) {
//       return res.status(401).json({ message: 'Invalid token' })
//     }
//       req.user = user
//       next()
//     } catch (error) {
//       console.error('Token error:', error); // Добавлено: логирование
//       return res.status(403).json({ message: 'Invalid token' })
//   }
// };

// //Register endpoint
// app.post('/signup', async (req, res) => {
//    try {
//     const { username, password } = req.body

//     // Валидация
//     if (!username || !password) {
//       return res.status(400).json({ message: 'Username and password are required' })
//     }

//     if (password.length < 6) {
//       return res.status(400).json({ message: 'Password must be at least 6 characters long' })
//     }

//     // Проверяем, существует ли пользователь
//     const existingUser = await User.findOne({ username })
//     if (existingUser) {
//       return res.status(400).json({ message: 'Username already exists' })
//     }

//     // Хешируем пароль
//     const saltRounds = 10
//     const hashedPassword = await bcrypt.hash(password, saltRounds)

//     // Создаем пользователя
//     const user = new User({
//       username,
//       password: hashedPassword
//     })

//     await user.save()

//     // Создаем токен
//     const token = jwt.sign(
//       { userId: user._id },
//       process.env.JWT_SECRET,
//       { expiresIn: '7d' }
//     )

//     res.status(201).json({
//       message: 'User created successfully',
//       token,
//       user: {
//         id: user._id,
//         username: user.username,
//         createdAt: user.createdAt
//       }
//     })

//   } catch (error) {
//     console.error('Registration error:', error)
//     res.status(500).json({ message: 'Server error' })
//   }
// });

// // Обновленный Login endpoint
// app.post('/login', async (req, res) => {
//     try {
//     const { username, password } = req.body

//     if (!username || !password) {
//         return res.status(400).json({ message: 'Username and password are required' })
//     }

//     // Находим пользователя
//     const user = await User.findOne({ username })
//     if (!user) {
//       return res.status(401).json({ message: 'Invalid credentials' })
//     }

//     // Проверяем пароль
//     const isPasswordValid = await bcrypt.compare(password, user.password)
//     if (!isPasswordValid) {
//       return res.status(401).json({ message: 'Invalid credentials' })
//     }

//     // Создаем токен
//     const token = jwt.sign(
//       { userId: user._id },
//       process.env.JWT_SECRET,
//       { expiresIn: '7d' }
//     )

//     res.json({
//       message: 'Login successful',
//       token,
//       user: {
//         id: user._id,
//         username: user.username,
//         createdAt: user.createdAt
//       }
//     })

//   } catch (error) {
//     console.error('Login error:', error)
//     res.status(500).json({ message: 'Server error' })
//   }
// });

// // Получение данных пользователя (защищенный роут)
// app.get('/dashboard', authenticateToken, async (req, res) => {
//   res.json({
//     user: {
//       id: req.user._id,
//       username: req.user.username,
//       createdAt: req.user.createdAt
//     }
//   })
// })

// // Логаут (опционально, для очистки токена на клиенте)
// app.post('/logout', authenticateToken, (req, res) => {
//   res.json({ message: 'Logged out successfully' })
// })

// app.get('/validate-token', authenticateToken, (req, res) => {
//   res.json({
//     valid: true,
//     user: {
//       id: req.user._id,
//       username: req.user.username,
//       createdAt: req.user.createdAt
//     }
//   });
// });

// app.get('/api/progress/:difficulty', authenticateToken, async (req, res) => {
//   try {
//     const { difficulty } = req.params;
//     const userId = req.user._id
//     if (!['easy', 'medium', 'hard'].includes(difficulty)) {
//       return res.status(400).json({message: 'Invalid difficulty level'})
//     }

//     let progress = await Progress.findOne({userId, difficulty})

//     // If there is no progress
//     if (!progress) {
//       progress = new Progress({
//         userId,
//         difficulty,
//         completedLevels: [],
//         currentLevel: 1,
//         levelResults: new Map()
//       })
//       await progress.save()
//     }
//     res.json({
//       completedLevels: progress.completedLevels,
//       currentLevel: progress.currentLevel,
//       levelResults: progress.levelResults,
//       totalLevels: 10
//     })
//   } catch (error) {
//     console.error('Get progress error:', error)
//     res.status(500).json({message:'Server error'})
//   }
// })

// // Finish the level
// app.post('/api/progress/complete', authenticateToken, async (req, res) => {
//   try {
//     const { difficulty, level, correctAnswers, totalQuestions } = req.body
//     const userId = req.user._id

//     if (!['easy', 'medium', 'hard'].includes(difficulty)) {
//       return res.status(400).json({message: 'Invalid difficulty level'})
//     }

//     if (!level || correctAnswers === undefined || !totalQuestions) {
//       return res.status(400).json({message: 'Missing required fields'})
//     }

//     //Check if we answered all the questions (at least 70%
//     const minCorrentAnswers = Math.ceil(totalQuestions * 0.7)
//     const isCompleted = correctAnswers >= minCorrentAnswers;

//     let progress = await Progress.findOne({ userId, difficulty })

//     if (!progress) {
//       progress = new Progress({
//         userId,
//         difficulty,
//         completedLevels: [],
//         currentLevel: 1,
//         levelResults: new Map()
//       })
//     }

//     // Update the result of the level

//     progress.levelResults.set(level.toString(), {
//       completed: isCompleted,
//       correctAnswers,
//       totalQuestions,
//       completedAt: new Date()
//     })

//     //If the level has been successfully completed

//     if (isCompleted) {
//       // Add into the completed
//       if (!progress.completedLevels.includes(level)) {
//         progress.completedLevels.push(level)
//         progress.completedLevels.sort((a,b) => a-b)
//       }

//       if (level === progress.currentLevel && level < 10) {
//         progress.currentLevel = level + 1;
//       }
//     }

//     await progress.save()

//     res.json({
//       message: isCompleted ? 'Level completed successfully' : 'Level is not completed. Try again!',
//       completed: isCompleted,
//       progress: {
//         completedLevels: progress.completedLevels,
//         currentLevel: progress.currentLevel,
//         levelResults: Object.fromEntries(progress.levelResults)
//       }
//     })

//   } catch (error) {
//     console.error('Complete level error:', error)
//     res.status(500).json({message: 'Server error'})
//   }
// })

// app.get('/api/progress/overview', authenticateToken, async (req, res) => {
//   try {
//     const userId = req.user._id

//     const progressData = await Progress.find({ userId })

//     const overview = {
//       easy: { completed: 0, total: 10 },
//       medium: { completed: 0, total: 10 },
//       hard: {completed: 0, total: 10}
//     }

//     progressData.forEach(progress => {
//       overview[progress.difficulty].completed = progress.completedLevels.length
//     })

//     res.json(overview)
//   } catch (error) {
//     console.error('Get overview error:', error)
//     res.status(500).json({message: 'Server error'})
//   }
// })

// const PORT = process.env.PORT || 5000
// app.listen(PORT, () => {
//     console.log(`server is running on http://localhost:${PORT}`);
// });
