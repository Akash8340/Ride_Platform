import { z } from 'zod';
import { RideStatus } from '../../../../shared/types/index.js';

const coordinateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const createRideSchema = z.object({
  riderId: z.string().min(1, 'riderId is required'),
  pickup: coordinateSchema,
  drop: coordinateSchema,
  idempotencyKey: z.string().min(1, 'idempotencyKey is required'),
});

export const updateRideStatusSchema = z.object({
  status: z.nativeEnum(RideStatus),
  driverId: z.string().min(1).optional(),
});