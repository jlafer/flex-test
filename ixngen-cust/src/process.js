import * as R from 'ramda';
import {
  ACTION_DIAL, ACTION_RELEASE, ACTION_TWIML, OP_PARTY_READY, OP_COMMAND,
  OP_CHANNEL_STATUS, OP_PROGRESS, OP_TEST_STATUS,
  CMD_STATUS_STARTED, CMD_STATUS_ENDED, TEST_STATUS_STARTED, TEST_STATUS_ENDED,
  STEP_STATUS_READY, STEP_STATUS_STARTED, STEP_STATUS_ENDED,
  getParty, sendChannelStatus, setSyncMapItem, terminateProcess
} from 'flex-test-lib';

import logger from './logUtil';
const log = logger.getInstance();

import { delayedPromise } from './helpers';
import {dial, release} from './voice';

export const syncMapUpdated = R.curry((state, _map, args) => {
  const {context} = state;
  const {agtName} = context;
  const {item, isLocal} = args;
  // ignore the messages this client sends
  if (isLocal)
    return;
  const {key, data} = item.descriptor;
  // ignore the messages not intended for this client
  if (! ['all', agtName].includes(key) )
    return;
  processSyncMsgFromOtherParty(state, data);
});

export const startTest = R.curry((state, map) => {
  const {context} = state;
  const {agtName} = context;
  context.syncMap = map;
  const data = {source: agtName, op: OP_PARTY_READY, startTime: new Date()};
  return setSyncMapItem(map, agtName, data, 300);
});

export const callStatusUpdate = (state, update) => {
  if (cmdComplete(state)) {
    return;
  }
  const step = state.steps[state.stepIdx];
  switch (step.action) {
    case ACTION_DIAL:
      dialStatusUpdate(state, update);
      break;
    case ACTION_RELEASE:
      releaseStatusUpdate(state, update);
      break;
    default:
      break;
  }

  if (stepComplete(state)) {
    const nextIdx = state.stepIdx + 1;
    const nextStep = (state.steps.length > nextIdx) ? state.steps[nextIdx] : null;
    if (nextStep) {
      state.stepIdx = nextIdx;
      state.stepStatus = STEP_STATUS_READY;
      if (! nextStep.after) {
        execNextStep(state);
      }
    }
    else {
      sendCmdCompleted(state);
      state.cmdStatus = CMD_STATUS_ENDED;
    }
  }
}

const processSyncMsgFromOtherParty = (state, data) => {
  const {source, op, command, step, channel, status, testStatus} = data;
  switch (op) {
    case OP_COMMAND:
      processCommand(state, command);
      break;
    case OP_TEST_STATUS:
      if (testStatus === TEST_STATUS_STARTED)
        processCommand(state, command);
      // TODO i don't think we're getting this msg from ixngen
      if (testStatus === TEST_STATUS_ENDED)
        terminateProcess('test completed', 0);
      break;
    case OP_CHANNEL_STATUS:
      processChannelStatus(state, source, channel, status);
      break;
    default:
      log.warn(`processSyncMsgFromOtherParty: unexpected op received: ${op}?`);
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
    op: OP_PROGRESS,
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
    case ACTION_DIAL:
      const {to, from, twiml} = step;
      dial(
        {client, from, to, twiml, statusCallback: `https://${host}/callstatus`}
      )
      .then(call => {
        state.callSid = call.sid;
      });
      return;
    case ACTION_TWIML:
      log.warn(`execStep: TwiML support not yet implemented!`);
      return;
    case ACTION_RELEASE:
      release({client, callSid})
      .then(() => log.debug(`execStep: initiated release of call ${callSid}`))
      return;
    default:
      log.warn(`execStep: unexpected action??`);
  }
};

const execNextStep = (state) => {
  if (state.stepStatus === STEP_STATUS_READY)
    state.stepStatus = STEP_STATUS_STARTED;
  const step = state.steps[state.stepIdx];
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
      state.stepStatus = STEP_STATUS_ENDED;
      break;
    default:
      break;
  }
};

const releaseStatusUpdate = (state, update) => {
  switch (update.status) {
    case 'completed':
      state.stepStatus = STEP_STATUS_ENDED;
      startTimers(state, 'cust', 'voice', 'ended');
      break;
    default:
      break;
  }
};

const stepComplete = (state) => state.stepStatus === STEP_STATUS_ENDED;
const cmdComplete = (state) => state.cmdStatus === CMD_STATUS_ENDED;

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

// WARNING: impure: mutates state! I did this since Express callback is passed state
// and I don't know how to pass it the latest copy of state
const setCmdInState = (state, command) => {
  const {context} = state;
  const steps = getSteps(context.agtName, command);
  state.command = command;
  state.steps = steps;
  state.stepIdx = 0;
  state.stepStatus = STEP_STATUS_READY;
  state.cmdStatus = CMD_STATUS_STARTED;
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
    scheduleStep(state, step);
  });
};

const processChannelStatus = (state, source, channel, status) => {
  startTimers(state, source, channel, status);
};
