import * as R from 'ramda';
import {openFile, readJsonFile, writeToFile} from 'jlafer-node-util';
import {terminateProcess} from 'flex-test-lib';

import logger from './logUtil';
const log = logger.getInstance();
import K from './constants';
import {getSyncClientAndMap, setSyncMapItem} from './sync-helpers';
import {tokenGenerator} from './token-generator';
import {verifyAndFillDefaults} from './commands';
import {getCmdPartiesReducer, addManualDefaults} from './helpers';

const replaceArrItem = R.curry((key, arr, item) =>
  arr.map(obj => (obj[key] === item[key]) ? item : obj)
);
const replaceParty = replaceArrItem('identity');

const getParty = (parties, key) => parties.find(party => party.identity === key);

const allPartiesDone = (parties) => R.all(
  party => (party.status === K.PARTY_STATUS_ENDED),
  parties
);

// TODO make terminology consistent: start -> ready
const getChangeFromClientReady = (testSuite, state, key, update) => {
  const party = {
    ...getParty(state.parties, key),
    status: K.PARTY_STATUS_STARTED,
    workerSid: update.workerSid
  };
  log.debug('getChangeFromClientReady:', {party});
  const parties = replaceParty(state.parties, party);
  log.debug('getChangeFromClientReady:', {parties});
  const partiesAllStarted = R.all(
    party => (party.status === K.PARTY_STATUS_STARTED),
    parties
  );
  log.debug('getChangeFromClientReady:', {partiesAllStarted});
  if (partiesAllStarted) {
    const command = testSuite[0];
    const cmdParties = R.map(R.prop('identity'), command.parties)
      .map(identity => ({identity, status: K.PARTY_STATUS_STARTED}));
    return {
      type: K.CHG_START_TEST,
      command,
      data: {
        parties,
        testStatus: K.TEST_STATUS_STARTED,
        cmdIdx: 0,
        cmdParties
      }
    };
  }
  else
    return {
      type: K.CHG_CLIENT_READY,
      party,
      data: {parties}
    };
};

const getChangeFromProgress = (testSuite, state, key, update) => {
  const party = {...getParty(state.cmdParties, key), status: K.PARTY_STATUS_ENDED};
  let cmdParties = replaceParty(state.cmdParties, party);
  if (! allPartiesDone(cmdParties))
    return {
      type: K.CHG_END_PARTY,
      party,
      data: {cmdParties}
    };
  const cmdIdx = state.cmdIdx + 1;
  const testStatus =
    (cmdIdx == testSuite.length) ? K.TEST_STATUS_ENDED : K.
    TEST_STATUS_STARTED;
  if (testStatus === K.TEST_STATUS_STARTED) {
    const command = testSuite[cmdIdx];
    cmdParties = R.map(R.prop('identity'), command.parties)
      .map(identity => ({identity, status: K.PARTY_STATUS_STARTED}));
    return {
      type: K.CHG_END_COMMAND,
      command,
      data: {cmdParties, cmdIdx}
    };
  }
  else
    return {
      type: K.CHG_END_TEST,
      data: {cmdParties, testStatus}
    };
};

const getChangeFromChannelStatus = (state, key, update) => {
  const {source, channel, status} = update;
  const channelStatuses = {...state.channelStatuses, [channel]: status};
  const party = {...getParty(state.cmdParties, key), channelStatuses};
  const cmdParties = replaceParty(state.cmdParties, party);
  return {
    type: K.CHG_CHANNEL_STATUS,
    channelStatus: {source, channel, status},
    data: {cmdParties}
  };
};

const getChangeFromStats = (stateStats, key, update) => {
  const {command, stats, endTime} = update;
  const stat = {command, party: key, stats, endTime};
  return {
    type: K.CHG_STATS,
    data: {stats: [...stateStats, stat]}
  };
};

const getChangeToState = (testSuite, state, key, update) => {
  const {op} = update;
  switch (op) {
    case K.OP_START:
      return getChangeFromClientReady(testSuite, state, key, update);
    case K.OP_CHANNEL_STATUS:
      return getChangeFromChannelStatus(state, key, update);
    case K.OP_PROGRESS:
      return getChangeFromProgress(testSuite, state, key, update);
    case K.OP_END:
      return {...state, testStatus: K.TEST_STATUS_ENDED};
    case K.OP_STATS:
      return getChangeFromStats(state.stats, key, update);
    default:
      return state;
  }
};

