const connect = require('connect');
const fetch = require('node-fetch');
const http = require('http');
const path = require('path');
const serveStatic = require('serve-static');
const si = require('systeminformation');
const websocket = require('ws');

const port = 8080;

const spotifyAuth = {
  access_token: null,
  client_id: 'b51f5c10b44d411ea644217c7365ac36',
  client_secret: '07d84c5f7f9641c2b5965cfa77500c4c',
  code: null,
  redirect_uri: `http://localhost:${port}/auth/spotify/callback`,
  refresh_token: null,
  scope: 'user-read-currently-playing',
};

const data = {
  spotify: {
    status: 'init',
    playing: false,
    name: null,
    artist: null,
    image: null,
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

wss.on('connection', (socket) => {
  socket.send(JSON.stringify({ type: 'connected' }));
});

const requestSpotifyAccessToken = async () => {
  if (spotifyAuth.access_token) {
    return true;
  }

  const fetchData = {};

  if (spotifyAuth.refresh_token) {
    fetchData.grant_type = 'refresh_token';
    fetchData.refresh_token = spotifyAuth.refresh_token;
  } else if (spotifyAuth.code) {
    fetchData.grant_type = 'authorization_code';
    fetchData.code = spotifyAuth.code;
    fetchData.redirect_uri = spotifyAuth.redirect_uri;
  } else {
    data.spotify.status = `Requires Auth: https://accounts.spotify.com/en/authorize?client_id=${spotifyAuth.client_id}&response_type=code&redirect_uri=${spotifyAuth.redirect_uri}&scope=${spotifyAuth.scope}`;
    return false;
  }
  const queryBody = new URLSearchParams(fetchData).toString();

  const clientDetails = Buffer.from(
    `${spotifyAuth.client_id}:${spotifyAuth.client_secret}`
  ).toString('base64');

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${clientDetails}`,
    },
    body: queryBody,
  });
  const responseData = await res.json();

  spotifyAuth.code = null;
  Object.assign(spotifyAuth, responseData);

  // Access Token has expired.
  if (responseData.error?.status === 401) {
    data.spotify.status = responseData.error;
    spotifyAuth.refresh_token = null;
    return false;
  }

  return Boolean(spotifyAuth.access_token);
};

const getNowPlaying = async () => {
  if (await requestSpotifyAccessToken()) {
    try {
      const response = await fetch(
        'https://api.spotify.com/v1/me/player/currently-playing',
        {
          headers: {
            Authorization: `Bearer ${spotifyAuth.access_token}`,
          },
        }
      );

      if (!response.ok) {
        data.spotify.status = `An error has occurred: ${response.status}`;
        spotifyAuth.access_token = null;
        setTimeout(getNowPlaying, 60000);
        return;
      }

      if (response.status === 204) {
        data.spotify.status = 'waiting';

        if (data.spotify.playing) {
          wsSend({
            type: 'nowPlaying',
            playing: false,
          });
        }
        data.spotify.playing = false;
        setTimeout(getNowPlaying, 30000);
        return;
      }

      const currentlyPlaying = await response.json();
      data.spotify.status = 'ok';
      data.spotify.playing = currentlyPlaying.is_playing;
      data.spotify.name = currentlyPlaying.item.name;
      data.spotify.artist = currentlyPlaying.item.artists
        .map(({ name }) => name)
        .join(', ');
      data.spotify.image = currentlyPlaying.item.album.images[1].url;

      wsSend({
        type: 'nowPlaying',
        artist: data.spotify.artist,
        image: currentlyPlaying.item.album.images[1].url,
        name: currentlyPlaying.item.name,
        playing: currentlyPlaying.is_playing,
      });
    } catch (error) {
      spotifyAuth.access_token = null;
      data.spotify.status = error;
      if (data.spotify.playing) {
        wsSend({
          type: 'nowPlaying',
          playing: false,
        });
      }
      data.spotify.playing = false;
    }
  }

  setTimeout(getNowPlaying, 2500);
};

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
