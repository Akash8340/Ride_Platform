import mongoose from 'mongoose';
import { RideStatus } from '../../../../shared/types/index.js';

const { Schema } = mongoose;

const rideSchema = new Schema(
  {
    rideId: { type: String, required: true, unique: true },
    riderId: { type: String, required: true, index: true },
    driverId: { type: String, default: null },
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
      enum: Object.values(RideStatus),
      default: RideStatus.REQUESTED,
      index: true,
    },
    idempotencyKey: { type: String, required: true, unique: true },
    outbox: {
      eventType: { type: String, default: 'ride.requested' },
      payload: { type: Schema.Types.Mixed, required: true },
      published: { type: Boolean, default: false, index: true },
      publishedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

const Ride = mongoose.model('Ride', rideSchema);

export default Ride;