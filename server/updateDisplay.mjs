import websocket from 'ws';

const callbacks = new Map();
const port = 8081;
const wss = new websocket.Server({ port });

wss.on('connection', (socket) => {
  socket.send(JSON.stringify({ type: 'connected' }));
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
  wss.clients.forEach((client) => {
    if (client.readyState === websocket.OPEN) {
      client.send(stringified);
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
