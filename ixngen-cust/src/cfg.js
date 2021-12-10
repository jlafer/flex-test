require('dotenv').config({ path:'../../.env' });

module.exports = {
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_API_KEY: process.env.TWILIO_API_KEY,
  TWILIO_API_SECRET: process.env.TWILIO_API_SECRET,
  TWILIO_SYNC_SERVICE_SID: process.env.TWILIO_SYNC_SERVICE_SID || 'default',
  TWILIO_RUNTIME_DOMAIN: process.env.TWILIO_RUNTIME_DOMAIN,
  IXNGEN_CUST_HOST: this.IXNGEN_CUST_HOST,
  IXNGEN_CUST_PORT: this.IXNGEN_CUST_PORT
};
