import { useEffect, useState } from 'react';
import { useTelemetry } from '../hooks/useTelemetry.js';
import { useNotifications } from '../hooks/useNotifications.js';
import { updateRideStatus } from '../services/bookingApi.js';

const DRIVER_ID = 'driver-001'; // hardcoded for now — real auth comes later (Day 19)
const FIXED_LOCATION = { latitude: 23.2599, longitude: 77.4126 };

export function DriverPage() {
  const [isOnline, setIsOnline] = useState(false);
  const [currentRide, setCurrentRide] = useState(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completeError, setCompleteError] = useState(null);

  const isSendingTelemetry = isOnline && !currentRide;

  const { isConnected: telemetryConnected } = useTelemetry({
    driverId: DRIVER_ID,
    latitude: FIXED_LOCATION.latitude,
    longitude: FIXED_LOCATION.longitude,
    isOnline: isSendingTelemetry,
  });

  const { isConnected: notificationsConnected, latestEvent } = useNotifications(DRIVER_ID);

  useEffect(() => {
    if (latestEvent?.type === 'RIDE_MATCHED' && !currentRide) {
      setCurrentRide({ rideId: latestEvent.rideId, riderId: latestEvent.riderId });
      setCompleteError(null);
    }
  }, [latestEvent]);

  function handleToggleOnline() {
    setIsOnline((prev) => !prev);
  }

  async function handleCompleteRide() {
    if (!currentRide) return;

    setIsCompleting(true);
    setCompleteError(null);

    try {
      await updateRideStatus(currentRide.rideId, 'COMPLETED');
      setCurrentRide(null);
    } catch (err) {
      setCompleteError(err.message);
    } finally {
      setIsCompleting(false);
    }
  }

  const statusLabel = currentRide ? 'ON A RIDE' : isOnline ? 'AVAILABLE' : 'OFFLINE';
  const statusClasses = currentRide
    ? 'bg-blue-950 text-blue-400 border-blue-800'
    : isOnline
    ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
    : 'bg-zinc-800 text-zinc-500 border-zinc-700';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 p-8 font-sans">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-medium tracking-tight text-zinc-100">Driver Console</h2>
          <div className="flex items-center gap-3 text-xs font-mono text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${telemetryConnected ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
              telemetry
            </span>
            <span className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${notificationsConnected ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
              notifications
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <span className={`text-xs font-mono px-2 py-0.5 rounded border ${statusClasses}`}>
            {statusLabel}
          </span>
          {!currentRide && (
            <button
              onClick={handleToggleOnline}
              className="text-sm px-4 py-2 rounded-md bg-zinc-100 text-zinc-950 font-medium
                         hover:bg-white transition-colors"
            >
              {isOnline ? 'Go Offline' : 'Go Online'}
            </button>
          )}
        </div>

        {currentRide && (
          <div className="rounded-lg border border-blue-900 bg-blue-950/30 p-4 space-y-3">
            <p className="text-sm text-blue-300 font-medium">New ride assigned</p>
            <div className="flex justify-between items-center">
              <span className="text-xs text-zinc-500 font-mono">ride_id</span>
              <span className="text-xs font-mono text-zinc-400">{currentRide.rideId.slice(0, 8)}…</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-zinc-500 font-mono">rider_id</span>
              <span className="text-xs font-mono text-zinc-400">{currentRide.riderId}</span>
            </div>

            {completeError && (
              <p className="text-xs text-rose-400 font-mono">{completeError}</p>
            )}

            <button
              onClick={handleCompleteRide}
              disabled={isCompleting}
              className="w-full mt-2 text-sm py-2 rounded-md bg-blue-500 text-white font-medium
                         hover:bg-blue-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isCompleting ? 'Completing…' : 'Complete Ride'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}