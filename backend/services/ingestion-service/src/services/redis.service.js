import Redis from 'ioredis';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import { DriverStatus } from '../../../../shared/types/index.js';

const redis = new Redis(env.REDIS_URL);

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error({ err }, 'Redis connection error'));

const DRIVERS_GEO_KEY = 'drivers:active';

export async function updateDriverLocation({ driverId, latitude, longitude, status }) {
  await redis.hset(`driver:${driverId}`, 'status', status);

  if (status === DriverStatus.AVAILABLE) {
    // Only AVAILABLE drivers should be findable by matching-service's
    // GEOSEARCH — a driver who just went OFFLINE or is mid-ride (BUSY)
    // must not show up as a match candidate.
    await redis.geoadd(DRIVERS_GEO_KEY, longitude, latitude, driverId);
  } else {
    // BUSY or OFFLINE: remove from the searchable set entirely, rather
    // than leaving a stale position that GEOSEARCH would still return.
    await redis.zrem(DRIVERS_GEO_KEY, driverId);
  }
}

export default redis;