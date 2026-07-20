import { publisher } from './redis.service.js';
import logger from '../utils/logger.js';

export const NOTIFICATIONS_CHANNEL = 'ride_notifications';

export function broadcastRideEvent(routingKey, payload) {
  const message = JSON.stringify({ routingKey, payload });
  publisher.publish(NOTIFICATIONS_CHANNEL, message);
  logger.info({ routingKey, rideId: payload.rideId }, 'Broadcast ride event to Redis Pub/Sub');
}