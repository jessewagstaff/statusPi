import https from 'https';
import fs from 'fs';

import { statusStore } from './status.mjs';
import updateDisplay from '../updateDisplay.mjs';

import config from '../../spotify.config.js';

const clientDetails = Buffer.from(
  `${config.clientId}:${config.clientSecret}`
).toString('base64');

const auth = {
  access_token: null,
  refresh_token: null,
};

let timeout = null;

const getAccessToken = (postData) =>
  new Promise((resolve) => {
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
          timeout: 2000,
        },
        (res) => {
          const { statusCode, statusMessage } = res;

          statusStore.set('spotify', {
            auth: `${statusCode} ${statusMessage}`,
            authTs: new Date().toUTCString(),
          });

          if (statusCode === 200) {
            let resData = '';
            res.on('data', (chunk) => {
              resData += chunk;
            });

            res.on('end', () => {
              const parsedData = JSON.parse(resData);

              Object.assign(auth, parsedData);
              if (auth.refresh_token) {
                fs.writeFileSync(config.tokenPath, auth.refresh_token);
              }

              resolve();
            });
            return;
          }

          if (statusCode < 500) {
            auth.access_token = null;
            auth.refresh_token = null;
          }
          resolve();
        }
      )
      .on('error', (error) => {
        statusStore.set('spotify', {
          lastAuthError: error,
        });
        resolve();
      });

    req.write(postData);
    req.end();
  });

const getNowPlaying = async () => {
  timeout && clearTimeout(timeout);

  if (!auth.access_token) {
    statusStore.set('spotify', {
      status: 'needs access token',
    });
    return;
  }

  return new Promise((resolve) => {
    https
      .request(
        {
          headers: {
            Authorization: `Bearer ${auth.access_token}`,
          },
          hostname: 'api.spotify.com',
          method: 'GET',
          path: '/v1/me/player/currently-playing',
          port: 443,
          timeout: 2000,
        },
        async (res) => {
          const { statusCode, statusMessage } = res;

          if (statusCode === 200) {
            let resData = '';
            res.on('data', (chunk) => {
              resData += chunk;
            });

            res.on('end', () => {
              try {
                const parsedData = JSON.parse(resData);
                const artist = parsedData.item.artists
                  .map(({ name }) => name)
                  .join(', ');
                const image = parsedData.item.album.images[1].url;
                const name = parsedData.item.name;
                const playing = parsedData.is_playing || false;

                statusStore.set('spotify', {
                  artist,
                  image,
                  name,
                  playing,
                  status: `${statusCode} ${statusMessage}`,
                });

                updateDisplay({
                  type: 'nowPlaying',
                  artist,
                  image,
                  name,
                  playing,
                });
              } catch (error) {
                statusStore.set('spotify', {
                  status: `${statusCode} ${statusMessage}`,
                  lastError: error,
                  lastErrorTs: new Date().toUTCString(),
                });
              }

              // Fast refresh for 200s
              timeout = setTimeout(getNowPlaying, 2500);
              resolve();
            });

            return;
          }

          updateDisplay({
            type: 'nowPlaying',
            playing: false,
          });

          statusStore.set('spotify', {
            lastCheck: new Date().toUTCString(),
            playing: false,
            status: `${statusCode} ${statusMessage}`,
          });

          if (statusCode === 401) {
            // access_token has expired, go get another one
            auth.access_token = null;
            await getAccessToken(
              `grant_type=refresh_token&refresh_token=${auth.refresh_token}`
            );
          }

          if (statusCode === 400) {
            statusStore.set('spotify', {
              lastError: 'Bad Request. Clearing tokens',
              lastErrorTs: new Date().toUTCString(),
            });
            auth.access_token = null;
            auth.refresh_token = null;
            resolve();
            return;
          }

          // 204 = spotify says hold back. nothing is playing
          timeout = setTimeout(getNowPlaying, 60000);
          resolve();
        }
      )
      .on('error', (error) => {
        updateDisplay({
          type: 'nowPlaying',
          playing: false,
        });
        statusStore.set('spotify', {
          lastError: error,
          lastErrorTs: new Date().toUTCString(),
        });
        timeout = setTimeout(getNowPlaying, 80000);
        resolve();
      })
      .end();
  });
};

const handleResponse = async (req, res) => {
  const redirectUri = `http://${req.headers.host}/spotify/`;

  const params = new URLSearchParams(req.url.split('?').pop());
  if (params.has('code')) {
    auth.access_token = null;
    auth.refresh_token = null;
    const code = params.get('code');
    await getAccessToken(
      `grant_type=authorization_code&code=${code}&redirect_uri=${redirectUri}`
    );
  } else if (!auth.refresh_token) {
    const authParams = new URLSearchParams();
    authParams.set('client_id', config.clientId);
    authParams.set('redirect_uri', redirectUri);
    authParams.set('scope', 'user-read-currently-playing');
    authParams.set('response_type', 'code');
    res.writeHead(307, {
      Location: `https://accounts.spotify.com/en/authorize?${authParams}`,
    });
    res.end();
    return;
  }

  await getNowPlaying();
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(statusStore.get('spotify')));
};

try {
  const token = fs.readFileSync(config.tokenPath, 'utf8');
  if (token) {
    auth.refresh_token = token;
    getAccessToken(`grant_type=refresh_token&refresh_token=${token}`).then(
      getNowPlaying
    );
  }
} catch (err) {
  statusStore.set('spotify', {
    auth: 'Needs Auth @ /spotify',
  });
}

export default handleResponse;
