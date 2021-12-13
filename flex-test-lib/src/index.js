import {terminateProcess} from './misc-util';
import {
  generateSyncToken, getSyncClient, subscribeToSyncMap, setSyncMapItem
} from './sync-util';

// NOTE: these pkgs must be required - not imported
const axios = require('axios');

const getSyncToken = (url, identity, handler) => {
  axios.get(`${url}?Identity=${identity}`, {
    headers: {
      Accept: "application/json"
    }
  })
  .then(resp => {
    handler(resp.data);
  })
  .catch(function (error) {
    console.log(error);
  })
};

const sendChannelStatus = ({syncMap, agtName, channel, status}) => {
  const data = {op: 'CHANNEL_STATUS', source: agtName, channel, status}
  setSyncMapItem(syncMap, 'all', data, 300);
};

const verifyRequiredEnvVars = (env, varNames) => {
  varNames.forEach(varName => {
    if (!env[varName]) {
      throw new Error(`required environment variable - ${varName} - is missing from .env file`);
    }
  })
};

export {
  generateSyncToken,
  getSyncToken,
  getSyncClient,
  subscribeToSyncMap,
  setSyncMapItem,
  sendChannelStatus,
  terminateProcess,
  verifyRequiredEnvVars
};
