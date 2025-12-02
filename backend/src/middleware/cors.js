import cors from "cors";

export const corsMiddleware = cors({
  origin: ['https://infinityplayer.xyz',
    'https://infinityplayer-git-master-nickmoss3228s-projects.vercel.app/',
    'http://localhost:3000',  
    'http://localhost:5173'], // if using Vite,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
});