/**
 NOTE: 'state' has already been updated by changes driving this response
   so be careful when using it in this function
*/
const getResponse = (state, change) => {
  const {parties} = state;
  const {type, data, command, channelStatus} = change;
  switch (type) {
    case K.CHG_START_TEST:
      return {
        key: 'all',
        data: {
          op: K.OP_STATUS,
          source: 'ixngen',
          testStatus: K.TEST_STATUS_STARTED,
          command,
          parties
        }
      };
    case K.CHG_END_COMMAND:
      return {
        key: 'all',
        data: {
          op: K.OP_COMMAND,
          source: 'ixngen',
          command,
          parties
        }
      };
    case K.CHG_END_TEST:
      return {
        key: 'all',
        data: {
          op: K.OP_STATUS,
          source: 'ixngen',
          testStatus: K.TEST_STATUS_ENDED
        }
      };
    case K.CHG_CHANNEL_STATUS:
    case K.CHG_CLIENT_READY:
    case K.CHG_END_PARTY:
    case K.CHG_STATS:
      return {};
    default:
      log.debug(`applyChangeToState: unexpected type: ${type}`);
      return {};
  }
};

const doResponse = async (initData, change) => {
  const {state, syncMap} = initData;
  const {key, data} = getResponse(state, change);
  if (! key)
    return;
  await setSyncMapItem(syncMap, key, data, 300);
};

const processUpdate = async (initData, key, update) => {
  //try {
    const {testSuite, state} = initData;
    const change = getChangeToState(testSuite, state, key, update);
    log.info('changeToState:', {change});
    initData.state = {...initData.state, ...change.data};
    log.info(`state after applying change ${change.type}:`, {state: initData.state});
    await doResponse(initData, change);
    if (initData.state.testStatus === K.TEST_STATUS_ENDED) {
      initData.syncMap.close();
      //TODO write out stats in CSV for easy comparison with Insights
      log.info('STATS:', {stats: initData.state.stats});
      terminateProcess('test completed', 0);
    }
  /*} catch (err) {
    log.error('Error in processUpdate', {err});
  }*/
};

const readyTheTest = R.curry((initData, map) => {
  initData.syncMap = map;
  const data = {
    op: K.OP_STATUS, testStatus: K.TEST_STATUS_PENDING, source: 'ixngen'
  };
  setSyncMapItem(map, 'all', data, 300);
  const partyIds = initData.testSuite.reduce(getCmdPartiesReducer, []);
  log.debug('readyTheTest:', {partyIds});
  const parties = partyIds.map((identity) => ({
    identity,
    status: K.PARTY_STATUS_PENDING,
    workerSid: null
  }));
  initData.state = {
    testStatus: K.TEST_STATUS_PENDING,
    cmdIdx: -1,
    parties,
    stats: []
  };
});

const syncMapUpdated = R.curry((initData, _map, event) => {
  //log.debug('syncMapUpdated:', {item: event.item});
  const {key, data} = event.item.descriptor;
  log.info(`syncMapUpdated: key=${key}:`, {data});
  // ignore the messages this client sends or forwards
  if (data.source === 'ixngen')
    return;
  processUpdate(initData, key, data);
});

function execute(config, initData) {
  const tokenResponse = tokenGenerator(config, 'ixngen');
  initData.syncClient = getSyncClientAndMap(
    readyTheTest(initData),
    syncMapUpdated(initData),
    tokenResponse
  );
  return initData;
}

async function init(files, args) {
  const {indir, tests} = args;
  log.debug(`init: indir=${indir}`);
  log.debug(`init: tests=${tests}`);
  const initData = {};
  initData.results = [];
  // TODO support all files in array
  const testSuite = await readJsonFile(`${indir}/${files[0]}`);
  let selectedTests;
  if (tests) {
    const testIds = tests.split(',');
    selectedTests = testSuite.filter(test => testIds.includes(test.id));
  }
  else
    selectedTests = testSuite; 
  if (selectedTests.length == 0)
    throw new Error('no commands specified; --tests correctly formatted?');
  const valid = verifyAndFillDefaults(selectedTests);
  if (!valid)
    throw new Error('validation of commands failed');
  initData.testSuite = addManualDefaults(selectedTests);
  log.debug('init: testSuite:', {testSuite: initData.testSuite});
  return initData;
}

function terminate(args, initData) {
  const {results} = initData;
  log.debug('terminate called');
  /* const {outdir} = args;
  const fd = await openFile(`${outdir}/ixngen-out.txt`, 'w');
  results.forEach(async test => {
    log.debug('writing result: ', {test});
    await writeToFile(fd, `${test}\n`);
  }); */
}

const runFn = R.curry((config, files, args) => {
  return init(files, args)
    .then(initData => execute(config, initData))
    .then(initData => terminate(args, initData))
    .catch(err => reportError(err));
});

const reportError = (err) => {
  log.error(err);
};

export default runFn;