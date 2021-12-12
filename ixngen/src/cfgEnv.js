import dotenv from 'dotenv';
import * as R from 'ramda';

const result = dotenv.config({ path: '../.env' });
if (result.error) {
  throw result.error
}

const config = R.pick([
  'LOG_LEVEL', 'LOG_NAME',
  'TWILIO_ACCOUNT_SID', 'TWILIO_API_KEY', 'TWILIO_API_SECRET',
  'TWILIO_SYNC_SERVICE_SID'  
], process.env);

export default config;