import amqp from 'amqplib';
import env from '../config/env.js';
import logger from '../utils/logger.js';

let channel = null;

const RIDE_REQUESTED_QUEUE = 'matching_service.ride_requested';
const RIDE_REQUESTED_DLQ = 'matching_service.ride_requested.dlq';
const MAX_RETRIES = 3;

export async function connectRabbitMQ(onRideRequested) {
  try {
    const connection = await amqp.connect(env.RABBITMQ_URL);
    channel = await connection.createChannel();

    await channel.assertExchange(env.RIDE_EVENTS_EXCHANGE, 'topic', {
      durable: true,
    });

    await channel.assertQueue(RIDE_REQUESTED_QUEUE, { durable: true });
    await channel.bindQueue(RIDE_REQUESTED_QUEUE, env.RIDE_EVENTS_EXCHANGE, 'ride.requested');

    // Dead-letter queue — not bound to the exchange. Nothing consumes it
    // automatically; it exists purely as a holding pen for a human to
    // inspect messages that failed processing too many times.
    await channel.assertQueue(RIDE_REQUESTED_DLQ, { durable: true });

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

export function publishRideNoDriversAvailable(payload) {
  if (!channel) {
    throw new Error('Cannot publish: RabbitMQ channel is not connected');
  }

  const routingKey = 'ride.no_drivers_available';
  const messageBuffer = Buffer.from(JSON.stringify(payload));

  channel.publish(env.RIDE_EVENTS_EXCHANGE, routingKey, messageBuffer, {
    persistent: true,
    contentType: 'application/json',
  });

  logger.info({ rideId: payload.rideId, routingKey }, 'Published ride.no_drivers_available');
}

export function retryOrDeadLetter(msg, ch) {
  const currentRetries = (msg.properties.headers && msg.properties.headers['x-retry-count']) || 0;

  if (currentRetries < MAX_RETRIES) {
    ch.sendToQueue(RIDE_REQUESTED_QUEUE, msg.content, {
      persistent: true,
      headers: { 'x-retry-count': currentRetries + 1 },
    });
    logger.warn({ retryCount: currentRetries + 1 }, 'Requeued with incremented retry count');
  } else {
    ch.sendToQueue(RIDE_REQUESTED_DLQ, msg.content, {
      persistent: true,
      headers: { 'x-retry-count': currentRetries },
    });
    logger.error('Max retries exceeded — message sent to dead-letter queue');
  }

  ch.ack(msg);
}