import {findObjByKeyVal} from 'jlafer-lib';
import {setSyncMapItem} from './sync-util';

export const verifyRequiredEnvVars = (env, varNames) => {
  varNames.forEach(varName => {
    if (!env[varName]) {
      throw new Error(`required environment variable - ${varName} - is missing from .env file`);
    }
  })
};

export const getParty = findObjByKeyVal('identity');

export const sendChannelStatus = ({syncMap, agtName, channel, status}) => {
  const data = {op: 'CHANNEL_STATUS', source: agtName, channel, status}
  setSyncMapItem(syncMap, 'all', data, 300);
};

export function terminateProcess(message, code) {
  console.log(message);
  process.exit(code);
}