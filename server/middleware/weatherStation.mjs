import { statusStore } from './status.mjs';
import updateDisplay from '../updateDisplay.mjs';

const handleResponse = (req, res) => {
  const params = new URLSearchParams(req.url.split('?').pop());
  const stationData = Object.fromEntries(params.entries());
  statusStore.set('weather', stationData);

  const msg = {
    type: 'weather',
  };

  if (params.has('tempinf')) {
    msg.inside = Number(params.get('tempinf'));
  }
  if (params.has('tempf')) {
    msg.outside = Number(params.get('tempf'));
  }

  updateDisplay(msg);
  res.end('ok');
}

export default handleResponse;