// src/utils/logger.js
//
// One shared pino instance for the whole service. Everything logs through
// this instead of console.log, so logs are structured JSON (easy to search/
// filter later) instead of scattered strings.

import pino from 'pino';
import env from '../config/env.js';

const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport:
    env.NODE_ENV === 'production'
      ? undefined // in production: raw JSON lines, made for log aggregators
      : {
          target: 'pino-pretty', // in dev: human-readable colored output
          options: { colorize: true, translateTime: 'HH:MM:ss' },
        },
});

export default logger;