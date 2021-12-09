import * as R from 'ramda';
import {setSyncMapItem} from 'jlafer-flex-util';
import * as K from './constants';

export const getSteps = (command, agtName) => {
  const party = command.parties.find(party => party.identity === agtName);
  return (party) ? party.steps : null;
};

// TODO this only supports targetType 'agent' - not 'queue'
export const getTargetSid = (state, targetType, targetName) => {
  if (targetType === 'agent') {
    const party = state.parties.find(party => party.identity === targetName);
    return party.workerSid;
  }
  else
    return 'TRANSFER-TO-QUEUE-NOT-SUPPORTED';
};

export const sendPartyStats = ({syncMap, agtName, cmdId, stats}) => {
  const data = {op: K.OP_STATS, command: cmdId, stats, source: agtName}
  setSyncMapItem(syncMap, agtName, data, 300);
};

export const sendProgress = ({syncMap, agtName, cmdId, status}) => {
  const data = {op: K.OP_PROGRESS, command: cmdId, status, source: agtName}
  setSyncMapItem(syncMap, agtName, data, 300);
};

export const sendChannelStatus = ({syncMap, agtName, channel, status}) => {
  const data = {op: K.OP_CHANNEL_STATUS, channel, status, source: agtName}
  setSyncMapItem(syncMap, 'all', data, 300);
};

export function delayedPromise(delayInMSec) {
  return new Promise(
    function(resolve, _reject) {
      setTimeout(
        function() {
          resolve(delayInMSec);
        },
        delayInMSec
      );
    }
  );
};

export const calcDurationSecs = (start, stop) => {
  return (stop - start) / 1000;
};

export const updateHoldDur = (state, unholdTS) => {
  if (! state.holdTS)
    return state;
  const holdDur = calcDurationSecs(state.holdTS, unholdTS);
  const totalHoldDur = state.holdDur + holdDur;
  return {
    ...state,
    holdTS: null,
    holdDur: totalHoldDur
  };
}

// addTestDataToTaskConversations :: (task, data) -> attributes
export const addTestDataToTaskConversations = (task, data) => {
  const conversations = R.mergeRight(task.attributes.conversations, data);
  return R.assoc('conversations', conversations, task.attributes);
};

// calcPartyStats :: (state, endData) -> object
export const calcPartyStats = (state, endData) => {
  //log.debug(`calcPartyStats: state:`, state);
  const {reservation, offerTS, acceptTS, endTS, holdDur, xferred} = state;
  const {task} = reservation;
  const {result, completeTS} = endData;
  
  const waitDur = calcDurationSecs(task.dateCreated, offerTS);
  let alertDur;
  let talkDur = 0;
  let wrapupDur = 0;
  if (result === 'handled') {
    alertDur = calcDurationSecs(offerTS, acceptTS);
    talkDur = calcDurationSecs(acceptTS, endTS);
    wrapupDur = calcDurationSecs(endTS, completeTS);
  }
  else
    alertDur = calcDurationSecs(offerTS, completeTS);
  return {
    result,
    waitDur,
    alertDur,
    talkDur,
    holdDur,
    wrapupDur,
    xferred
  };
}
