import * as R from 'ramda';
import {openFile, readJsonFile, writeToFile} from 'jlafer-node-util';
import {
  CHG_CHANNEL_STATUS, CHG_CLIENT_READY, CHG_END_COMMAND, CHG_END_PARTY, CHG_END_TEST,
  CHG_START_TEST, CHG_STATS,
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

const runFn = R.curry((config, files, args) => {
  prepareTestCommands(files, args)
    .then(initData => executeTest(config, initData))
    .then(initData => outputTestResults(args, initData))
    .catch(log.error);
});

async function prepareTestCommands(files, args) {
  const {indir, tests} = args;
  log.debug(`prepareTestCommands: indir=${indir} tests=${tests}`);
  const initData = {results: []};
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
  initData.testSuite = addOtherDefaults(selectedTests);
  log.debug('prepareTestCommands: testSuite:', {testSuite: initData.testSuite});
  return initData;
}

function executeTest(config, initData) {
  const tokenResponse = generateSyncToken(config, 'ixngen');
  initData.syncClient = getSyncClient({token: tokenResponse.token});
  subscribeToSyncMap({
    client: initData.syncClient,
    id: 'TestSteps',
    mapCallback: readyTheTest(initData),
    itemCallback: syncMapUpdated(initData),
  });
  return initData;
}

function outputTestResults(_args, initData) {
  const {results} = initData;
  log.debug('outputTestResults: ', {results});
  /* const {outdir} = args;
  const fd = await openFile(`${outdir}/ixngen-out.txt`, 'w');
  results.forEach(async test => {
    log.debug('writing result: ', {test});
    await writeToFile(fd, `${test}\n`);
  }); */
}

const readyTheTest = R.curry((initData, map) => {
  initData.syncMap = map;
  const data = {
    op: OP_TEST_STATUS, testStatus: TEST_STATUS_PENDING, source: 'ixngen'
  };
  setSyncMapItem(map, 'all', data, 300);
  initializeTestState(initData);
});

const syncMapUpdated = R.curry((initData, _map, args) => {
  log.debug(`syncMapUpdated:`, {args});
  const {item, isLocal} = args;
  // ignore the messages this client sends or forwards
  if (isLocal)
    return;
  log.debug(`syncMapUpdated:`, {item});
  // NOTE: 'descriptor' is not documented; perhaps this is bcos i'm using
  // the JS client SDK in Node.js, which may not be fully supported
  const {key, data} = item.descriptor;
  log.debug(`syncMapUpdated: key=${key}:`, {data});
  if (data.source === 'ixngen')
    return;
  processSyncMsgFromClient(initData, key, data);
});

const processSyncMsgFromClient = async (initData, key, update) => {
  const {testSuite, state} = initData;
  const change = getChangeToState(testSuite, state, key, update);
  log.info('changeToState:', {change});
  initData.state = {...initData.state, ...change.data};
  log.info(`state after applying change ${change.type}:`, {state: initData.state});
  respondToClientMsg(initData, change);
  if (initData.state.testStatus === TEST_STATUS_ENDED) {
    initData.syncMap.close();
    //TODO write out stats in CSV for easy comparison with Insights
    log.info('STATS:', {stats: initData.state.stats});
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

const respondToClientMsg = (initData, change) => {
  const {state, syncMap} = initData;
  const {key, data} = getResponseToClientMsg(state, change);
  if (!! key)
    setSyncMapItem(syncMap, key, data, 300);
};

// TODO make terminology consistent: start -> ready
const getStateChangeFromClientReady = (testSuite, state, key, update) => {
  const party = {
    ...getParty(key, state.parties),
    status: PARTY_STATUS_READY,
    workerSid: update.workerSid
  };
  log.debug('getStateChangeFromClientReady:', {party});
  const parties = replaceParty(state.parties, party);
  log.debug('getStateChangeFromClientReady:', {parties});
  const partiesAllStarted = R.all(
    party => (party.status === PARTY_STATUS_READY),
    parties
  );
  log.debug('getStateChangeFromClientReady:', {partiesAllStarted});
  if (partiesAllStarted) {
    const command = testSuite[0];
    const cmdParties = R.map(R.prop('identity'), command.parties)
      .map(identity => ({identity, status: PARTY_STATUS_READY}));
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
  const cmdIdx = state.cmdIdx + 1;
  const testStatus =
    (cmdIdx == testSuite.length) ? TEST_STATUS_ENDED : 
    TEST_STATUS_STARTED;
  if (testStatus === TEST_STATUS_STARTED) {
    const command = testSuite[cmdIdx];
    cmdParties = R.map(R.prop('identity'), command.parties)
      .map(identity => ({identity, status: PARTY_STATUS_READY}));
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
    case CHG_END_TEST:
      return {
        key: 'all',
        data: {
          op: OP_TEST_STATUS,
          source: 'ixngen',
          testStatus: TEST_STATUS_ENDED
        }
      };
    case CHG_CHANNEL_STATUS:
    case CHG_CLIENT_READY:
    case CHG_END_PARTY:
    case CHG_STATS:
      return {};
    default:
      log.debug(`applyChangeToState: unexpected type: ${type}`);
      return {};
  }
};

const initializeTestState = (initData) => {
  const partyIds = initData.testSuite.reduce(getCmdPartiesReducer, []);
  log.debug('readyTheTest:', {partyIds});
  const parties = partyIds.map((identity) => ({
    identity,
    status: PARTY_STATUS_PENDING,
    workerSid: null
  }));
  initData.state = {
    testStatus: TEST_STATUS_PENDING,
    cmdIdx: -1,
    parties,
    stats: []
  };
};

const replaceParty = replaceObjByKey('identity');

const allPartiesDone = (parties) => R.all(
  party => (party.status === PARTY_STATUS_ENDED),
  parties
);

function getUserSelectedTests(testSuite, tests) {
  const testIds = tests.split(',');
  return testSuite.filter(test => testIds.includes(test.id));
}

export default runFn;