const clients = new Map();

export function registerClient(userId, ws) {
  clients.set(userId, ws);

  ws.on('close', () => {
    // Only delete if this socket is still the one registered for this user —
    // a client can reconnect (new socket) before the old socket's close
    // event fires, and we don't want the new connection's entry wiped by
    // the old connection's cleanup running late.
    if (clients.get(userId) === ws) {
      clients.delete(userId);
    }
  });
}

export function sendToUser(userId, payload) {
  const ws = clients.get(userId);

  if (!ws || ws.readyState !== ws.OPEN) {
    return false;
  }

  ws.send(JSON.stringify(payload));
  return true;
}

export function getConnectedCount() {
  return clients.size;
}