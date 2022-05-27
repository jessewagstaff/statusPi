import websocket from 'ws';
import { statusStore } from './middleware/status.mjs';

const callbacks = new Map();
const port = 8081;
const wss = new websocket.Server({ port });
statusStore.set('websocketClients', 0);

wss.on('connection', (ws) => {
  statusStore.set('websocketClients', wss.clients.size);
  setTimeout(() => {
    for (const callback of callbacks.values()) {
      if (callback) {
        callback();
      }
    }
  }, 1000);
});

const updateDisplay = (payload = {}) => {
  if (!payload.type) {
    payload.type = 'unknown';
  }
  const stringified = JSON.stringify(payload);

  statusStore.set('websocketClients', wss.clients.size);
  wss.clients.forEach((ws) => {
    if (ws.readyState === websocket.OPEN) {
      ws.send(stringified);
    }
  });
};

process.once('SIGTERM', async () => {
  wss.clients.forEach((ws) => ws.terminate());
});

export const onConnect = (callback) => {
  callbacks.set(callback.name, callback);
};

export default updateDisplay;
