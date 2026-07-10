
import amqp from 'amqplib';
import env from '../config/env.js';
import logger from '../utils/logger.js';

let channel = null;

export async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(env.RABBITMQ_URL);
    channel = await connection.createChannel();

    await channel.assertExchange(env.RIDE_EVENTS_EXCHANGE, 'topic', {
      durable: true, // survives a RabbitMQ restart — events aren't lost
    });

    logger.info('RabbitMQ connected and exchange asserted');

    connection.on('close', () => {
      logger.error('RabbitMQ connection closed — retrying in 5s');
      channel = null;
      // NOTE: flat 5s retry, not exponential backoff. That's a deliberate
      // gap for now — Day 8 of the roadmap replaces this with real backoff.
      setTimeout(connectRabbitMQ, 5000);
    });

    connection.on('error', (err) => {
      logger.error({ err }, 'RabbitMQ connection error');
    });
  } catch (err) {
    logger.error({ err }, 'Failed to connect to RabbitMQ — retrying in 5s');
    setTimeout(connectRabbitMQ, 5000);
  }
}

export async function publishRideRequested(payload) {
  if (!channel) {
  
    throw new Error('Cannot publish: RabbitMQ channel is not connected');
  }

  const routingKey = 'ride.requested';
  const messageBuffer = Buffer.from(JSON.stringify(payload));

  channel.publish(env.RIDE_EVENTS_EXCHANGE, routingKey, messageBuffer, {
    persistent: true, // message is written to disk, survives a broker restart
    contentType: 'application/json',
  });

  logger.info({ rideId: payload.rideId, routingKey }, 'Published ride.requested');
}