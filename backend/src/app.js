import express from "express"; 
import { corsMiddleware } from "./middleware/cors.js";
import routes from "./routes/index.js";
import { User } from "./models/User.js";

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
      progress: '/api/progress/:difficulty, /api/progress/complete, /api/progress/overview',
      password: '/api/request-reset, /api/reset'
    }
  });
});

app.use("/api", routes);
// app.use('/api/progress', progressRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`Error: ${err.message}`);
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app._router.stack.forEach((middleware) => {
  if (middleware.route) {
    console.log('Route:', middleware.route.path);
  } else if (middleware.name === 'router') {
    middleware.handle.stack.forEach((handler) => {
      if (handler.route) {
        console.log('Route:', handler.route.path);
      }
    });
  }
});

export default app;