import * as R from 'ramda';

import {
  ACTION_DIAL, ACTION_RELEASE, OP_PROGRESS, CMD_STATUS_ENDED,
  STEP_STATUS_READY, STEP_STATUS_ENDED,
  sendChannelStatus, setSyncMapItem
} from 'flex-test-lib';
import {execNextStep, startTimers} from './process';

export const callStatusHandler = R.curry((state, req, res) => {
  const {CallSid, CallStatus} = req.body;
  //log.debug(`statusCallback: received ${CallStatus} for call ${CallSid}`);
  switch (CallStatus) {
    case 'initiated':
    case 'ringing':
    case 'answered':
    case 'in-progress':
    case 'completed':
      const update = {status: CallStatus};
      callStatusUpdate(state, update)
      break;
    default:
      log.warn(`statusCallback: ignoring CallStatus ${CallStatus}`);
  };
  res.status(204);
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

const stepComplete = (state) => state.stepStatus === STEP_STATUS_ENDED;
const cmdComplete = (state) => state.cmdStatus === CMD_STATUS_ENDED;
