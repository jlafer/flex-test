/*
  This module provides the 'clear' command of the 'ixngen' CLI program.
  It writes data to the filesystem.
  The (possibly long-running) work is done while a spinner is shown to the user.
*/
const ora = require('ora');
const error = require('../src/error');
const {clearFn} = require('../src/clear');
const {getLog} = require('../src/debugUtil');

module.exports = (args) => {
  const log = getLog();
  const spinner = ora().start();
  clearFn(args)
  .then(() => {
    spinner.stop();
    log.info(`generator cleared`)
  })
  .catch(err => {
    spinner.stop();
    error(`${err}`, true);
  });
};
