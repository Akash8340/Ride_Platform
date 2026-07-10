// src/services/ride.service.js
//
// The business-logic layer, sitting between the controller and the
// model/message-broker. The controller should never talk to `Ride` or
// RabbitMQ directly — it calls functions here.

import { v4 as uuidv4 } from 'uuid';
import Ride from '../models/ride.model.js';
import { RideStatus } from '../../../../shared/types/index.js';
import { publishRideRequested } from './rabbitmq.service.js';
import logger from '../utils/logger.js';

export async function createRide({ riderId, pickup, drop, idempotencyKey }) {
  const rideId = uuidv4();

  try {
    // Create FIRST, and let MongoDB's unique index on `idempotencyKey`
    // (set in ride.model.js) be the real source of truth for "has this
    // already happened?" — NOT a `findOne` check before creating.
    //
    // A find-then-create here would race: two identical requests arriving
    // close together could both run `findOne`, both see nothing, and both
    // proceed to create — producing two rides from one retried request.
    // Only the database itself, rejecting the second insert, can close
    // that window completely.
    const ride = await Ride.create({
      rideId,
      riderId,
      pickup,
      drop,
      idempotencyKey,
      status: RideStatus.REQUESTED,
    });

    // NOTE: if this publish fails after the Mongo write above already
    // succeeded, the ride exists but no one downstream ever hears about
    // it. That's a real gap — it's exactly what Day 6's outbox pattern
    // fixes. Flagging it now, on purpose, rather than pretending it isn't
    // there yet.
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
      // Mongo's duplicate-key error — this IS the idempotency check.
      logger.warn({ idempotencyKey }, 'Duplicate ride request — returning existing ride');
      const existing = await Ride.findOne({ idempotencyKey });
      return { ride: existing, isNew: false };
    }
    throw err;
  }
}

export async function updateRideStatus(rideId, status) {
  const ride = await Ride.findOneAndUpdate(
    { rideId },
    { status },
    { new: true } // return the document AFTER the update, not before
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