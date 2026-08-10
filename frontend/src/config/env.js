// src/config/env.js
//
// Centralizes every backend URL the frontend needs. Nothing else should
// reference import.meta.env directly — everything reads from this file,
// same principle as every backend service's own env.js.

const env = {
  INGESTION_SERVICE_WS_URL: import.meta.env.VITE_INGESTION_SERVICE_WS_URL || 'ws://localhost:8001',
  BOOKING_SERVICE_URL: import.meta.env.VITE_BOOKING_SERVICE_URL || 'http://localhost:8002',
  NOTIFICATION_SERVICE_WS_URL: import.meta.env.VITE_NOTIFICATION_SERVICE_WS_URL || 'ws://localhost:8003',
};

export default env;