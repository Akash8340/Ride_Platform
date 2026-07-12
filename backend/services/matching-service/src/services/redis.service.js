import Redis from 'ioredis';
import env from '../config/env.js';
import logger from '../utils/logger.js';

const redis = new Redis(env.REDIS_URL);

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error({ err }, 'Redis connection error'));

const DRIVERS_GEO_KEY = 'drivers:active';

export async function findNearbyDrivers(latitude, longitude, radiusMeters) {
  const results = await redis.geosearch(
    DRIVERS_GEO_KEY,
    'FROMLONLAT',
    longitude,
    latitude,
    'BYRADIUS',
    radiusMeters,
    'm',
    'ASC',
    'COUNT',
    10,
    'WITHCOORD',
    'WITHDIST'
  );

  return results.map(([driverId, distance, [lng, lat]]) => ({
    driverId,
    distanceMeters: Number(distance),
    longitude: Number(lng),
    latitude: Number(lat),
  }));
}

export async function getDriverStatus(driverId) {
  return redis.hget(`driver:${driverId}`, 'status');
}

export async function markDriverBusy(driverId) {
  await redis.hset(`driver:${driverId}`, 'status', 'BUSY');
  await redis.zrem(DRIVERS_GEO_KEY, driverId);
}

export default redis;