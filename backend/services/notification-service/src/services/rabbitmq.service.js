import amqp from 'amqplib';
import env from '../config/env.js';
import logger from '../utils/logger.js';

const RIDE_MATCHED_QUEUE = 'notification_service.ride_matched';

export async function connectRabbitMQ(onRideMatched) {
  try {
    const connection = await amqp.connect(env.RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertExchange(env.RIDE_EVENTS_EXCHANGE, 'topic', {
      durable: true,
    });

    await channel.assertQueue(RIDE_MATCHED_QUEUE, { durable: true });
    await channel.bindQueue(RIDE_MATCHED_QUEUE, env.RIDE_EVENTS_EXCHANGE, 'ride.matched');

    await channel.prefetch(1);

    channel.consume(RIDE_MATCHED_QUEUE, (msg) => {
      if (msg !== null) {
        onRideMatched(msg, channel);
      }
    });

    logger.info('RabbitMQ connected, consuming ride.matched');

    connection.on('close', () => {
      logger.error('RabbitMQ connection closed — retrying in 5s');
      setTimeout(() => connectRabbitMQ(onRideMatched), 5000);
    });

    connection.on('error', (err) => {
      logger.error({ err }, 'RabbitMQ connection error');
    });
  } catch (err) {
    logger.error({ err }, 'Failed to connect to RabbitMQ — retrying in 5s');
    setTimeout(() => connectRabbitMQ(onRideMatched), 5000);
  }
}