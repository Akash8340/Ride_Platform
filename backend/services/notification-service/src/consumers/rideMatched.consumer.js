import { sendToUser } from '../sockets/registry.js';
import logger from '../utils/logger.js';

export function onRideMatched(msg, channel) {
  try {
    const payload = JSON.parse(msg.content.toString());
    const { rideId, riderId, driverId } = payload;

    logger.info({ rideId, riderId, driverId }, 'Received ride.matched');

    const deliveredToRider = sendToUser(riderId, {
      type: 'RIDE_MATCHED',
      rideId,
      driverId,
    });

    if (!deliveredToRider) {
      // The rider isn't connected right now (closed the app, network drop,
      // hasn't opened it yet). We're not persisting this anywhere for
      // later delivery — it's just logged and dropped. That's a real gap:
      // a rider who reconnects a minute later never learns they were
      // matched unless they separately poll booking-service's GET /rides/:id.
      logger.warn({ riderId, rideId }, 'Rider not connected — notification dropped');
    }

    const deliveredToDriver = sendToUser(driverId, {
      type: 'RIDE_MATCHED',
      rideId,
      riderId,
    });

    if (!deliveredToDriver) {
      logger.warn({ driverId, rideId }, 'Driver not connected — notification dropped');
    }

    channel.ack(msg);
  } catch (err) {
    logger.error({ err }, 'Error processing ride.matched — requeueing');
    channel.nack(msg, false, true);
  }
}