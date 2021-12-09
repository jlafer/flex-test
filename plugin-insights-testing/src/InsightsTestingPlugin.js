import React from 'react';
import { VERSION } from '@twilio/flex-ui';
import { FlexPlugin } from 'flex-plugin';
import * as R from 'ramda';
import {log, getSyncClientAndMap} from 'jlafer-flex-util';
import * as K from './constants';
import reducer, {namespace} from './reducers/flexStoreReducer';
import TestingDataForm from './components/TestingDataForm';
import configureStore from "./store/store";
import {getSteps, addTestDataToTaskConversations,
    calcPartyStats, sendPartyStats, sendChannelStatus}
  from './helpers';
import {getSyncToken} from './sync-helpers';
import * as A from './actions';

const PLUGIN_NAME = 'InsightsTestingPlugin';
log.setName(PLUGIN_NAME);
// TODO can this be configurable?
log.setLevel('debug');

const updateTaskConversations = (task, data) => {
  return new Promise((resolve, reject) => {
    const attributes = addTestDataToTaskConversations(task, data);
    log.debug('updateTaskConversations: attributes', attributes);
    task.setAttributes(attributes);
    resolve(`task attributes updated`);
  });
};

// mutates payload.task
const savePartyData = (myStore, task, result, completeTS) => {
  const state = myStore.getState().testingData;
  const {syncMap, agtName, command} = state;
  const endData = {result, completeTS};

  const stats = calcPartyStats(state, endData);
  //log.debug('savePartyData: stats', stats);
  sendPartyStats({syncMap, agtName, cmdId: command.id, stats});
  const testNameAttribute = `conversation_attribute_${R.last(agtName)}`;
  updateTaskConversations(task, {[testNameAttribute]: command.id});
};

export const startTimersAndTellIxngen = (flex, myStore, channel, status) => {
  const state = myStore.getState().testingData;
  const {syncMap, agtName} = state;

  A.startTimers(flex, myStore, agtName, channel, status);
  sendChannelStatus({syncMap, agtName, channel, status});
};

const onReservationCreated = R.curry((flex, manager, myStore, reservation) => {
  //log.debug('onReservationCreated: reservation', reservation);
  myStore.dispatch({
    type: A.TASK_OFFERED,
    payload: {
      reservation,
      ts: new Date()
    }
  });
  reservation.on("wrapup", onReservationWrapup(flex, myStore));
  reservation.on("completed", onReservationCompleted(flex, manager, myStore));
  const channel = reservation.task.taskChannelUniqueName;
  startTimersAndTellIxngen(flex, myStore, channel, 'alerted')
});

const onReservationCanceled = R.curry((flex, manager, myStore, reservation) => {
  const channel = reservation.task.taskChannelUniqueName;

  startTimersAndTellIxngen(flex, myStore, channel, 'canceled')
  savePartyData(myStore, reservation.task, 'canceled', new Date());
});

const onReservationRescinded = R.curry((flex, manager, myStore, reservation) => {
  const channel = reservation.task.taskChannelUniqueName;

  startTimersAndTellIxngen(flex, myStore, channel, 'rescinded')
  savePartyData(myStore, reservation.task, 'rescinded', new Date());
});

const onReservationWrapup = R.curry((flex, myStore, reservation) => {
  //log.debug('onReservationWrapup called')
  const ts = new Date();
  myStore.dispatch({type: A.END_HOLD, payload: {ts}});
  myStore.dispatch({type: A.END_TASK, payload: {ts}});
  const channel = reservation.task.taskChannelUniqueName;
  startTimersAndTellIxngen(flex, myStore, channel, 'ended')
});

const onReservationCompleted = R.curry((flex, manager, myStore, reservation) => {
  //log.debug('onReservationCompleted called')
  savePartyData(myStore, reservation.task, 'handled', new Date());
  myStore.dispatch({type: A.COMPLETE_TASK, payload: {}});
  manager.store.dispatch({type: A.COMPLETE_TASK, payload: {}});
  const channel = reservation.task.taskChannelUniqueName;
  startTimersAndTellIxngen(flex, myStore, channel, 'completed')
});

const beforeRejectTask = R.curry((flex, manager, myStore, payload) => {
  const channel = payload.task.taskChannelUniqueName;

  startTimersAndTellIxngen(flex, myStore, channel, 'rejected')
  savePartyData(myStore, payload.task, 'rejected', new Date());
});

const afterAcceptTask = R.curry((flex, myStore, payload) => {
  //const now = new Date();
  //log.debug(`afterAcceptTask: at:`, now);
  //log.debug('afterAcceptTask: conference:', payload.task.conference);
  myStore.dispatch({type: A.ACCEPT_TASK, payload: {acceptTS: new Date()}});
  const channel = payload.task.taskChannelUniqueName;
  startTimersAndTellIxngen(flex, myStore, channel, 'accepted');
});

const beforeHoldCall = R.curry((flex, myStore, payload, _abortFn) => {
  myStore.dispatch({type: A.START_HOLD, payload: {ts: new Date()}});
  const channel = payload.task.taskChannelUniqueName;
  startTimersAndTellIxngen(flex, myStore, channel, 'held')
});

const beforeUnholdCall = R.curry((flex, myStore, payload, _abortFn) => {
  myStore.dispatch({type: A.END_HOLD, payload: {ts: new Date()}});
  const channel = payload.task.taskChannelUniqueName;
  startTimersAndTellIxngen(flex, myStore, channel, 'retrieved')
});

const beforeTransferTask = R.curry((flex, myStore, _payload) => {
  //const now = new Date();
  //log.debug(`beforeTransferTask: at:`, now);
});

