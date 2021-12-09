require('dotenv').config();
const express = require('express');
const {urlencoded} = require('body-parser');
const R = require('ramda');
const {initLog} = require('./debugUtil');
const log = initLog('ixngen-cust', 'debug');

const {getSyncClientAndMap} = require('jlafer-insights-testing');
const tokenGenerator = require('./token-generator');
const {syncMapUpdated, startTest, stepUpdate} = require('./process');

const config = require('./cfg');

// TODO this shd come from config.js
const {HOST, PORT, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN} = process.env;
const client = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

const context = {agtName: 'cust', client, host: HOST, port: PORT};
const state = {context};
const tokenResponse = tokenGenerator('cust');
getSyncClientAndMap(startTest(state), syncMapUpdated(state), 'TestSteps', tokenResponse);

const app = express();
app.use(urlencoded({ extended: false }));
log.info('started express app');

app.get('/', function (req, res) {
  res.send('Hello World!');
});

const callStatusHandler = R.curry((state, req, res) => {
  const {CallSid, CallStatus} = req.body;
  log.debug(`statusCallback: received ${CallStatus} for call ${CallSid}`);
  switch (CallStatus) {
    case 'initiated':
    case 'ringing':
    case 'answered':
    case 'in-progress':
    case 'completed':
      const update = {status: CallStatus};
      stepUpdate(state, update)
      break;
    default:
      log.debug(`statusCallback: ignoring CallStatus ${CallStatus}`);
  };
  res.status(204);
});

app.post('/callstatus', callStatusHandler(state));

app.listen(PORT, function () {
  log.info(`listening on port ${PORT}!`);
});
