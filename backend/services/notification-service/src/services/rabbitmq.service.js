import amqp from 'amqplib';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import { getBackoffDelay } from '../../../../shared/utils/backoff.js';

const RIDE_EVENTS_QUEUE = 'notification_service.ride_events';

let reconnectAttempt = 0;

export async function connectRabbitMQ(onRideEvent) {
  try {
    const connection = await amqp.connect(env.RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertExchange(env.RIDE_EVENTS_EXCHANGE, 'topic', {
      durable: true,
    });

    await channel.assertQueue(RIDE_EVENTS_QUEUE, { durable: true });
    await channel.bindQueue(RIDE_EVENTS_QUEUE, env.RIDE_EVENTS_EXCHANGE, 'ride.matched');
    await channel.bindQueue(RIDE_EVENTS_QUEUE, env.RIDE_EVENTS_EXCHANGE, 'ride.no_drivers_available');

    await channel.prefetch(1);

    channel.consume(RIDE_EVENTS_QUEUE, (msg) => {
      if (msg !== null) {
        onRideEvent(msg, channel);
      }
    });

    logger.info('RabbitMQ connected, consuming ride.matched + ride.no_drivers_available');

    reconnectAttempt = 0;

    connection.on('close', () => {
      const delay = getBackoffDelay(reconnectAttempt);
      logger.error({ delay, attempt: reconnectAttempt }, 'RabbitMQ connection closed — retrying');
      reconnectAttempt += 1;
      setTimeout(() => connectRabbitMQ(onRideEvent), delay);
    });

    connection.on('error', (err) => {
      logger.error({ err }, 'RabbitMQ connection error');
    });
  } catch (err) {
    const delay = getBackoffDelay(reconnectAttempt);
    logger.error({ err, delay, attempt: reconnectAttempt }, 'Failed to connect to RabbitMQ — retrying');
    reconnectAttempt += 1;
    setTimeout(() => connectRabbitMQ(onRideEvent), delay);
  }
}