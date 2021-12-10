/*
  This module defines the command(s) supported by the CLI program.
  It shows how arguments are defined, using the 'commander' package.
*/
const pgm = require('commander');
require('dotenv').config({ path:'../.env' });
const {initLog} = require('./src/debugUtil');
const {verifyRequiredEnvVars} = require('../lib');
const logLevel = process.env.LOG_LEVEL || 'info';
const log = initLog('ixngen', logLevel);
log.info('started ixngen');
verifyRequiredEnvVars(
  process.env,
  ['TWILIO_ACCOUNT_SID', 'TWILIO_API_KEY', 'TWILIO_API_SECRET', 'TWILIO_SYNC_SERVICE_SID']
);

module.exports = () => {

  pgm
  .version('0.0.1');

  pgm
  .command('run [files...]')
  .description('runs the generator')
  .option('-a, --acct <acct sid>', 'Twilio account sid')
  .option('-A, --auth <auth token>', 'Twilio auth token')
  .option('-w, --workflow <workflow sid>', 'Studio workflow sid')
  .option('-i, --indir <dir>', 'input directory')
  .option('-o, --outdir <dir>', 'output directory')
  .option('-t, --tests [ids-comma-delimited]', 'output directory')
  .action(function (files, args) {
    log.debug('files:', {files});
    //log.debug('args:', args[0]);
    require('./cmds/run')(files, args);
  });

  pgm
  .command('clear')
  .description('clears the generator')
  .option('-a, --acct <acct sid>', 'Twilio account sid')
  .option('-A, --auth <auth token>', 'Twilio auth token')
  .option('-i, --indir <dir>', 'input directory')
  .action(function (args) {
    require('./cmds/clear')(args);
  });

  // parse the command line and pass arguments into the correct "action" function
  pgm.parse(process.argv);
}
 