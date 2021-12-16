import * as R from 'ramda';
import {openFile, readJsonFile, writeToFile} from 'jlafer-node-util';
import {
  CHG_CHANNEL_STATUS, CHG_CLIENT_READY, CHG_END_COMMAND, CHG_END_PARTY, CHG_END_TEST, CHG_START_TEST, CHG_STATS,
  OP_PARTY_READY, OP_COMMAND, OP_CHANNEL_STATUS, OP_PROGRESS, OP_PARTY_STATS, OP_TEST_STATUS, OP_END,
  PARTY_STATUS_PENDING, PARTY_STATUS_READY, PARTY_STATUS_ENDED,
  TEST_STATUS_PENDING, TEST_STATUS_STARTED, TEST_STATUS_ENDED,
  generateSyncToken, getSyncClient, setSyncMapItem, subscribeToSyncMap,
  getParty, terminateProcess
} from 'flex-test-lib';
import {findObjByKeyVal, replaceObjByKey} from 'jlafer-lib';

import logger from './logUtil';
import {

} from './constants';
import {verifyAndFillDefaults} from './commands';
import {
  getCmdPartiesReducer, addOtherDefaults
} from './helpers';

const log = logger.getInstance();
let sendMsgToParties;

const runFn = R.curry((config, files, args) => {
  prepareTestCommands(files, args)
    .then(globalData => executeTest(config, globalData))
    .then(globalData => outputTestResults(args, globalData))
    .catch(log.error);
});

async function prepareTestCommands(files, args) {
  const {indir, tests} = args;
  const globalData = {results: []};
  // TODO support all files in array
  const testSuite = await readJsonFile(`${indir}/${files[0]}`);
  const selectedTests = (tests)
    ? getUserSelectedTests(testSuite, tests)
    : testSuite;
  if ( R.isEmpty(selectedTests) )
    throw new Error('no commands specified; --tests correctly formatted?');
  const valid = verifyAndFillDefaults(selectedTests);
  if (!valid)
    throw new Error('validation of test commands failed');
  globalData.testSuite = addOtherDefaults(selectedTests);
  log.info('prepareTestCommands: testSuite:', {testSuite: globalData.testSuite});
  return globalData;
}

function executeTest(config, globalData) {
  const tokenResponse = generateSyncToken(config, 'ixngen');
  globalData.syncClient = getSyncClient({token: tokenResponse.token});
  subscribeToSyncMap({
    client: globalData.syncClient,
    id: 'TestSteps',
    mapCallback: readyTheTest(globalData),
    itemCallback: syncMapUpdated(globalData),
  });
  return globalData;
}

function outputTestResults(_args, globalData) {
  const {results} = globalData;
  /* const {outdir} = args;
  const fd = await openFile(`${outdir}/ixngen-out.txt`, 'w');
  results.forEach(async test => {
    await writeToFile(fd, `${test}\n`);
  }); */
}

const readyTheTest = R.curry((globalData, syncMap) => {
  globalData.syncMap = syncMap;
  sendMsgToParties = mkSendMsgToParties({syncMap, ttl: 300})
  const data = {
    op: OP_TEST_STATUS, testStatus: TEST_STATUS_PENDING, source: 'ixngen'
  };
  sendMsgToParties(data);
  initializeTestState(globalData);
});

const syncMapUpdated = R.curry((globalData, _map, args) => {
  const {item, isLocal} = args;
  // ignore the messages this client sends or forwards
  if (isLocal)
    return;
  // NOTE: 'descriptor' is not documented; perhaps this is bcos i'm using
  // the JS client SDK in Node.js, which may not be fully supported
  const {key, data} = item.descriptor;
  if (data.source === 'ixngen')
    return;
  processSyncMsgFromClient(globalData, key, data);
});

const processSyncMsgFromClient = async (globalData, key, update) => {
  const {testSuite, state} = globalData;
  const change = getChangeToState(testSuite, state, key, update);
  globalData.state = {...globalData.state, ...change.data};
  respondToClientMsg(globalData, change);
  if (globalData.state.testStatus === TEST_STATUS_ENDED) {
    globalData.syncMap.close();
    //TODO write out stats in CSV for easy comparison with Insights
    log.info('STATS:', {stats: globalData.state.stats});
    terminateProcess('test completed', 0);
  }
};

const getChangeToState = (testSuite, state, key, update) => {
  const {op} = update;
  switch (op) {
    case OP_PARTY_READY:
      return getStateChangeFromClientReady(testSuite, state, key, update);
    case OP_CHANNEL_STATUS:
      return getStateChangeFromChannelStatus(state, key, update);
    case OP_PROGRESS:
      return getStateChangeFromProgress(testSuite, state, key, update);
    case OP_END:
      return {...state, testStatus: TEST_STATUS_ENDED};
    case OP_PARTY_STATS:
      return getStateChangeFromStats(state.stats, key, update);
    default:
      return state;
  }
};

