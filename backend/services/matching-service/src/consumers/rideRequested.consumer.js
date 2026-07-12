import { findNearbyDrivers, markDriverBusy } from '../services/redis.service.js';
import { acquireDriverLock } from '../services/lock.service.js';
import { publishRideMatched } from '../services/rabbitmq.service.js';
import { RideStatus } from '../../../../shared/types/index.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';

async function updateRideStatusInBookingService(rideId, status, driverId) {
  const response = await fetch(`${env.BOOKING_SERVICE_URL}/api/v1/rides/${rideId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, driverId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update ride status: ${response.status}`);
  }
}

export async function onRideRequested(msg, channel) {
  let rideId;

  try {
    const payload = JSON.parse(msg.content.toString());
    rideId = payload.rideId;
    const { pickupLatitude, pickupLongitude, riderId } = payload;

    logger.info({ rideId }, 'Received ride.requested');

    const candidates = await findNearbyDrivers(pickupLatitude, pickupLongitude, env.MATCH_RADIUS_METERS);

    if (candidates.length === 0) {
      logger.warn({ rideId }, 'No drivers in radius — dropping for now, Day 7 adds NO_DRIVERS_AVAILABLE handling');
      channel.ack(msg);
      return;
    }

    let matchedDriverId = null;

    for (const candidate of candidates) {
      const locked = await acquireDriverLock(candidate.driverId, rideId);
      if (locked) {
        matchedDriverId = candidate.driverId;
        break;
      }
    }

    if (!matchedDriverId) {
      logger.warn({ rideId }, 'All nearby candidates already locked — dropping for now');
      channel.ack(msg);
      return;
    }

    await updateRideStatusInBookingService(rideId, RideStatus.ACCEPTED, matchedDriverId);
    await markDriverBusy(matchedDriverId);

    publishRideMatched({
      rideId,
      riderId,
      driverId: matchedDriverId,
      timestamp: Date.now(),
    });

    channel.ack(msg);
  } catch (err) {
    logger.error({ err, rideId }, 'Error processing ride.requested — requeueing');
    channel.nack(msg, false, true);
  }
}