//import Twilio from 'twilio';
const Twilio = require('twilio');

// access token used for Video, IP Messaging and Sync
const AccessToken = Twilio.jwt.AccessToken;
const SyncGrant = AccessToken.SyncGrant;

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
  // create an access token which we will sign
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

  // serialize the token to a JWT string
  return {
    identity: token.identity,
    token: token.toJwt()
  };
}
