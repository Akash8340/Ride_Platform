import amqp from 'amqplib';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import { getBackoffDelay } from '../../../../shared/utils/backoff.js';

let channel = null;
let reconnectAttempt = 0;

export async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(env.RABBITMQ_URL);
    channel = await connection.createChannel();

    await channel.assertExchange(env.RIDE_EVENTS_EXCHANGE, 'topic', {
      durable: true,
    });

    logger.info('RabbitMQ connected and exchange asserted');

    reconnectAttempt = 0;

    connection.on('close', () => {
      const delay = getBackoffDelay(reconnectAttempt);
      logger.error({ delay, attempt: reconnectAttempt }, 'RabbitMQ connection closed — retrying');
      channel = null;
      reconnectAttempt += 1;
      setTimeout(connectRabbitMQ, delay);
    });

    connection.on('error', (err) => {
      logger.error({ err }, 'RabbitMQ connection error');
    });
  } catch (err) {
    const delay = getBackoffDelay(reconnectAttempt);
    logger.error({ err, delay, attempt: reconnectAttempt }, 'Failed to connect to RabbitMQ — retrying');
    reconnectAttempt += 1;
    setTimeout(connectRabbitMQ, delay);
  }
}

export async function publishRideRequested(payload) {
  if (!channel) {
    throw new Error('Cannot publish: RabbitMQ channel is not connected');
  }

  const routingKey = 'ride.requested';
  const messageBuffer = Buffer.from(JSON.stringify(payload));

  channel.publish(env.RIDE_EVENTS_EXCHANGE, routingKey, messageBuffer, {
    persistent: true,
    contentType: 'application/json',
  });

  logger.info({ rideId: payload.rideId, routingKey }, 'Published ride.requested');
}