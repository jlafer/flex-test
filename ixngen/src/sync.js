import * as R from 'ramda';
import logger from './logUtil';
const log = logger.getInstance();

export function getSyncMapByName(client, svcSid, name) {
  return client.sync.services(svcSid).syncMaps.list()
  .then(syncMaps => syncMaps.find(map => map.uniqueName === name))
}

export function createSyncMap(client, svcSid, name) {
  return client.sync.services(svcSid)
  .syncMaps
  .create({uniqueName: name})
}

export function removeSyncMap(client, svcSid, syncMap) {
  client.sync.services(svcSid)
  .syncMaps(syncMap.sid)
  .remove()
}

export function getOrCreateSyncMap(client, svcSid, name) {
  return getSyncMapByName(client, svcSid, name)
  .then(map => {
    if (map)
      return map;
    else
      return createSyncMap(client, svcSid, name);
  })
}

export function getSyncMapItem(client, svcSid, syncMapSid, key) {
  return client.sync.services(svcSid)
  .syncMaps(syncMapSid)
  .syncMapItems(key)
  .fetch()
}

export function createSyncMapItem(client, svcSid, syncMapSid, item) {
  return client.sync.services(svcSid)
  .syncMaps(syncMapSid)
  .syncMapItems
  .create(item)
}

export function updateSyncMapItem(client, svcSid, syncMapSid, key, data) {
  return client.sync.services(svcSid)
  .syncMaps(syncMapSid)
  .syncMapItems(key)
  .update(data)
}

export function setSyncMapItem(client, svcSid, syncMapSid, item) {
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
