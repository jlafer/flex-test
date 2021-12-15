import {
  ACTION_ACCEPT, ACTION_ACTIVITY, ACTION_ATTACH, ACTION_COMPLETE, ACTION_DIAL,
  ACTION_END, ACTION_HOLD, ACTION_RELEASE, ACTION_TRANSFER, ACTION_TWIML, ACTION_UNHOLD,
  CHG_CHANNEL_STATUS, CHG_CLIENT_READY, CHG_END_COMMAND, CHG_END_PARTY, CHG_END_TEST,
  CHG_START_TEST, CHG_STATS,
  OP_START, OP_COMMAND, OP_CHANNEL_STATUS, OP_PROGRESS, OP_STATS, OP_STATUS, OP_NONE, OP_END,
  CMD_STATUS_STARTED, CMD_STATUS_ENDED,
  PARTY_STATUS_PENDING, PARTY_STATUS_STARTED, PARTY_STATUS_ENDED,
  STEP_STATUS_READY, STEP_STATUS_STARTED, STEP_STATUS_ENDED,
  TEST_STATUS_PENDING, TEST_STATUS_READY, TEST_STATUS_STARTED, TEST_STATUS_ENDED
} from './constants';
import {getParty, terminateProcess} from './misc-util';
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
  ACTION_ACCEPT, ACTION_ACTIVITY, ACTION_ATTACH, ACTION_COMPLETE, ACTION_DIAL,
  ACTION_END, ACTION_HOLD, ACTION_RELEASE, ACTION_TRANSFER, ACTION_TWIML, ACTION_UNHOLD,
  CHG_CHANNEL_STATUS, CHG_CLIENT_READY, CHG_END_COMMAND, CHG_END_PARTY, CHG_END_TEST,
  CHG_START_TEST, CHG_STATS,
  OP_START, OP_COMMAND, OP_CHANNEL_STATUS, OP_PROGRESS, OP_STATS, OP_STATUS, OP_NONE, OP_END,
  CMD_STATUS_STARTED, CMD_STATUS_ENDED,
  PARTY_STATUS_PENDING, PARTY_STATUS_STARTED, PARTY_STATUS_ENDED,
  STEP_STATUS_READY, STEP_STATUS_STARTED, STEP_STATUS_ENDED,
  TEST_STATUS_PENDING, TEST_STATUS_READY, TEST_STATUS_STARTED, TEST_STATUS_ENDED,
  generateSyncToken,
  getSyncToken,
  getSyncClient,
  getParty,
  subscribeToSyncMap,
  setSyncMapItem,
  sendChannelStatus,
  terminateProcess,
  verifyRequiredEnvVars
};
