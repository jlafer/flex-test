import * as R from 'ramda';
import {log} from 'jlafer-flex-util';
import {
  ACTION_ACCEPT, ACTION_ACTIVITY, ACTION_ATTACH, ACTION_COMPLETE,
  ACTION_HOLD, ACTION_RELEASE, ACTION_TRANSFER, ACTION_UNHOLD,
} from 'flex-test-lib';
import {getSteps, getTargetSid, sendProgress, delayedPromise,
    addTestDataToTaskConversations}
from '../helpers';

export const MY_STORE_SET = 'MY_STORE_SET';
export const WORKER_SET = 'WORKER_SET';
export const SYNCMAP_SET = 'SYNCMAP_SET';
export const SET_AGENT_NAME = 'SET_AGENT_NAME';
export const TEST_STATUS_CHANGE = 'TEST_STATUS_CHANGE';
export const COMMAND_STARTED = 'COMMAND_STARTED';
export const ADVANCE_STEP = 'ADVANCE_STEP';
export const COMMAND_COMPLETED = 'COMMAND_COMPLETED';
export const DO_STEP = 'DO_STEP';
export const TASK_OFFERED = 'TASK_OFFERED';
export const ACCEPT_TASK = 'ACCEPT_TASK';
export const START_HOLD = 'START_HOLD';
export const END_HOLD = 'END_HOLD';
export const END_TASK = 'END_TASK';
export const COMPLETE_TASK = 'COMPLETE_TASK';
export const TRANSFER_TASK = 'TRANSFER_TASK';
export const CANCEL_TRANSFER = 'CANCEL_TRANSFER';
export const TRANSFER_STARTED = 'TRANSFER_STARTED';
export const CONSULT_STARTED = 'CONSULT_STARTED';
export const CONFERENCE_STARTED = 'CONFERENCE_STARTED';
export const CONFERENCE_ENDED = 'CONFERENCE_ENDED';

export const commandStarted = (command) => {
  log.debug('commandStarted: called');
  return {type: COMMAND_STARTED, payload: {command}};
};

export const advanceToNextStep = () => {
  return {type: ADVANCE_STEP, payload: {}}
};

export const commandCompleted = () => {
  return {type: COMMAND_COMPLETED, payload: {}}
};

export function stepCompleted(flex) {
  return (dispatch, getState) => {
    const state = getState().testingData;
    log.debug('stepCompleted: state:', state);
    const {command, steps, stepIdx, agtName, syncMap} = state;
    const nextIdx = stepIdx + 1;
    const nextStep = (steps.length > nextIdx) ? steps[nextIdx] : null;
    if (nextStep) {
      log.debug('stepCompleted: there is another step; will advance to it:', nextStep)
      dispatch(advanceToNextStep());
      if (! nextStep.after) {
        log.debug('stepCompleted: it has no condition so will schedule it')
        dispatch(scheduleStep(flex, nextStep))
      }
      else
        log.debug(`stepCompleted: it has a condition (${nextStep.after}) that we will wait on`);
    }
    else {
      log.debug('stepCompleted: that was the last step')
      dispatch(commandCompleted());
      sendProgress({syncMap, agtName, cmdId: command.id, status: 'test-completed'})
    }
  };
}

// TODO make after-conditions channel specific
export const startTimers = (flex, store, source, channel, eventName) => {
  const state = store.getState().testingData;
  const {steps} = state;
  const sourceAndEvent = `${source}.${eventName}`;
  log.debug(`startTimers: looking for steps that wait on ${sourceAndEvent}: `);
  const waitingSteps = steps.filter(
    step => step.after === sourceAndEvent);
  waitingSteps.forEach(step => {
    log.debug(`startTimers: found step that will wait on ${sourceAndEvent}: `, step);
    store.dispatch(scheduleStep(flex, step))
  });
};

