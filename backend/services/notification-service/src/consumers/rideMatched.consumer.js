import { broadcastRideEvent } from '../services/broadcast.service.js';
import logger from '../utils/logger.js';

export function onRideEvent(msg, channel) {
  try {
    const payload = JSON.parse(msg.content.toString());
    const routingKey = msg.fields.routingKey;

    logger.info({ routingKey, rideId: payload.rideId }, 'Received ride event from RabbitMQ');

    broadcastRideEvent(routingKey, payload);

    channel.ack(msg);
  } catch (err) {
    logger.error({ err }, 'Error processing ride event — requeueing');
    channel.nack(msg, false, true);
  }
}