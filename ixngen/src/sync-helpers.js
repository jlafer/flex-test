import SyncClient from 'twilio-sync';
import * as R from 'ramda';
import logger from './logUtil';
const log = logger.getInstance();

export const setSyncMapItem = (map, key, data, ttl) => {
  return map.set(key, data, {ttl})
  .then(function(item) {
    log.debug('setSyncMapItem successful');
    return item;
  })
  .catch(function(error) {
    console.error('setSyncMapItem failed', error);
  });
};

export const getSyncClientAndMap = R.curry((mapCallback, itemCallback, data) => {
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
