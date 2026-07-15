import redis from '../services/redis.service.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';

export async function rateLimiter(req, res, next) {
  const key = `ratelimit:${req.ip}`;

  try {
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, env.RATE_LIMIT_WINDOW_SECONDS);
    }

    if (count > env.RATE_LIMIT_MAX_REQUESTS) {
      logger.warn({ ip: req.ip, count }, 'Rate limit exceeded');
      return res.status(429).json({ error: 'Too many requests, please try again later' });
    }

    next();
  } catch (err) {
    // If Redis itself is unreachable, fail OPEN — let the request through —
    // rather than fail closed and block every single request. A rate
    // limiter being temporarily unavailable is a much smaller problem than
    // the entire API becoming unusable because of it.
    logger.error({ err }, 'Rate limiter failed, allowing request through');
    next();
  }
}