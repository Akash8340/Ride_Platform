import mongoose from 'mongoose';
import env from './env.js';
import logger from '../utils/logger.js';

export async function connectDB() {
  try {
    await mongoose.connect(env.MONGO_URI);
    logger.info(`MongoDB connected: ${env.MONGO_URI}`);
  } catch (err) {
    logger.error({ err }, 'MongoDB connection failed');
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });
}