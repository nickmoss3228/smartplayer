import app from "./app.js";
import { connectDB } from "./config/db.js";
import { config } from "./config/env.js";

async function start() {
  await connectDB();
  app.listen(config.port, () => {
    console.log(`Server is running on http://localhost:${config.port}`);
    console.log('🚀 Starting application...');
    console.log('PORT:', process.env.PORT);
    console.log('NODE_ENV:', process.env.NODE_ENV);
  });
}
start();
