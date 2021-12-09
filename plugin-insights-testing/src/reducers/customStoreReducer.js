/*
  This is a reducer for a custom Redux store - separate from the Flex store.
  This is necessary as of Flex 1.19 because we need to use Redux middleware
  that supports chaining of asynchronous actions and the promise middleware
  used by Flex does not support chaining.

  The custom store is added in the plugin init method.
*/
import {log} from 'jlafer-flex-util';
import {getSteps, updateHoldDur} from '../helpers';
import * as A from '../actions';
import * as K from '../constants';

const initialState = {
  testStatus: K.TEST_STATUS_NOTREADY,
  parties: [],
  worker: null,
  syncMap: null,
  agtName: '',
  activityTS: 0,
  command: [],
  cmdStatus: 'inactive',
  steps: [],
  stepIdx: -1,
  reservation: null,
  result: null,
  offerTS: 0,
  acceptTS: 0,
  holdTS: null,
  endTS: 0,
  waitDur: 0,
  holdDur: 0,
  xferred: false
};

export function reduce(state = initialState, action) {
  if (!action) {
    log.debug('myReducer: action null???');
    return state;
  }
  //log.debug(`myReducer: ${action.type}`);
  if (!action.payload) {
    log.debug('myReducer: skipping action without payload', action.type);
    return state;
  }
  //log.debug('myReducer: processing action:', action);
  const {
    agtName, ts, acceptTS, command, testStatus, parties, syncMap,
    reservation
  } = action.payload;
  switch (action.type) {
    case A.COMMAND_STARTED:
      const steps = getSteps(command, state.agtName);
      const newState = {...state, cmdStatus: 'active', command, steps, stepIdx: 0};
      //log.debug('myReducer.COMMAND_STARTED: returning newState', newState);
      return newState;
    case A.ADVANCE_STEP:
      return {...state, stepIdx: (state.stepIdx + 1)};
    case A.COMMAND_COMPLETED:
      return {...state, cmdStatus: 'inactive'};
    case A.TASK_OFFERED:
      return {...state, reservation, offerTS: ts};
    case A.ACCEPT_TASK:
      return {...state, acceptTS};
    case A.START_HOLD:
      return {...state, holdTS: ts};
    case A.END_HOLD:
      return updateHoldDur(state, ts);
    case A.END_TASK:
      return {...state, endTS: ts};
    case A.COMPLETE_TASK:
      return {...state, reservation: null};
    case A.TRANSFER_STARTED:
      return {...state, xferred: true};
    case A.CANCEL_TRANSFER:
      return {...state, xferred: false};
    case A.SET_AGENT_NAME:
      return {...state, agtName};
    case A.SYNCMAP_SET:
      return {...state, syncMap};
    case A.TEST_STATUS_CHANGE:
      // NOTE: this only gets called for: not-ready -> ready and ready -> ended
      // mid-test, the testStatus == ready
      //log.debug('myReducer: TEST_STATUS_CHANGE:', testStatus);
      return {...state, testStatus, parties};
    case A.WORKER_SET:
      return {...state, worker: action.payload.worker};
    default:
      return state;
  }
};
