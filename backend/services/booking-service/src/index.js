import app from './app.js';
import env from './config/env.js';
import { connectDB } from './config/db.js';
import { connectRabbitMQ } from './services/rabbitmq.service.js';
import logger from './utils/logger.js';

async function start() {
  await connectDB();
  await connectRabbitMQ();

  app.listen(env.PORT, () => {
    logger.info(`booking-service listening on port ${env.PORT}`);
  });
}

start();