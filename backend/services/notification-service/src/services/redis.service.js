import Redis from 'ioredis';
import env from '../config/env.js';
import logger from '../utils/logger.js';

// Redis requires a DEDICATED connection for subscribing — once a client
// calls .subscribe(), that same connection can no longer run any other
// command (not even a plain GET). So we need two separate connections:
// one that only ever publishes, one that only ever subscribes.
export const publisher = new Redis(env.REDIS_URL);
export const subscriber = new Redis(env.REDIS_URL);

publisher.on('connect', () => logger.info('Redis publisher connected'));
publisher.on('error', (err) => logger.error({ err }, 'Redis publisher error'));

subscriber.on('connect', () => logger.info('Redis subscriber connected'));
subscriber.on('error', (err) => logger.error({ err }, 'Redis subscriber error'));