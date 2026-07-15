import Redis from 'ioredis';
import env from '../config/env.js';
import logger from '../utils/logger.js';

const redis = new Redis(env.REDIS_URL);

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error({ err }, 'Redis connection error'));

export default redis;