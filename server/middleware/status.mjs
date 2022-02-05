import fs from 'fs';
import os from 'os';

class StatusMap extends Map {
  set(key, value) {
    const existing = super.get(key);
    return super.set(
      key,
      existing && typeof existing === 'object'
        ? {
            ...existing,
            ...value,
          }
        : value
    );
  }
}

export const statusStore = new StatusMap();

const handleResponse = (_, res) => {
  try {
    const cpuTemp = fs.readFileSync('/sys/class/thermal/thermal_zone0/temp');
    statusStore.set('cpuTemp', cpuTemp / 1000);
  } catch (err) {
    statusStore.set('cpuTemp', 'n/a');
  }

  statusStore.set(
    'processUptime',
    `${Math.trunc(process.uptime() / 3600 / 24)} days`
  );
  statusStore.set('uptime', `${Math.trunc(os.uptime() / 3600 / 24)} days`);

  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(Object.fromEntries(statusStore)));
};

export default handleResponse;
