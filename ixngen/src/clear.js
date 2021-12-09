require("dotenv").config();
const R = require('ramda');
const {fnInit} = require('./helpers');
const {removeSyncMap} = require('./sync');
const {getLog} = require('./debugUtil');
const log = getLog();

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

module.exports = {
  clearFn
};
