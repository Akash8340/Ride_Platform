import { useEffect, useState } from 'react';
import { notificationSocket } from '../services/notificationSocket.js';

export function useNotifications(userId) {
  const [isConnected, setIsConnected] = useState(false);
  const [latestEvent, setLatestEvent] = useState(null);

  useEffect(() => {
    if (!userId) return;

    function handleConnected() {
      setIsConnected(true);
    }

    function handleDisconnected() {
      setIsConnected(false);
    }

    function handleMessage(event) {
      setLatestEvent(event.detail);
    }

    notificationSocket.addEventListener('connected', handleConnected);
    notificationSocket.addEventListener('disconnected', handleDisconnected);
    notificationSocket.addEventListener('message', handleMessage);

    notificationSocket.connect(userId);

    return () => {
      notificationSocket.removeEventListener('connected', handleConnected);
      notificationSocket.removeEventListener('disconnected', handleDisconnected);
      notificationSocket.removeEventListener('message', handleMessage);
      notificationSocket.disconnect();
    };
  }, [userId]);

  return { isConnected, latestEvent };
}