import { useEffect, useRef, useState } from 'react';
import { telemetrySocket } from '../services/telemetrySocket.js';

const PING_INTERVAL_MS = 2000;

export function useTelemetry({ driverId, latitude, longitude, isOnline }) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastError, setLastError] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!isOnline) return;

    function sendPing() {
      telemetrySocket.sendLocation({ driverId, latitude, longitude, status: 'AVAILABLE' });
    }

    function handleConnected() {
      setIsConnected(true);
      sendPing(); // send immediately on connect, don't wait for the first interval tick
    }

    function handleDisconnected() {
      setIsConnected(false);
    }

    function handleError(event) {
      setLastError(event.detail);
    }

    telemetrySocket.addEventListener('connected', handleConnected);
    telemetrySocket.addEventListener('disconnected', handleDisconnected);
    telemetrySocket.addEventListener('error', handleError);

    telemetrySocket.connect();

    intervalRef.current = setInterval(sendPing, PING_INTERVAL_MS);

    return () => {
      clearInterval(intervalRef.current);
      telemetrySocket.removeEventListener('connected', handleConnected);
      telemetrySocket.removeEventListener('disconnected', handleDisconnected);
      telemetrySocket.removeEventListener('error', handleError);
      telemetrySocket.disconnect();
    };
  }, [isOnline, driverId, latitude, longitude]);

  return { isConnected, lastError };
}