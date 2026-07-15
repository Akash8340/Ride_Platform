import amqp from 'amqplib';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import { getBackoffDelay } from '../../../../shared/utils/backoff.js';

let channel = null;
let reconnectAttempt = 0;

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

    await channel.assertQueue(RIDE_REQUESTED_DLQ, { durable: true });

    await channel.prefetch(1);

    channel.consume(RIDE_REQUESTED_QUEUE, (msg) => {
      if (msg !== null) {
        onRideRequested(msg, channel);
      }
    });

    logger.info('RabbitMQ connected, consuming ride.requested');

    // Connected successfully — reset the counter so the NEXT disconnect
    // starts backing off from 0 again, not from wherever it left off.
    reconnectAttempt = 0;

    connection.on('close', () => {
      const delay = getBackoffDelay(reconnectAttempt);
      logger.error({ delay, attempt: reconnectAttempt }, 'RabbitMQ connection closed — retrying');
      channel = null;
      reconnectAttempt += 1;
      setTimeout(() => connectRabbitMQ(onRideRequested), delay);
    });

    connection.on('error', (err) => {
      logger.error({ err }, 'RabbitMQ connection error');
    });
  } catch (err) {
    const delay = getBackoffDelay(reconnectAttempt);
    logger.error({ err, delay, attempt: reconnectAttempt }, 'Failed to connect to RabbitMQ — retrying');
    reconnectAttempt += 1;
    setTimeout(() => connectRabbitMQ(onRideRequested), delay);
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