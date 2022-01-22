import https from 'https';

import { statusStore } from './status.mjs';
import updateDisplay from '../updateDisplay.mjs';

const hostname = '192.168.86.124';
const updateStatus = (status) => statusStore.set('enphase', status);
const WMax = 1000000; // 1kW

let jwt = null;
let lastStatusCode = null;
let sessionCookie = 'woogle';
let timeout = null;

const updateSessionCookie = (headers = {}) => {
  const cookie = 'set-cookie' in headers && headers['set-cookie'][0];
  if (cookie && cookie.startsWith('sessionId=')) {
    sessionCookie = cookie.substring(0, cookie.indexOf(';'));
    return cookie;
  }
  return null;
};

const getSessionCookie = () =>
  new Promise((resolve, reject) => {
    sessionCookie = null;
    if (!jwt) {
      return reject('no jwt');
    }

    https
      .request(
        {
          hostname,
          method: 'GET',
          path: '/auth/check_jwt',
          port: 443,
          timeout: 2000,
          rejectUnauthorized: false,
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        },
        (res) => {
          const { statusCode, statusMessage, headers } = res;
          updateStatus({
            jwt: `${statusCode} ${statusMessage} ${new Date().toUTCString()}`,
          });

          if (statusCode === 200 && headers && updateSessionCookie(headers)) {
            return resolve();
          }

          jwt = null;
          reject(statusCode);
        }
      )
      .on('error', (exception) => {
        updateStatus({
          jwtError: exception,
        });
        reject(exception);
      })
      .end();
  });

const enableLiveData = () =>
  new Promise((resolve, reject) => {
    if (!sessionCookie) {
      reject('no session cookie');
      return;
    }

    const body = '{"enable":1}';
    const req = https
      .request(
        {
          hostname,
          method: 'POST',
          path: '/ivp/livedata/stream',
          port: 443,
          timeout: 2000,
          rejectUnauthorized: false,
          headers: {
            'Content-Length': body.length,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Cookie: sessionCookie,
          },
        },
        (res) => {
          const { statusCode, statusMessage, headers } = res;
          updateStatus({
            stream: `${statusCode} ${statusMessage} ${new Date().toUTCString()}`,
          });

          if (statusCode === 200) {
            updateSessionCookie(headers);

            let resData = '';
            res.on('data', (chunk) => {
              resData += chunk;
            });

            res.on('end', () => {
              try {
                const parsedData = JSON.parse(resData);
                if (parsedData.sc_stream === 'enabled') {
                  resolve();
                } else {
                  reject('failed to enable stream');
                }
              } catch (exception) {
                reject(exception);z
              }
            });
            return;
          }

          reject(statusCode);
        }
      )
      .on('error', (exception) => {
        reject(exception);
      });
    req.write(body);
    req.end();
  });

export const clearLiveData = () => {
  updateDisplay({
    type: 'house',
    battery: null,
    batteryPercent: null,
    grid: null,
    solar: null,
    usage: null,
  });
}

const getLiveData = async () =>
  new Promise((resolve, reject) => {
    timeout && clearTimeout(timeout);
    if (!sessionCookie) {
      reject('no session cookie');
      return;
    }

    https
      .request(
        {
          hostname,
          method: 'GET',
          path: '/ivp/livedata/status',
          port: 443,
          timeout: 2000,
          rejectUnauthorized: false,
          headers: {
            Cookie: sessionCookie,
          },
        },
        async (res) => {
          const { statusCode, statusMessage, headers } = res;
          updateStatus({
            status: `${statusCode} ${statusMessage}`,
          });
          try {
            // cookie session has expired, go get another one
            if (statusCode === 401 && lastStatusCode !== statusCode) {
              await getSessionCookie();
              await getLiveData();
              return;
            }

            if (statusCode === 200) {
              updateSessionCookie(headers);

              let resData = '';
              res.on('data', (chunk) => {
                resData += chunk;
              });

              res.on('end', async () => {
                const parsedData = JSON.parse(resData);

                parsedData.meters.last_update = new Date(
                  parsedData.meters.last_update * 1000
                ).toUTCString();

                updateStatus(parsedData);

                if (parsedData.connection.sc_stream === 'enabled') {
                  updateDisplay({
                    type: 'house',
                    battery: parsedData.meters.storage.agg_p_mw / WMax,
                    batteryPercent: parsedData.meters.soc,
                    grid: parsedData.meters.grid.agg_p_mw / WMax,
                    solar: parsedData.meters.pv.agg_p_mw / WMax,
                    usage: parsedData.meters.load.agg_p_mw / WMax,
                  });
                } else {
                  await enableLiveData();
                }
                // Refresh every minute after successful response
                timeout = setTimeout(getLiveData, 60000);
              });
              return;
            }
          } catch (error) {
            clearLiveData();
            updateStatus({
              error,
              errorTs: new Date().toUTCString(),
            });
          } finally {
            lastStatusCode = statusCode;
            resolve();
          }
        }
      )
      .on('error', (error) => {
        clearLiveData();
        updateStatus({
          error,
          errorTs: new Date().toUTCString(),
        });
        timeout = setTimeout(getLiveData, 80000);
        resolve();
      })
      .end();
  });

const handleResponse = async (req, res) => {
  timeout && clearTimeout(timeout);
  try {
    const params = new URLSearchParams(req.url.split('?').pop());
    if (params.has('token')) {
      jwt = params.get('token');
      await getSessionCookie();
    }

    if (sessionCookie) {
      await getLiveData();
    } else {
      updateStatus({
        jwt: `Needs Token http://${req.headers.host}/enphase/?token=`,
      });
    }
  } catch (error) {
    updateStatus({
      error,
      errorTs: new Date().toUTCString(),
    });
  }

  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(statusStore.get('enphase')));
};

export default handleResponse;
