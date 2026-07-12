import amqp from 'amqplib';
import env from '../config/env.js';
import logger from '../utils/logger.js';

let channel = null;

const RIDE_REQUESTED_QUEUE = 'matching_service.ride_requested';

export async function connectRabbitMQ(onRideRequested) {
  try {
    const connection = await amqp.connect(env.RABBITMQ_URL);
    channel = await connection.createChannel();

    await channel.assertExchange(env.RIDE_EVENTS_EXCHANGE, 'topic', {
      durable: true,
    });

    // A named, durable queue (not an anonymous one) — so if this service
    // restarts, RabbitMQ still holds any ride.requested messages that
    // arrived while it was down, instead of losing them.
    await channel.assertQueue(RIDE_REQUESTED_QUEUE, { durable: true });
    await channel.bindQueue(RIDE_REQUESTED_QUEUE, env.RIDE_EVENTS_EXCHANGE, 'ride.requested');

    // prefetch(1): don't hand this worker a second message until it
    // ack's/nack's the first. Without this, RabbitMQ pushes messages as
    // fast as it can, and a slow or crashing consumer could end up
    // processing many rides "at once" with no real concurrency control.
    await channel.prefetch(1);

    channel.consume(RIDE_REQUESTED_QUEUE, (msg) => {
      if (msg !== null) {
        onRideRequested(msg, channel);
      }
    });

    logger.info('RabbitMQ connected, consuming ride.requested');

    connection.on('close', () => {
      logger.error('RabbitMQ connection closed — retrying in 5s');
      channel = null;
      setTimeout(() => connectRabbitMQ(onRideRequested), 5000);
    });

    connection.on('error', (err) => {
      logger.error({ err }, 'RabbitMQ connection error');
    });
  } catch (err) {
    logger.error({ err }, 'Failed to connect to RabbitMQ — retrying in 5s');
    setTimeout(() => connectRabbitMQ(onRideRequested), 5000);
  }
}

export function publishRideMatched(payload) {
  if (!channel) {
    throw new Error('Cannot publish: RabbitMQ channel is not connected');
  }

  const routingKey = 'ride.matched';
  const messageBuffer = Buffer.from(JSON.stringify(payload));

  channel.publish(env.RIDE_EVENTS_EXCHANGE, routingKey, messageBuffer, {
    persistent: true,
    contentType: 'application/json',
  });

  logger.info({ rideId: payload.rideId, routingKey }, 'Published ride.matched');
}