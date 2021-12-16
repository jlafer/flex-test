import 'source-map-support/register';
import express from 'express';
import {urlencoded} from 'body-parser';

import config from './cfgEnv';
console.log('config:', config);
const {IXNGEN_CUST_HOST, IXNGEN_CUST_PORT, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN} = config;

import logger from './logUtil';
const log = logger.getInstance();

import {generateSyncToken, getSyncClient, subscribeToSyncMap} from 'flex-test-lib';
import {callStatusHandler} from './callStatusUpdate';
import {syncMapUpdated, startTest} from './process';

const client = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
const context = {agtName: 'cust', client, host: IXNGEN_CUST_HOST, port: IXNGEN_CUST_PORT};
const state = {context};
const tokenResponse = generateSyncToken(config, 'cust');
const syncClient = getSyncClient({token: tokenResponse.token});
subscribeToSyncMap({
  client: syncClient,
  id: 'TestSteps',
  mapCallback: startTest(state),
  itemCallback: syncMapUpdated(state),
});

const app = express();
app.use(urlencoded({ extended: false }));
log.info('started express app');

app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.post('/callstatus', callStatusHandler(state));

app.listen(IXNGEN_CUST_PORT, function () {
  log.info(`listening on port ${IXNGEN_CUST_PORT}!`);
});
