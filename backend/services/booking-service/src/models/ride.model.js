// src/models/ride.model.js
//
// The Mongoose schema for a ride — this document is the single source of
// truth for a ride's state. Every other service (matching, notification)
// only ever reads/reacts to events derived from this; they don't own this
// data themselves.

import mongoose from 'mongoose';
import { RideStatus } from '../../../../shared/types/index.js';

const { Schema } = mongoose;

const rideSchema = new Schema(
  {
    rideId: {
      type: String,
      required: true,
      unique: true, // enforced at the DB level, not just app-level
    },
    riderId: {
      type: String,
      required: true,
      index: true, // riders will query "my rides" — index this lookup
    },
    driverId: {
      type: String,
      default: null, // no driver assigned yet when a ride is first REQUESTED
    },
    pickup: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    drop: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    status: {
      type: String,
      enum: Object.values(RideStatus), // Mongo rejects any value not in shared/types
      default: RideStatus.REQUESTED,
      index: true, // we'll query "all rides in MATCHING" etc. later
    },
    // Used on Day 3 for duplicate-request protection: if a client retries
    // POST /rides with the same key, we return the existing ride instead
    // of creating a second one.
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true, // adds createdAt / updatedAt automatically
  }
);

const Ride = mongoose.model('Ride', rideSchema);

export default Ride;