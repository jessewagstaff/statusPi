import https from 'https';

import { statusStore } from './middleware/status.mjs';
import updateDisplay from './updateDisplay.mjs';

let timeout = null;

const getTideData = () => {
  timeout && clearTimeout(timeout);

  https
    .request(
      {
        method: 'GET',
        timeout: 2000,
        port: 443,
        hostname: 'cdip.ucsd.edu',
        path: '/recent/model_images/sf.png',
        headers: {
          'if-modified-since': statusStore.get('tides')?.lastUpdate || null,
        },
      },
      (res) => {
        const { statusCode, statusMessage, headers } = res;
        statusStore.set('tides', {
          status: `${statusCode} ${statusMessage}`,
          lastUpdate: headers['last-modified'],
        });

        if (statusCode === 200) {
          res.setEncoding('base64');

          let img = `data:${headers['content-type']};base64, `;
          res.on('data', (chunk) => {
            img += chunk;
          });

          res.on('end', () => {
            updateDisplay({
              type: 'ocean',
              swellChart: img,
            });
          });
        }

        // Ready another request (every 20 minutes)
        timeout = setTimeout(getTideData, 1200000);
      }
    )
    .on('error', (error) => {
      statusStore.set('tides', {
        lastError: error,
        lastErrorTs: new Date().toUTCString(),
      });
      timeout = setTimeout(getTideData, 80000);
    })
    .end();
};

export default getTideData;
