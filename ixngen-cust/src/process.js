import * as R from 'ramda';
import {
  getParty, sendChannelStatus, setSyncMapItem, terminateProcess
} from 'flex-test-lib';

import logger from './logUtil';
const log = logger.getInstance();

import K from './constants';
import { delayedPromise } from './helpers';
import {dial, release} from './voice';

export const syncMapUpdated = R.curry((state, _map, args) => {
  const {context} = state;
  const {agtName} = context;
  log.debug(`syncMapUpdated:`, {args});
  const {item, isLocal} = args;
  log.debug(`syncMapUpdated:`, {item});
  // ignore the messages this client sends
  if (isLocal)
    return;
  const {key, data} = item.descriptor;
  log.debug(`syncMapUpdated: key=${key}`, {data});
  // ignore the messages not intended for this client
  if (! ['all', agtName].includes(key) )
    return;
  processSyncMsgFromOtherParty(state, data);
});

export const startTest = R.curry((state, map) => {
  const {context} = state;
  const {agtName} = context;
  context.syncMap = map;
  const data = {source: agtName, op: K.OP_START, startTime: new Date()};
  return setSyncMapItem(map, agtName, data, 300);
});

export const stepUpdate = (state, update) => {
  if (cmdComplete(state)) {
    log.debug(`stepUpdate: ignoring update because command is complete`);
    return;
  }
  const step = state.steps[state.stepIdx];
  log.debug(`stepUpdate: received status ${update.status} for`, {step});
  switch (step.action) {
    case K.ACTION_DIAL:
      dialStatusUpdate(state, update);
      break;
    case K.ACTION_RELEASE:
      releaseStatusUpdate(state, update);
      break;
    default:
      break;
  }

  if (stepComplete(state)) {
    log.debug('stepUpdate: step is complete');
    const nextIdx = state.stepIdx + 1;
    const nextStep = (state.steps.length > nextIdx) ? state.steps[nextIdx] : null;
    if (nextStep) {
      state.stepIdx = nextIdx;
      state.stepStatus = K.STEP_STATUS_READY;
      if (! nextStep.after) {
        log.debug('stepUpdate: it has no condition so will execute it')
        execNextStep(state);
      }
      else
        log.debug(`stepUpdate: it has a condition (${nextStep.after}) that we will wait on`);
    }
    else {
      sendCmdCompleted(state);
      state.cmdStatus = K.CMD_STATUS_ENDED;
    }
  }
}

const processSyncMsgFromOtherParty = (state, data) => {
  const {source, op, command, step, channel, status, testStatus} = data;
  switch (op) {
    case K.OP_COMMAND:
      processCommand(state, command);
      break;
    case K.OP_STATUS:
      log.debug(`op: status ${testStatus} received`);
      if (testStatus === K.TEST_STATUS_STARTED)
        processCommand(state, command);
      if (testStatus === K.TEST_STATUS_ENDED)
        terminateProcess('test completed', 0);
      break;
    case K.OP_CHANNEL_STATUS:
      processChannelStatus(state, source, channel, status);
      break;
    default:
      log.debug(`processSyncMsgFromOtherParty: unexpected op received: ${op}?`);
  }
}

const getSteps = (agtName, command) => {
  const party = getParty(agtName, command.parties);
  return (party) ? party.steps : null;
};

const sendCmdCompleted = (state) => {
  const {context, command, stepIdx} = state;
  const {syncMap, agtName} = context;
  const data = {
    source: agtName,
    op: K.OP_PROGRESS,
    command: command.id,
    status: 'test-completed',
    endTime: new Date()
  };
  return setSyncMapItem(syncMap, agtName, data, 300);
};

const execStep = (state) => {
  const {context, callSid, command, steps, stepIdx} = state;
  const {client, host} = context;
  const step = steps[stepIdx];
  switch (step.action) {
    case K.ACTION_DIAL:
      const {to, from, twiml} = step;
      dial(
        {client, from, to, twiml, statusCallback: `https://${host}/callstatus`}
      )
      .then(call => {
        state.callSid = call.sid;
      });
      return;
    case K.ACTION_TWIML:
      log.debug(`execStep: TWIML faked`);
      return;
    case K.ACTION_RELEASE:
      release({client, callSid})
      .then(() => log.debug(`execStep: initiated release of call ${callSid}`))
      return;
    default:
      log.debug(`execStep: unexpected action??`);
  }
};

const execNextStep = (state) => {
  if (state.stepStatus === K.STEP_STATUS_READY)
    state.stepStatus = K.STEP_STATUS_STARTED;
  const step = state.steps[state.stepIdx];
  log.debug(`executing`, {step});
  delayedPromise(step.wait * 1000)
  .then(
    () => execStep(state)
  )
};

const dialStatusUpdate = (state, update) => {
  const {context} = state;
  const {agtName, syncMap} = context;
  switch (update.status) {
    case 'ringing':
      startTimers(state, 'cust', 'voice', 'dialed');
      sendChannelStatus({syncMap, agtName, channel: 'voice', status: 'dialed'});
      break;
    case 'in-progress':
      state.stepStatus = K.STEP_STATUS_ENDED;
      break;
    default:
      break;
  }
};

const releaseStatusUpdate = (state, update) => {
  switch (update.status) {
    case 'completed':
      state.stepStatus = K.STEP_STATUS_ENDED;
      startTimers(state, 'cust', 'voice', 'ended');
      break;
    default:
      break;
  }
};

const stepComplete = (state) => state.stepStatus === K.STEP_STATUS_ENDED;
const cmdComplete = (state) => state.cmdStatus === K.CMD_STATUS_ENDED;

// WARNING: impure: mutates state! I did this since Express callback is passed state
// and I don't know how to pass it the latest copy of state
const setCmdInState = (state, command) => {
  const {context} = state;
  const steps = getSteps(context.agtName, command);
  state.command = command;
  state.steps = steps;
  state.stepIdx = 0;
  state.stepStatus = K.STEP_STATUS_READY;
  state.cmdStatus = K.CMD_STATUS_STARTED;
};

const processCommand = (state, command) => {
  const {context} = state;
  const {agtName} = context;
  const party = getParty(agtName, command.parties);
  // if we're not a party to this command, ignore it
  if (party == null)
    return;
  setCmdInState(state, command);
  execNextStep(state);
};

const scheduleStep = (state, step) => {
  const delayMSecs = (step.wait || 0) * 1000;
  delayedPromise(delayMSecs)
    .then(() => execStep(state))
};

const startTimers = (state, source, channel, status) => {
  const {steps} = state;
  const sourceAndEvent = `${source}.${status}`;
  const waitingSteps = steps.filter(step => step.after === sourceAndEvent);
  waitingSteps.forEach(step => {
    log.debug(`startTimers: found step that will wait on ${sourceAndEvent}:`, step);
    scheduleStep(state, step);
  });
};

const processChannelStatus = (state, source, channel, status) => {
  startTimers(state, source, channel, status);
};
