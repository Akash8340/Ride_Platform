import env from '../config/env.js';

class TelemetrySocket extends EventTarget {
  constructor() {
    super();
    this.ws = null;
  }

  connect() {
    this.ws = new WebSocket(env.INGESTION_SERVICE_WS_URL);

    this.ws.addEventListener('open', () => {
      this.dispatchEvent(new Event('connected'));
    });

    this.ws.addEventListener('message', (event) => {
      const parsed = JSON.parse(event.data);
      if (parsed.type === 'ERROR') {
        this.dispatchEvent(new CustomEvent('error', { detail: parsed }));
      }
    });

    this.ws.addEventListener('close', () => {
      this.dispatchEvent(new Event('disconnected'));
    });
  }

  sendLocation({ driverId, latitude, longitude, status }) {
    if (this.ws?.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify({ driverId, latitude, longitude, status }));
    return true;
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
  }
}

export const telemetrySocket = new TelemetrySocket();