export function commandReceived(flex, command, agtName) {
  const steps = getSteps(command, agtName);
  log.debug('commandReceived: steps:', steps);
  return dispatch => {
    log.debug('commandReceived: dispatching commandStarted');
    dispatch(commandStarted(command));
    const firstStep = R.head(steps);
    if (! firstStep.after) {
      log.debug('commandReceived: dispatching scheduleStep');
      dispatch(scheduleStep(flex, firstStep));
    }
  };
}

export function scheduleStep(flex, step) {
  return (dispatch, getState) => {
    const state = getState().testingData;
    const delayMSecs = (step.wait || 0) * 1000;
    return delayedPromise(delayMSecs)
      .then(() => doStep(flex, state, step))
      .then(() => dispatch(stepCompleted(flex)));
  };
}

const setAgentState = (flex, activityName) => {
  log.debug('setAgentState called with activityName:', activityName);
  return flex.Actions.invokeAction('SetActivity',
    {activityName: activityName, rejectPendingReservations: true}
  )
};

const acceptTask = (flex, state) => {
  const sid = state.reservation.sid;
  log.debug(`acceptTask with sid ${sid}`);
  return flex.Actions.invokeAction('AcceptTask', {sid});
};

const attachData = (state, dataStr) => {
  if (state.reservation == null) {
    const msg = `WARNING: attachData called after task ended!`;
    log.debug(msg);
    return Promise.resolve(msg);
  }
  const task = state.reservation.task;
  log.debug(`attachData with task sid ${task.sid}`, dataStr);
  try {
    const data = JSON.parse(dataStr);
    const attributes = addTestDataToTaskConversations(task, data);
    task.setAttributes(attributes);
    return Promise.resolve({});
  }
  catch (err) {
    const msg = `WARNING: attachData failed with error`;
    log.debug(msg, err);
    return Promise.resolve(msg);
  }
};

const endTask = (flex, state) => {
  const sid = state.reservation.sid;
  log.debug(`endTask with res sid ${sid}`);
  return flex.Actions.invokeAction('HangupCall', {sid});
};

const transferCall = (flex, state, targetType, targetName, mode) => {
  const sid = state.reservation.sid;
  log.debug(`transferCall with res sid ${sid} to ${targetName}`);
  const targetSid = getTargetSid(state, targetType, targetName);
  return flex.Actions.invokeAction(
    'TransferTask',
    {sid, targetSid, options: {mode}}
  );
};

const completeTask = (flex, state) => {
  const sid = state.reservation.sid;
  log.debug(`completeTask with sid ${sid}`);
  return flex.Actions.invokeAction('CompleteTask', {sid});
};

// TODO add support for taking conference agent off hold
const holdCall = (flex, state, _party) => {
  const sid = state.reservation.sid;
  log.debug(`holdCall with sid = ${sid}`);
  return flex.Actions.invokeAction('HoldCall', {sid});
};

// TODO add support for putting conference agent on hold
const unholdCall = (flex, state, _party) => {
  const sid = state.reservation.sid;
  log.debug(`unholdCall with sid = ${sid}`);
  return flex.Actions.invokeAction('UnholdCall', {sid});
};

export function doStep(flex, state, step) {
  log.debug('doStep called with step:', step);
  switch (step.action) {
    case ACTION_ATTACH:
      return attachData(state, step.data);
    case ACTION_ACTIVITY:
      return setAgentState(flex, step.name);
    case ACTION_ACCEPT:
      return acceptTask(flex, state);
    case ACTION_HOLD:
      return holdCall(flex, state, step.party);
    case ACTION_UNHOLD:
      return unholdCall(flex, state, step.party);
    case ACTION_RELEASE:
      return endTask(flex, state);
    case ACTION_TRANSFER:
      return transferCall(flex, state, step.targetType, step.targetName, step.mode);
    case ACTION_COMPLETE:
      return completeTask(flex, state);
    default:
      const msg = `doStep: unexpected step.action: ${step.action}`;
      log.warn(msg);
      return Promise.resolve(msg);
  }
}
