import {fnInit} from './helpers';
import {removeSyncMap} from './sync';
import logger from './logUtil';
const log = logger.getInstance();

async function init(args) {
  return fnInit(args);
}

async function execute(initData) {
  const {client, syncSvcSid, syncMap} = initData;
  log.debug('execute: syncMap: ', {syncMap});
  try {
    await removeSyncMap(client, syncSvcSid, syncMap);
    log.info('sync map removed');
  } catch(err) {
    log.error('ERROR from removeSyncMap:', {err});
  }
}

const clearFn = (args) => {
  return init(args)
    .then(initData => execute(initData));
};

export default clearFn;