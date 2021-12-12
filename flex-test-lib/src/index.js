// imports here - they must go above requires
import * as R from 'ramda';
//import SyncClient from "twilio-sync";

import {terminateProcess} from './misc';

// NOTE: these pkgs must be required - not imported
const axios = require('axios');
const SyncClient = require('twilio-sync');

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

const getSyncClientAndMap = R.curry((mapCallback, itemCallback, mapName, data) => {
  console.log('getSyncClientAndMap: entered');
  const options = {
    logLevel: "info"
  };
  const client = new SyncClient(data.token, options);
  console.log('getSyncClientAndMap: initiated connection');

  client.on("connectionStateChanged", state => {
    console.log('getSyncClientAndMap.connectionState: ', {state});
  });

  client.map({id: mapName, ttl: 1800}).then(map => {
    console.log('getSyncClientAndMap: opened map:', {sid: map.sid});
    map.on("itemAdded", itemCallback);
    map.on("itemUpdated", itemCallback);
    mapCallback(map);
  });
});

const setSyncMapItem = (map, key, data, ttl) => {
  map.set(key, data, {ttl})
  .then(function(item) {
    //console.log('setSyncMapItem successful');
  })
  .catch(function(error) {
    console.error('setSyncMapItem failed', error);
  });
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
  getSyncToken,
  getSyncClientAndMap,
  setSyncMapItem,
  sendChannelStatus,
  terminateProcess,
  verifyRequiredEnvVars
};
