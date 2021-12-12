/*
  This module defines the command(s) supported by the CLI program.
*/
import 'source-map-support/register';
import {Command} from 'commander';
import {verifyRequiredEnvVars} from 'lib';

import config from './cfgEnv';

import logger from './logUtil';
const log = logger.getInstance();

import clear from './clear';
import run from './run';

log.info('started ixngen');
log.debug(`TWILIO_ACCOUNT_SID = ${config.TWILIO_ACCOUNT_SID}`);

verifyRequiredEnvVars(
  config,
  ['TWILIO_ACCOUNT_SID', 'TWILIO_API_KEY', 'TWILIO_API_SECRET', 'TWILIO_SYNC_SERVICE_SID']
);

const pgm = new Command();

pgm.version('0.0.1');

pgm
.command('run [files...]')
.description('runs the generator')
.option('-w, --workflow <workflow sid>', 'Studio workflow sid')
.option('-i, --indir <dir>', 'input directory')
.option('-o, --outdir <dir>', 'output directory')
.option('-t, --tests [ids-comma-delimited]', 'output directory')
.action(run(config));

pgm
.command('clear')
.description('clears the generator')
.option('-i, --indir <dir>', 'input directory')
.action(clear);

// parse the command line and pass arguments into the correct "action" function
pgm.parse(process.argv);

//export default pgm;