const R = require('ramda');
const {getLog} = require('./debugUtil');
const log = getLog();

function getSyncMapByName(client, svcSid, name) {
  return client.sync.services(svcSid).syncMaps.list()
  .then(syncMaps => syncMaps.find(map => map.uniqueName === name))
}

function createSyncMap(client, svcSid, name) {
  return client.sync.services(svcSid)
  .syncMaps
  .create({uniqueName: name})
}

function removeSyncMap(client, svcSid, syncMap) {
  client.sync.services(svcSid)
  .syncMaps(syncMap.sid)
  .remove()
}

function getOrCreateSyncMap(client, svcSid, name) {
  return getSyncMapByName(client, svcSid, name)
  .then(map => {
    if (map)
      return map;
    else
      return createSyncMap(client, svcSid, name);
  })
}

function getSyncMapItem(client, svcSid, syncMapSid, key) {
  return client.sync.services(svcSid)
  .syncMaps(syncMapSid)
  .syncMapItems(key)
  .fetch()
}

function createSyncMapItem(client, svcSid, syncMapSid, item) {
  return client.sync.services(svcSid)
  .syncMaps(syncMapSid)
  .syncMapItems
  .create(item)
}

function updateSyncMapItem(client, svcSid, syncMapSid, key, data) {
  return client.sync.services(svcSid)
  .syncMaps(syncMapSid)
  .syncMapItems(key)
  .update(data)
}

function setSyncMapItem(client, svcSid, syncMapSid, item) {
  log.debug('setSyncMapItem: setting item: ', item);
  return updateSyncMapItem(client, svcSid, syncMapSid, item.key, R.dissoc(['key'], item))
  .catch(err => {
    log.debug('setSyncMapItem: update failed with:', err);
    return createSyncMapItem(client, svcSid, syncMapSid, item);
  })
  .catch(err => {
    log.debug('setSyncMapItem: create failed with:', err);
    return err;
  })
}

module.exports = {
  createSyncMap,
  getSyncMapByName,
  removeSyncMap,
  getOrCreateSyncMap,
  createSyncMapItem,
  getSyncMapItem,
  setSyncMapItem,
  updateSyncMapItem
}