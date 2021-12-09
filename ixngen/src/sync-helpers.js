const SyncClient = require('twilio-sync');
const R = require('ramda');
const K = require('./constants');
const {getLog} = require('./debugUtil');
const log = getLog();

const setSyncMapItem = (map, key, data, ttl) => {
  return map.set(key, data, {ttl})
  .then(function(item) {
    log.debug('setSyncMapItem successful');
    return item;
  })
  .catch(function(error) {
    console.error('setSyncMapItem failed', error);
  });
};

const getSyncClientAndMap = R.curry((mapCallback, itemCallback, data) => {
  const options = {
    logLevel: "info"
  };
  const client = new SyncClient(data.token, options);

  client.on("connectionStateChanged", state => {
    log.debug('getSyncClientAndMap.connectionState:', state);
  });

  client.map({id: 'TestSteps', ttl: 1800}).then(map => {
    log.debug(`getSyncClientAndMap: opened map: ${map.sid}`);
    map.on("itemAdded", itemCallback(map));
    map.on("itemUpdated", itemCallback(map));
    mapCallback(map);
  });

  return client;
});

module.exports = {
  getSyncClientAndMap,
  setSyncMapItem
}