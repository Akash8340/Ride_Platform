import { createRideSchema, updateRideStatusSchema } from '../validators/ride.schema.js';
import * as rideService from '../services/ride.service.js';

export async function createRideHandler(req, res, next) {
  try {
    const validatedBody = createRideSchema.parse(req.body);
    const { ride, isNew } = await rideService.createRide(validatedBody);
    res.status(isNew ? 201 : 200).json({ ride });
  } catch (err) {
    next(err);
  }
}

export async function updateRideStatusHandler(req, res, next) {
  try {
    const { status, driverId } = updateRideStatusSchema.parse(req.body);
    const { id: rideId } = req.params;

    const ride = await rideService.updateRideStatus(rideId, status, driverId);

    res.status(200).json({ ride });
  } catch (err) {
    next(err);
  }
}

export async function getRideHandler(req, res, next) {
  try {
    const { id: rideId } = req.params;
    const ride = await rideService.getRideById(rideId);

    if (!ride) {
      const notFoundError = new Error(`Ride not found: ${rideId}`);
      notFoundError.statusCode = 404;
      throw notFoundError;
    }

    res.status(200).json({ ride });
  } catch (err) {
    next(err);
  }
}