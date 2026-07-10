// src/validators/ride.schema.js
//
// Runtime validation for incoming request bodies. This is our only line of
// defense against malformed data now that we're not using TypeScript — if
// this file doesn't catch it, it reaches the database as-is.

import { z } from 'zod';
import { RideStatus } from '../../../../shared/types/index.js';

// Latitude/longitude aren't just "any number" — real-world bounds exist.
// Catching an invalid coordinate here is much better than silently saving
// garbage that breaks a Redis GEOSEARCH radius query three services later.
const coordinateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

// Body shape for POST /api/v1/rides
export const createRideSchema = z.object({
  riderId: z.string().min(1, 'riderId is required'),
  pickup: coordinateSchema,
  drop: coordinateSchema,
  // The client generates this (e.g. a UUID kept in local state) and resends
  // the same value if it retries the request — this is what Day 3's
  // idempotency middleware will key off of.
  idempotencyKey: z.string().min(1, 'idempotencyKey is required'),
});

// Body shape for PATCH /api/v1/rides/:id/status
export const updateRideStatusSchema = z.object({
  status: z.nativeEnum(RideStatus),
});