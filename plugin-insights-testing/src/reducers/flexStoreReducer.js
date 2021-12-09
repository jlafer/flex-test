/*
  This is a custom reducer. It is added into the root reducer of the Flex store
  with a call to manager.store.addReducer in the plugin initialization method.
  
  It manages one slice of Redux state, named by the 'namespace' variable below.
  I added this to get access to the CONFERENCE_MULTIPLE_UPDATE actions from Flex.
  This enables event-driven tracking of changes to conference participants and
  their 'hold' status.
*/
import { combineReducers } from 'redux';
import * as R from 'ramda';
import {valueIsArray} from 'jlafer-fnal-util';

import {log} from 'jlafer-flex-util';
import * as A from '../actions';

// Register your redux store under a unique namespace
export const namespace = 'plugin_insights_testing';

const transferInProgress = (participants) =>
  R.any(R.propEq('participant_type', 'transfer'), participants);

const allPartiesJoined = (participants) => {
  if (participants.length < 3)
    return false;
  return R.all(
    R.both(
      R.propSatisfies(
        type => ['worker', 'customer'].includes(type),
        'participant_type'
      ),
      R.propEq('status', 'joined')
    ),
    participants
  );
};
  
const allPartiesTalking = (participants) => {
  return R.all(
    R.both(
      R.propSatisfies(
        type => ['worker', 'customer'].includes(type),
        'participant_type'
      ),
      R.propEq('hold', false)
    ),
    participants
  );
};

// TODO this condition is not reliably triggered and may not be needed anyway;
// participant_type == 'transfer' not always seen???
const transferStarted = (conference, participants) => {
  if (participants.length < 3)
    return false;
  return (! transferInProgress(conference) && transferInProgress(participants));
};

const consultStarted = (conference, participants) => {
  if (participants.length < 3)
    return false;
  return (!allPartiesJoined(conference) && allPartiesJoined(participants));
};

const conferenceStarted = (conference, participants) => {
  if (participants.length < 3)
    return false;
  return (!allPartiesTalking(conference) && allPartiesTalking(participants));
};

const toConfnceParty = (participant) => {
  const {workerSid, source} = participant;
  const {participant_type, status, hold} = source;
  return {workerSid, participant_type, status, hold};
};

const reduceConferenceUpdate = (conference, payload) => {
  const {conferences} = payload;
  log.debug('flexReducer: CONFERENCE_MULTIPLE_UPDATE: conferences:', payload.conferences);
  if (! valueIsArray(conferences))
    return {};
  // NOTE: we have to grab last conference in payload because Flex apparently
  // doesn't synchronously remove previous one(s)
  const currentConfnce = R.last(payload.conferences);
  const participants = currentConfnce.participants.map(toConfnceParty);
  log.debug('flexReducer: CONFERENCE_MULTIPLE_UPDATE: participants:', participants);
  if (transferStarted(conference, participants)) {
    return {
      action: {type: 'TRANSFER_STARTED', payload: {conference: participants}},
      state: {conference: participants},
      event: 'transfer-started'
    };
  }
  if (consultStarted(conference, participants)) {
    return {
      action: {type: 'CONSULT_STARTED', payload: {conference: participants}},
      state: {conference: participants},
      event: 'consult-started'
    };
  }
  if (conferenceStarted(conference, participants)) {
    return {
      action: {type: 'CONFERENCE_STARTED', payload: {conference: participants}},
      state: {conference: participants},
      event: 'conference-started'
    };
  }
  // TODO this test is giving false positive when cold transfer ends and
  // with transitory conditions when setting up warm transfer
  if (participants.length < conference.length && conference.length > 2)
    return {
      action: {type: 'CONFERENCE_ENDED', payload: {conference: participants}},
      state: {conference: participants},
      event: 'conference-ended'
    };
  return {};
  // worker, workerSid, source: {hold: bool, participant_type: 'worker' or 'customer', worker_sid} 
};

const notifyMyReducer = (flex, myStore, update) => {
  const {action, event} = update;
  if (action) {
    const {type, payload} = action;
    myStore.dispatch({type, payload});
    A.startTimers(flex, myStore, event);
  }
  // worker, workerSid, source: {hold: bool, participant_type: 'worker' or 'customer', worker_sid} 
};

const initialState = {
  flex: {},
  myStore: {},
  conference: []
};

const reducer = (state = initialState, action) => {
  if (!action) {
    log.debug('flexReducer: action null???');
    return state;
  }
  switch (action.type) {
    case A.MY_STORE_SET:
      return {...state, myStore: action.payload.myStore, flex: action.payload.flex};
    case 'CONFERENCE_MULTIPLE_UPDATE':
      const {payload} = action;
      log.debug('flexReducer: CONFERENCE_MULTIPLE_UPDATE: payload:', payload);
      const {flex, myStore, conference} = state;
      
      const update = reduceConferenceUpdate(conference, payload);
      notifyMyReducer(flex, myStore, update);
      return {...state, ...update.state};
    case A.COMMAND_STARTED:
      log.debug('flexReducer: COMMAND_STARTED');
      return {...state, conference: []};
    default:
      return state;
  }
};

export default combineReducers({
  adjunctState: reducer
});
