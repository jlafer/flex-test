import * as R from 'ramda';

export function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

export const round = R.curry((precision, float) => Number(float.toFixed(precision)));
export const roundToInt = round(0);
export const roundToTenth = round(1);
