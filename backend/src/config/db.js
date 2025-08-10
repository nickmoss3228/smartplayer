// Connect to Mongo once, reuse across the app.
import mongoose from 'mongoose';
import { config } from './env.js';

export async function connectDB() {
    try {
        await mongoose.connect(config.mongoUri);
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    } 
}