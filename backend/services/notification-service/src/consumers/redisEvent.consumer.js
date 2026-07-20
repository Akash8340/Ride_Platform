import { sendToUser } from '../sockets/registry.js';
import logger from '../utils/logger.js';

export function handleRedisMessage(message) {
  let parsed;

  try {
    parsed = JSON.parse(message);
  } catch (err) {
    logger.error({ err }, 'Failed to parse Redis pub/sub message, ignoring');
    return;
  }

  const { routingKey, payload } = parsed;

  if (routingKey === 'ride.matched') {
    const { rideId, riderId, driverId } = payload;

    const deliveredToRider = sendToUser(riderId, { type: 'RIDE_MATCHED', rideId, driverId });
    if (!deliveredToRider) {
      logger.warn({ riderId, rideId }, 'Rider not connected to this instance');
    }

    const deliveredToDriver = sendToUser(driverId, { type: 'RIDE_MATCHED', rideId, riderId });
    if (!deliveredToDriver) {
      logger.warn({ driverId, rideId }, 'Driver not connected to this instance');
    }
  } 
  else if (routingKey === 'ride.no_drivers_available') {
    const { rideId, riderId } = payload;

    const delivered = sendToUser(riderId, { type: 'NO_DRIVERS_AVAILABLE', rideId });
    if (!delivered) {
      logger.warn({ riderId, rideId }, 'Rider not connected to this instance');
    }
  } 
  else {
    logger.warn({ routingKey }, 'Unknown routing key in Redis message, ignoring');
  }
}