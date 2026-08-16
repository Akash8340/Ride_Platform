import { useState } from 'react';
import { createRide } from '../services/bookingApi.js';
import { useNotifications } from '../hooks/useNotifications.js';

const RIDER_ID = 'rider-001'; // hardcoded for now — real auth comes later (Day 19)

const STATUS_STYLES = {
  REQUESTED: 'bg-amber-950 text-amber-400 border-amber-800',
  RIDE_MATCHED: 'bg-emerald-950 text-emerald-400 border-emerald-800',
  NO_DRIVERS_AVAILABLE: 'bg-rose-950 text-rose-400 border-rose-800',
};

export function RiderPage() {
  const [pickup] = useState({ latitude: 23.2599, longitude: 77.4126 });
  const [drop] = useState({ latitude: 23.2156, longitude: 77.4304 });
  const [ride, setRide] = useState(null);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isConnected, latestEvent } = useNotifications(RIDER_ID);

  const liveStatus =
    latestEvent && ride && latestEvent.rideId === ride.rideId
      ? latestEvent.type
      : null;

  const displayStatus = liveStatus || ride?.status;
  const statusClasses = STATUS_STYLES[displayStatus] || 'bg-zinc-800 text-zinc-400 border-zinc-700';

  async function handleRequestRide() {
    setError(null);
    setIsSubmitting(true);
    try {
      const newRide = await createRide({
        riderId: RIDER_ID,
        pickup,
        drop,
        idempotencyKey: crypto.randomUUID(),
      });
      setRide(newRide);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 p-8 font-sans">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-medium tracking-tight text-zinc-100">Rider Console</h2>
          <span className="flex items-center gap-2 text-xs font-mono text-zinc-500">
            <span
              className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-zinc-600'}`}
            />
            {isConnected ? 'live' : 'offline'}
          </span>
        </div>

        <button
          onClick={handleRequestRide}
          disabled={isSubmitting}
          className="w-full py-3 rounded-md bg-zinc-100 text-zinc-950 font-medium text-sm
                     hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Requesting…' : 'Request Ride'}
        </button>

        {error && (
          <p className="mt-4 text-sm text-rose-400 font-mono">{error}</p>
        )}

        {ride && (
          <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-zinc-500 font-mono">ride_id</span>
              <span className="text-xs font-mono text-zinc-400">{ride.rideId.slice(0, 8)}…</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-zinc-500 font-mono">status</span>
              <span className={`text-xs font-mono px-2 py-0.5 rounded border ${statusClasses}`}>
                {displayStatus}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


