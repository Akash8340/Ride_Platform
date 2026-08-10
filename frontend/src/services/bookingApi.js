import axios from 'axios';
import env from '../config/env.js';

const api = axios.create({
  baseURL: env.BOOKING_SERVICE_URL,
});

export async function createRide({ riderId, pickup, drop, idempotencyKey }) {
  try {
    const response = await api.post('/api/v1/rides', { riderId, pickup, drop, idempotencyKey });
    return response.data.ride;
  } catch (err) {
    throw normalizeError(err, 'Failed to create ride');
  }
}

export async function getRide(rideId) {
  try {
    const response = await api.get(`/api/v1/rides/${rideId}`);
    return response.data.ride;
  } catch (err) {
    throw normalizeError(err, 'Failed to fetch ride');
  }
}

function normalizeError(err, fallbackMessage) {
  if (err.response) {
    const error = new Error(err.response.data?.error || fallbackMessage);
    error.status = err.response.status;
    error.details = err.response.data?.details;
    return error;
  }
  return new Error(fallbackMessage);
}