const afterTransferTask = R.curry((flex, myStore, _payload) => {
  //const now = new Date();
  //log.debug(`afterTransferTask: at:`, now);
  //log.debug('afterTransferTask: conference:', _payload.task.conference);
  /* const agtParticipant = _payload.task.conference.participants.find(
    p => p.participantType() === 'worker'
  ); */
  myStore.dispatch({type: A.TRANSFER_TASK, payload: {}});
  //A.startTimers(flex, myStore, myStore.getState().agtName, 'voice', 'transfer-started');
});

const beforeCancelTransfer = R.curry((flex, myStore, payload) => {
  myStore.dispatch({type: A.CANCEL_TRANSFER, payload: {}});
  const channel = payload.task.taskChannelUniqueName;
  startTimersAndTellIxngen(flex, myStore, channel, 'transfer-canceled')
});

const processEvent = (flex, myStore, source, channel, status) => {
  A.startTimers(flex, myStore, source, channel, status);
};

const processCommand = (flex, manager, myStore, state, command) => {
  const {agtName} = state;

  const steps = getSteps(command, agtName);
  // if we're not a party to this command, ignore it
  if (steps == null)
    return;
  log.debug(`RECEIVED COMMAND: ${command.id}`);
  manager.store.dispatch({type: A.COMMAND_STARTED, payload: {}});
  //log.debug(`${agtName} dispatched COMMAND_STARTED`);
  myStore.dispatch(A.commandReceived(flex, command, agtName));
};

const syncMapUpdated = R.curry((flex, manager, myStore, event) => {
  const {key, data} = event.item.descriptor;
  log.debug(`------------------------------syncMapUpdated: key=${key}, data:`, data);
  const state = myStore.getState().testingData;
  const {agtName} = state;

  // ignore the messages not intended for this client
  if (! ['all', agtName].includes(key) )
    return;
  const {source, op, command, testStatus, parties, channel, status} = data;
  // ignore the messages this client sends
  if (source === agtName)
    return;
  switch (op) {
    case K.OP_COMMAND:
      processCommand(flex, manager, myStore, state, command);
      break;
    case K.OP_CHANNEL_STATUS:
      processEvent(flex, myStore, source, channel, status);
      break;
    case K.OP_STATUS:
      //log.debug('INFO: op: testStatus received');
      myStore.dispatch({type: A.TEST_STATUS_CHANGE, payload: {testStatus, parties}});
      if (testStatus === K.TEST_STATUS_STARTED)
        processCommand(flex, manager, myStore, state, command);
      break;
    default:
      log.warn(`syncMapUpdated: unexpected op received: ${op}?`);
  }
});

const syncMapSet = R.curry((myStore, map) => {
  //log.debug('getSyncClientAndMap: opened map:', map.sid);
  myStore.dispatch({type: A.SYNCMAP_SET, payload: {syncMap: map}});
  map.get('all')
  .then(item => {
    const {key, data} = item.descriptor;
    log.debug(`initial syncmap item.data with key=all:`, data);
    myStore.dispatch({type: A.TEST_STATUS_CHANGE, payload: {testStatus: data.testStatus}});
  });
});

export default class InsightsTestingPlugin extends FlexPlugin {

  constructor() {
    super(PLUGIN_NAME);
  }

  init(flex, manager) {
    log.info(`------------${PLUGIN_NAME}.init: Flex client running version ${VERSION}`);
    manager.store.addReducer(namespace, reducer);
    const myStore = configureStore();
    const flexState = manager.store.getState().flex;
    manager.store.dispatch({
      type: A.MY_STORE_SET,
      payload: {myStore, flex}
    });
    const worker = flexState.worker.source;
    myStore.dispatch({
      type: A.WORKER_SET,
      payload: {worker}}
    );

    flex.CRMContainer.Content.replace(<TestingDataForm store={myStore} key="test-data"/>);

    manager.workerClient.on(
      "reservationCreated", // validated
      onReservationCreated(flex, manager, myStore)
    );
    flex.Actions.addListener(
      "afterAcceptTask",
      afterAcceptTask(flex, myStore)
    );
    flex.Actions.addListener(
      "beforeRejectTask",
      beforeRejectTask(flex, manager, myStore)
    );
    flex.Actions.addListener(
      "beforeHoldCall",
      beforeHoldCall(flex, myStore)
    );
    flex.Actions.addListener(
      "beforeUnholdCall",
      beforeUnholdCall(flex, myStore)
    );
    flex.Actions.addListener(
      "beforeTransferTask",
      beforeTransferTask(flex, myStore)
    );
    flex.Actions.addListener(
      "afterTransferTask",
      afterTransferTask(flex, myStore)
    );
    flex.Actions.addListener(
      "beforeCancelTransfer",
      beforeCancelTransfer(flex, myStore)
    );

    const {REACT_APP_SERVICE_BASE_URL} = process.env;
    const syncTokenFunctionUrl = `${REACT_APP_SERVICE_BASE_URL}/GetSyncToken`;
    log.debug(`------------${PLUGIN_NAME}.init: syncTokenFunctionUrl=${syncTokenFunctionUrl}`);

    getSyncToken(syncTokenFunctionUrl, manager, worker.sid)
    .then(tokenResponse => getSyncClientAndMap(
      syncMapSet(myStore),
      syncMapUpdated(flex, manager, myStore),
      'TestSteps',
      tokenResponse.token
    ))
    .catch(err => {
      log.error(`init: ERROR caught:`, err);
    });
  }
}
