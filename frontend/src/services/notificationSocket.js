import env from '../config/env.js';

class NotificationSocket extends EventTarget {
  constructor() {
    super();
    this.ws = null;
  }

  connect(userId) {
    this.ws = new WebSocket(env.NOTIFICATION_SERVICE_WS_URL);

    this.ws.addEventListener('open', () => {
      this.ws.send(JSON.stringify({ type: 'REGISTER', userId }));
      this.dispatchEvent(new Event('connected'));
    });

    this.ws.addEventListener('message', (event) => {
      const parsed = JSON.parse(event.data);
      this.dispatchEvent(new CustomEvent('message', { detail: parsed }));
    });

    this.ws.addEventListener('close', () => {
      this.dispatchEvent(new Event('disconnected'));
    });

    this.ws.addEventListener('error', (err) => {
      this.dispatchEvent(new CustomEvent('error', { detail: err }));
    });
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
  }
}

export const notificationSocket = new NotificationSocket();