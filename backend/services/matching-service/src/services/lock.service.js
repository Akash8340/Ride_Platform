import redis from './redis.service.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';

const LOCK_PREFIX = 'lock:driver:';

export async function acquireDriverLock(driverId, rideId) {
  const key = `${LOCK_PREFIX}${driverId}`;

  // SET key value NX EX seconds — one atomic command, not a check-then-set.
  // NX = only set if the key does NOT already exist.
  // EX = expire automatically after N seconds, even if we crash before
  // releasing it — this is what prevents a permanently stuck driver.
  const result = await redis.set(key, rideId, 'NX', 'EX', env.LOCK_TTL_SECONDS);

  const acquired = result === 'OK';

  if (acquired) {
    logger.info({ driverId, rideId }, 'Lock acquired');
  } else {
    logger.warn({ driverId, rideId }, 'Lock already held — driver taken by another match');
  }

  return acquired;
}

export async function releaseDriverLock(driverId) {
  const key = `${LOCK_PREFIX}${driverId}`;
  await redis.del(key);
}