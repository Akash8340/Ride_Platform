// shared/types/index.js
//
// Single source of truth for shapes and enums every service uses.
// No service is allowed to redefine any of these locally — they all
// `import` from this file.

/**
 * Lifecycle states of a ride, in order they normally occur.
 * @readonly
 */
export const RideStatus = Object.freeze({
  REQUESTED: 'REQUESTED',
  MATCHING: 'MATCHING',
  NO_DRIVERS_AVAILABLE: 'NO_DRIVERS_AVAILABLE',
  ACCEPTED: 'ACCEPTED',
  DRIVER_ARRIVED: 'DRIVER_ARRIVED',
  IN_TRANSIT: 'IN_TRANSIT',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
});

/**
 * Availability state of a driver.
 * @readonly
 */
export const DriverStatus = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  BUSY: 'BUSY',
  OFFLINE: 'OFFLINE',
});

/**
 * Shape reference only (plain JS has no interfaces) — kept as JSDoc so your
 * editor still autocompletes these fields for you.
 *
 * @typedef {Object} LocationUpdatePayload
 * @property {string} driverId
 * @property {number} latitude
 * @property {number} longitude
 * @property {string} status        - one of DriverStatus
 * @property {number} timestamp
 *
 * @typedef {Object} RideRequestedPayload
 * @property {string} rideId
 * @property {string} riderId
 * @property {number} pickupLatitude
 * @property {number} pickupLongitude
 * @property {number} dropLatitude
 * @property {number} dropLongitude
 * @property {string} status        - one of RideStatus
 * @property {number} timestamp
 *
 * @typedef {Object} RideMatchedPayload
 * @property {string} rideId
 * @property {string} riderId
 * @property {string} driverId
 * @property {number} timestamp
 */