/*
  This module provides the 'run' command of the 'ixngen' CLI program.
  It writes data to the filesystem.
  The (possibly long-running) work is done while a spinner is shown to the user.
*/
const ora = require('ora');
const error = require('../src/error');
const {runFn} = require('../src/run');
const {getLog} = require('../src/debugUtil');

module.exports = (files, args) => {
  const log = getLog();
  const spinner = ora().start();
  runFn(files, args)
  .then(() => {
    spinner.stop();
    log.info(`generator run`)
  })
  .catch(err => {
    spinner.stop();
    error(`${err}`, true);
  });
};
