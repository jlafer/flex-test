import * as R from 'ramda';
import dotenv from 'dotenv';

const result = dotenv.config({ path:'../.env' });
if (result.error) {
  throw result.error
}
//console.log('cfgEnv: env:', process.env);

const config = R.pick([
  'IXNGEN_CUST_HOST', 'IXNGEN_CUST_PORT',
  'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_API_KEY', 'TWILIO_API_SECRET',
  'TWILIO_SYNC_SERVICE_SID',
  'LOG_LEVEL', 'LOG_NAME'
], process.env);

export default config;