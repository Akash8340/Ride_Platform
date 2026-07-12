import Ride from '../models/ride.model.js';
import { publishRideRequested } from './rabbitmq.service.js';
import logger from '../utils/logger.js';

const POLL_INTERVAL_MS = 2000;
const BATCH_SIZE = 20;

async function publishPendingEvents() {
  const pendingRides = await Ride.find({ 'outbox.published': false }).limit(BATCH_SIZE);

  for (const ride of pendingRides) {
    try {
      await publishRideRequested(ride.outbox.payload);

      ride.outbox.published = true;
      ride.outbox.publishedAt = new Date();
      await ride.save();

      logger.info({ rideId: ride.rideId }, 'Outbox: published pending event');
    } catch (err) {
      // Deliberately don't mark as published, and don't throw out of the
      // loop — one ride failing to publish shouldn't block every other
      // pending ride in this batch. It'll just get retried on the next
      // poll, forever, until RabbitMQ is reachable again.
      logger.error({ err, rideId: ride.rideId }, 'Outbox: failed to publish, will retry next poll');
    }
  }
}

export function startOutboxPoller() {
  setInterval(() => {
    publishPendingEvents().catch((err) => {
      logger.error({ err }, 'Outbox poller crashed unexpectedly');
    });
  }, POLL_INTERVAL_MS);

  logger.info('Outbox poller started');
}