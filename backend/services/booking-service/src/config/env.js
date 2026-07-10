// src/config/env.js
//
// Centralizes every environment variable this service needs.
// Nothing else in this service should touch `process.env` directly —
// everything imports this file instead.

import 'dotenv/config';

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const env = {
  PORT: Number(required('PORT', 8002)),
  MONGO_URI: required('MONGO_URI', 'mongodb://localhost:27017/rideflow'),
  RABBITMQ_URL: required('RABBITMQ_URL', 'amqp://localhost:5672'),
  RIDE_EVENTS_EXCHANGE: required('RIDE_EVENTS_EXCHANGE', 'ride_events'),
  NODE_ENV: required('NODE_ENV', 'development'),
};

export default env;