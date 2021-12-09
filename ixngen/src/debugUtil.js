const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf } = format;

let logger;

const myFormat = printf(({ level, message, timestamp, metadata }) => {
  if (Object.keys(metadata).length === 0)
    return `${timestamp} ${message}`;
  else
    return `${timestamp} ${message} ${JSON.stringify(metadata)}`;
});

const initLog = (name, level) => {
  logger = createLogger({
    level: level,
    format: combine(
      timestamp({format: 'HH:mm:ss'}),
      format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
      myFormat
    ),
    transports: [
      //
      // - Write all logs with level `error` and below to `error.log`
      // - Write all logs with level `info` and below to `combined.log`
      //
      new transports.File({ filename: `${name}.error.log`, level: 'error', options: { flags: 'w' }}),
      new transports.File({ filename: `${name}.combined.log`, options: { flags: 'w' }})
    ]
  });
  
  //
  // If we're not in production then log to the `console` with the format:
  // `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
  // 
  if (process.env.NODE_ENV !== 'production') {
    logger.add(new transports.Console());
  }

  return logger;
};

const getLog = () => {
  return logger;
}

const verifyRequiredEnvVars = (env, varNames) => {
  varNames.forEach(varName => {
    if (!env[varName]) {
      throw new Error(`required environment variable - ${varName} - is missing from .env file`);
    }
  })
};

module.exports = {
  initLog,
  getLog,
  verifyRequiredEnvVars
};
