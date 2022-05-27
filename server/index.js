import { fileURLToPath } from 'url';
import connect from 'connect';
import http from 'http';
import path, { dirname } from 'path';
import serveStatic from 'serve-static';

import enphase from './middleware/enphase.mjs';
import refresh from './middleware/refresh.mjs';
import spotify from './middleware/spotify.mjs';
import weatherStation from './middleware/weatherStation.mjs';
import status from './middleware/status.mjs';

import tides from './tides.mjs';

const port = 8080;

const app = connect();
app.use(
  serveStatic(path.join(dirname(fileURLToPath(import.meta.url)), '..', 'dist'))
);
app.use('/enphase', enphase);
app.use('/refresh', refresh);
app.use('/spotify', spotify);
app.use('/station', weatherStation);
app.use('/status', status);

const server = http.createServer(app).listen(port);

tides();

process.once('SIGTERM', async () => {
  try {
    await server.close();
  } finally {
    process.exit(0);
  }
});
