import { v4 as uuidv4 } from 'uuid';
import Ride from '../models/ride.model.js';
import { RideStatus } from '../../../../shared/types/index.js';
import { publishRideRequested } from './rabbitmq.service.js';
import logger from '../utils/logger.js';

export async function createRide({ riderId, pickup, drop, idempotencyKey }) {
  const rideId = uuidv4();

  try {
    const ride = await Ride.create({
      rideId,
      riderId,
      pickup,
      drop,
      idempotencyKey,
      status: RideStatus.REQUESTED,
    });

    await publishRideRequested({
      rideId: ride.rideId,
      riderId: ride.riderId,
      pickupLatitude: ride.pickup.latitude,
      pickupLongitude: ride.pickup.longitude,
      dropLatitude: ride.drop.latitude,
      dropLongitude: ride.drop.longitude,
      status: ride.status,
      timestamp: Date.now(),
    });

    return { ride, isNew: true };
  } catch (err) {
    if (err.code === 11000) {
      logger.warn({ idempotencyKey }, 'Duplicate ride request — returning existing ride');
      const existing = await Ride.findOne({ idempotencyKey });
      return { ride: existing, isNew: false };
    }
    throw err;
  }
}

export async function updateRideStatus(rideId, status, driverId) {
  const update = { status };
  if (driverId) {
    update.driverId = driverId;
  }

  const ride = await Ride.findOneAndUpdate(
    { rideId },
    update,
    { new: true }
  );

  if (!ride) {
    const notFoundError = new Error(`Ride not found: ${rideId}`);
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  return ride;
}

export async function getRideById(rideId) {
  return Ride.findOne({ rideId });
}