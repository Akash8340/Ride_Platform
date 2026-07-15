import { sendToUser } from '../sockets/registry.js';
import logger from '../utils/logger.js';

export function onRideEvent(msg, channel) {
  try {
    const payload = JSON.parse(msg.content.toString());
    const routingKey = msg.fields.routingKey;

    if (routingKey === 'ride.matched') {
      const { rideId, riderId, driverId } = payload;
      logger.info({ rideId, riderId, driverId }, 'Received ride.matched');

      const deliveredToRider = sendToUser(riderId, { type: 'RIDE_MATCHED', rideId, driverId });
      if (!deliveredToRider) {
        logger.warn({ riderId, rideId }, 'Rider not connected — notification dropped');
      }

      const deliveredToDriver = sendToUser(driverId, { type: 'RIDE_MATCHED', rideId, riderId });
      if (!deliveredToDriver) {
        logger.warn({ driverId, rideId }, 'Driver not connected — notification dropped');
      }
    } else if (routingKey === 'ride.no_drivers_available') {
      const { rideId, riderId } = payload;
      logger.info({ rideId, riderId }, 'Received ride.no_drivers_available');

      const delivered = sendToUser(riderId, { type: 'NO_DRIVERS_AVAILABLE', rideId });
      if (!delivered) {
        logger.warn({ riderId, rideId }, 'Rider not connected — notification dropped');
      }
    } else {
      logger.warn({ routingKey }, 'Received event with unknown routing key, ignoring');
    }

    channel.ack(msg);
  } catch (err) {
    logger.error({ err }, 'Error processing ride event — requeueing');
    channel.nack(msg, false, true);
  }
}