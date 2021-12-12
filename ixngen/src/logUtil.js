import { createLogger, format, transports } from 'winston';

const { combine, timestamp, printf } = format;

const myFormat = printf(({ level, message, timestamp, metadata }) => {
  if (Object.keys(metadata).length === 0)
    return `${timestamp} ${message}`;
  else
    return `${timestamp} ${message} ${JSON.stringify(metadata)}`;
});

const logSingleton = (function () {
  var instance;
  const level = process.env.LOG_LEVEL || 'info';
  const name = process.env.LOG_NAME || 'app';
  
  function createInstance() {
    const logger = createLogger({
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
  }

  return {
      getInstance: function () {
          if (!instance) {
              instance = createInstance();
          }
          return instance;
      },
  };
})();

export default logSingleton;