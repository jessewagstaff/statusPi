import updateDisplay from '../updateDisplay.mjs';

const handleResponse = (_, res) => {
  updateDisplay({
    type: 'refresh',
  });
  res.end('done');
};

export default handleResponse;
