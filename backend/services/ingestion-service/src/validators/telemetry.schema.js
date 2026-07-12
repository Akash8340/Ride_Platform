import { z } from 'zod';
import { DriverStatus } from '../../../../shared/types/index.js';

export const locationUpdateSchema = z.object({
  driverId: z.string().min(1, 'driverId is required'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  status: z.nativeEnum(DriverStatus),
});