import 'source-map-support/register';
import {Command} from 'commander';
import {verifyRequiredEnvVars} from 'flex-test-lib';

import config from './cfgEnv';
import logger from './logUtil';
import clear from './clear';
import run from './run';

const log = logger.getInstance();
log.info('started ixngen');

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

pgm.parse(process.argv);
