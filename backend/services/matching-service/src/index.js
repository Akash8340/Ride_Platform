import { connectRabbitMQ } from './services/rabbitmq.service.js';
import { onRideRequested } from './consumers/rideRequested.consumer.js';
import logger from './utils/logger.js';

async function start() {
  await connectRabbitMQ(onRideRequested);
  logger.info('matching-service started, waiting for ride.requested events');
}

start();