import fs from 'fs';
import os from 'os';

class StatusMap extends Map {
  set(key, value) {
    const existing = super.get(key);
    return super.set(key, existing ? {
      ...existing,
      ...value
    } : value);
  }
}

export const statusStore = new StatusMap();

const handleResponse = (_, res) => {
  res.setHeader('Content-Type', 'application/json');

  let cpuTemp = null;
  try {
    cpuTemp = fs.readFileSync('/sys/class/thermal/thermal_zone0/temp');
    cpuTemp = cpuTemp / 1000;
  } catch (err) {
    cpuTemp = 'n/a';
  }

  res.end(
    JSON.stringify({
      ...Object.fromEntries(statusStore.entries()),
      cpuTemp,
      processUptime: `${Math.trunc(process.uptime() / 3600 / 24)} days`,
      uptime: `${Math.trunc(os.uptime() / 3600 / 24)} days`,
    })
  );
};

export default handleResponse;
