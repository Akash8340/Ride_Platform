import 'dotenv/config';

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const env = {
  REDIS_URL: required('REDIS_URL', 'redis://localhost:6379'),
  RABBITMQ_URL: required('RABBITMQ_URL', 'amqp://localhost:5672'),
  RIDE_EVENTS_EXCHANGE: required('RIDE_EVENTS_EXCHANGE', 'ride_events'),
  BOOKING_SERVICE_URL: required('BOOKING_SERVICE_URL', 'http://localhost:8002'),
  MATCH_RADIUS_METERS: Number(required('MATCH_RADIUS_METERS', 5000)),
  LOCK_TTL_SECONDS: Number(required('LOCK_TTL_SECONDS', 15)),
  NODE_ENV: required('NODE_ENV', 'development'),
};

export default env;