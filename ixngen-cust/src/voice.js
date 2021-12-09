/**
 params:
   client: Twilio client
   from: callerid
   to: number to dial
   url - endpoint called when phone call is answered
   statusCallback - endpoint called with status changes
 */
const dial = (params) => {
  const {client, from, to, twiml, statusCallback} = params;
  return client.calls.create({
    to,
    from,
    twiml,
    statusCallback,
    statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
    record: true
  });
}

/**
 params:
   client: Twilio client
   callSid
 */
const release = (params) => {
  const {client, callSid} = params;
  return client.calls(callSid)
    .update({status: 'completed'});
}

module.exports = {
  dial,
  release
};