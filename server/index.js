const connect = require('connect');
const http = require('http');
const https = require('https');
const path = require('path');
const serveStatic = require('serve-static');
const si = require('systeminformation');
const websocket = require('ws');

const port = 8080;

const spotifyAuth = {
  access_token: null,
  agent: new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 30000,
    maxSockets: 1,
    timeout: 60000, // active socket keepalive for 60 seconds
  }),
  client_id: 'b51f5c10b44d411ea644217c7365ac36',
  client_secret: '07d84c5f7f9641c2b5965cfa77500c4c',
  code: null,
  redirect_uri: `http://localhost:${port}/spotify/`,
  refresh_token: null,
  scope: 'user-read-currently-playing',
};

const data = {
  spotify: {
    status: 'init',
    playing: false,
  },
  status: 'ok',
  weatherData: {},
};

const wss = new websocket.Server({ port: port + 1 });

const wsSend = (payload = {}) => {
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

const spotifySendStopPlaying = () => {
  if (data.spotify.playing) {
    wsSend({
      type: 'nowPlaying',
      playing: false,
    });
  }
  data.spotify.playing = false;
};

const handleSpotifyError = (error = { type: 'unknown error' }) => {
  data.spotify.status = {
    ...error,
    timestamp: new Date(),
  };

  spotifySendStopPlaying();
  setTimeout(getNowPlaying, 30000);
};

const handleSpotifyResponse = (res) => {
  const { statusCode, statusMessage } = res;
  data.spotify.statusCode = statusCode;
  data.spotify.status = statusMessage;

  if (statusCode === 200) {
    let resData = '';
    res.on('data', (chunk) => {
      resData += chunk;
    });

    res.on('end', () => {
      try {
        const parsedData = JSON.parse(resData);

        if ('is_playing' in parsedData) {
          data.spotify.playing = parsedData.is_playing;
          data.spotify.name = parsedData.item.name;
          data.spotify.artist = parsedData.item.artists
            .map(({ name }) => name)
            .join(', ');

          wsSend({
            type: 'nowPlaying',
            artist: data.spotify.artist,
            image: parsedData.item.album.images[1].url,
            name: parsedData.item.name,
            playing: parsedData.is_playing,
          });
          // Fast refresh mode
          setTimeout(getNowPlaying, 2500);
          return;
        }

        if (parsedData.access_token) {
          Object.assign(spotifyAuth, parsedData);
          getNowPlaying();
          return;
        }

        throw new Error('Unexpected response from Spotify: ' + resData);
      } catch ({ name, message }) {
        handleSpotifyError({
          name,
          message,
          status: 'Failed to parse response',
        });
      }
    });
    return;
  }

  if (statusCode === 401) {
    // access_token has expired, go get another one
    data.spotify.status += ': Access Token Expired';
    spotifyAuth.access_token = null;
    getNowPlaying();
    return;
  }

  if (statusCode === 400) {
    // Bad request means we should start over
    spotifyAuth.access_token = null;
    spotifyAuth.refresh_token = null;
  }

  // 204 = spotify says hold back. nothing is playing

  spotifySendStopPlaying();
  setTimeout(getNowPlaying, 60000);
};

const getNowPlaying = () => {
  // We have access token. Attempt to get currently playing
  if (spotifyAuth.access_token) {
    const req = https
      .request(
        {
          agent: spotifyAuth.agent,
          headers: {
            Authorization: `Bearer ${spotifyAuth.access_token}`,
          },
          hostname: 'api.spotify.com',
          method: 'GET',
          path: '/v1/me/player/currently-playing',
          port: 443,
          timeout: 60000,
        },
        handleSpotifyResponse
      )
      .on('error', handleSpotifyError);

    return req.end();
  }

  if (!spotifyAuth.refresh_token && !spotifyAuth.code) {
    // We have nothing
    data.spotify.status = `Requires Auth: https://accounts.spotify.com/en/authorize?client_id=${spotifyAuth.client_id}&response_type=code&redirect_uri=${spotifyAuth.redirect_uri}&scope=${spotifyAuth.scope}`;
    return;
  }

  // Attempt to get some tokens
  const postData = spotifyAuth.code
    ? `grant_type=authorization_code&code=${spotifyAuth.code}&redirect_uri=${spotifyAuth.redirect_uri}`
    : `grant_type=refresh_token&refresh_token=${spotifyAuth.refresh_token}`;

  const clientDetails = Buffer.from(
    `${spotifyAuth.client_id}:${spotifyAuth.client_secret}`
  ).toString('base64');

  const req = https
    .request(
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${clientDetails}`,
        },
        hostname: 'accounts.spotify.com',
        method: 'POST',
        path: '/api/token',
        timeout: 60000,
      },
      handleSpotifyResponse
    )
    .on('error', handleSpotifyError);

  req.write(postData);
  req.end();
  spotifyAuth.code = null;
};

wss.on('connection', (socket) => {
  socket.send(JSON.stringify({ type: 'connected' }));
});

const app = connect();
getNowPlaying();

app.use(serveStatic(path.join(__dirname, '..', 'dist')));

app.use('/status', async (_, res) => {
  res.setHeader('Content-Type', 'application/json');

  data.status = await si.cpuTemperature();
  res.end(JSON.stringify(data));
});

app.use('/spotify', (req, res) => {
  const params = new URLSearchParams(req.url.split('?').pop());
  spotifyAuth.code = params.get('code');
  if (spotifyAuth.code) {
    spotifyAuth.access_token = null;
    spotifyAuth.refresh_token = null;
    getNowPlaying();
    res.end('ok');
  } else {
    res.end('missing code');
  }
});

app.use('/station', (req, res) => {
  const params = new URLSearchParams(req.url.split('?').pop());
  data.weatherData = Object.fromEntries(params.entries());
  wsSend({
    type: 'weather',
    inside: Number(params.get('tempinf')),
    outside: Number(params.get('tempf')),
  });
  res.end('ok');
});

app.use('/refresh', (_, res) => {
  wsSend({
    type: 'refresh',
  });
  res.end('done');
});

const server = http.createServer(app).listen(port);

process.once('SIGTERM', async () => {
  console.log('closing http server');
  try {
    await server.close();
    wss.clients.forEach((ws) => ws.terminate());
  } finally {
    process.exit(0);
  }
});
