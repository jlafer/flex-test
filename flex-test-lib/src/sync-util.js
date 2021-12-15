const SyncClient = require('twilio-sync');
const Twilio = require('twilio');

// NOTE: axios must be required - not imported
const axios = require('axios');

export const getSyncToken = (url, identity, handler) => {
  axios.get(`${url}?Identity=${identity}`, {
    headers: {
      Accept: "application/json"
    }
  })
  .then(resp => {
    handler(resp.data);
  })
  .catch(function (error) {
    console.log(error);
  })
};

/**
 * generate an access token for an application user - it generates a random
 * username for the client requesting a token or generates a token with an
 * identity if one is provided
 *
 * @return {Object}
 *         {Object.identity} String random identity
 *         {Object.token} String token generated
 */
export function generateSyncToken(config, identity = 0) {
  const AccessToken = Twilio.jwt.AccessToken;
  const SyncGrant = AccessToken.SyncGrant;
  const token = new AccessToken(
    config.TWILIO_ACCOUNT_SID,
    config.TWILIO_API_KEY,
    config.TWILIO_API_SECRET
  );
  token.identity = identity;
  const syncGrant = new SyncGrant({
    serviceSid: config.TWILIO_SYNC_SERVICE_SID || 'default'
  });
  token.addGrant(syncGrant);
  return {
    identity: token.identity,
    token: token.toJwt()
  };
}

export const getSyncClient = ( {callback = noOpFn, token, options = {logLevel: "info"}} ) => {
  const client = new SyncClient(token, options);
  client.on("connectionStateChanged", callback);
  return client;
};

export const subscribeToSyncMap = ( {client, id, ttl = 1800, mapCallback, itemCallback} ) => {
  client.map({id, ttl}).then(map => {
    map.on("itemAdded", itemCallback(map));
    map.on("itemUpdated", itemCallback(map));
    mapCallback(map);
  });
};

function noOpFn(_state) {};

export const setSyncMapItem = (map, key, data, ttl) => {
  map.set(key, data, {ttl})
  .then(function(item) {
    //console.log('setSyncMapItem successful');
  })
  .catch(function(error) {
    console.error('setSyncMapItem failed', error);
  });
};
