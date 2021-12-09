const R = require('ramda');

function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

const round = R.curry((precision, float) => Number(float.toFixed(precision)));
const roundToInt = round(0);
const roundToTenth = round(1);

module.exports = {
  pad,
  round,
  roundToInt,
  roundToTenth,
};