const respondToClientMsg = (globalData, change) => {
  const {state, syncMap} = globalData;
  const {key, data} = getResponseToClientMsg(state, change);
  if (!! key)
    sendMsgToParties(data);
  };

const getStateChangeFromClientReady = (testSuite, state, key, update) => {
  const party = {
    ...getParty(key, state.parties),
    status: PARTY_STATUS_READY,
    workerSid: update.workerSid
  };
  const parties = replaceParty(state.parties, party);
  const partiesAllReady = allPartiesReady(parties);
  if (partiesAllReady) {
    const command = testSuite[0];
    const cmdParties = makeReadyCmdParties(command.parties);
    return {
      type: CHG_START_TEST,
      command,
      data: {
        parties,
        testStatus: TEST_STATUS_STARTED,
        cmdIdx: 0,
        cmdParties
      }
    };
  }
  else
    return {
      type: CHG_CLIENT_READY,
      party,
      data: {parties}
    };
};

const getStateChangeFromProgress = (testSuite, state, key, update) => {
  const party = {...getParty(key, state.cmdParties), status: PARTY_STATUS_ENDED};
  let cmdParties = replaceParty(state.cmdParties, party);
  if (! allPartiesDone(cmdParties))
    return {
      type: CHG_END_PARTY,
      party,
      data: {cmdParties}
    };
  log.info(`completed command: ${testSuite[state.cmdIdx].id}`);
  const cmdIdx = state.cmdIdx + 1;
  const testStatus =
    (cmdIdx == testSuite.length) ? TEST_STATUS_ENDED : TEST_STATUS_STARTED;
  if (testStatus === TEST_STATUS_STARTED) {
    const command = testSuite[cmdIdx];
    cmdParties = makeReadyCmdParties(command.parties);
    return {
      type: CHG_END_COMMAND,
      command,
      data: {cmdParties, cmdIdx}
    };
  }
  else
    return {
      type: CHG_END_TEST,
      data: {cmdParties, testStatus}
    };
};

const getStateChangeFromChannelStatus = (state, key, update) => {
  const {source, channel, status} = update;
  const channelStatuses = {...state.channelStatuses, [channel]: status};
  const party = {...getParty(key, state.cmdParties), channelStatuses};
  const cmdParties = replaceParty(state.cmdParties, party);
  return {
    type: CHG_CHANNEL_STATUS,
    channelStatus: {source, channel, status},
    data: {cmdParties}
  };
};

const getStateChangeFromStats = (stateStats, key, update) => {
  const {command, stats, endTime} = update;
  const stat = {command, party: key, stats, endTime};
  return {
    type: CHG_STATS,
    data: {stats: [...stateStats, stat]}
  };
};

/**
 NOTE: 'state' has already been updated by changes driving this response
   so be careful when using it in this function
*/
const getResponseToClientMsg = (state, change) => {
  const {parties} = state;
  const {type, data, command, channelStatus} = change;
  switch (type) {
    case CHG_START_TEST:
      return {
        key: 'all',
        data: {
          op: OP_TEST_STATUS,
          source: 'ixngen',
          testStatus: TEST_STATUS_STARTED,
          command,
          parties
        }
      };
    case CHG_END_TEST:
      return {
        key: 'all',
        data: {
          op: OP_TEST_STATUS,
          source: 'ixngen',
          testStatus: TEST_STATUS_ENDED
        }
      };
    case CHG_END_COMMAND:
      return {
        key: 'all',
        data: {
          op: OP_COMMAND,
          source: 'ixngen',
          command,
          parties
        }
      };
    case CHG_CHANNEL_STATUS:
    case CHG_CLIENT_READY:
    case CHG_END_PARTY:
    case CHG_STATS:
      return {};
    default:
      log.warn(`applyChangeToState: unexpected type: ${type}`);
      return {};
  }
};

const initializeTestState = (globalData) => {
  const partyIds = globalData.testSuite.reduce(getCmdPartiesReducer, []);
  const parties = partyIds.map((identity) => ({
    identity,
    status: PARTY_STATUS_PENDING,
    workerSid: null
  }));
  globalData.state = {
    testStatus: TEST_STATUS_PENDING,
    cmdIdx: -1,
    parties,
    stats: []
  };
};

const replaceParty = replaceObjByKey('identity');

const allPartiesReady = (parties) => R.all(
  party => (party.status === PARTY_STATUS_READY),
  parties
);

const allPartiesDone = (parties) => R.all(
  party => (party.status === PARTY_STATUS_ENDED),
  parties
);

const makeReadyCmdParties = (cmdParties) =>
  R.map(R.prop('identity'), cmdParties)
    .map(identity => ({identity, status: PARTY_STATUS_READY}))

function getUserSelectedTests(testSuite, tests) {
  const testIds = tests.split(',');
  return testSuite.filter(test => testIds.includes(test.id));
}

const mkSendMsgToParties = ({syncMap, ttl}) =>
  (data) => {
    setSyncMapItem(syncMap, 'all', data, ttl);
  };

export default runFn;