import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  transport: isProduction ? undefined : {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});

export function createChildLogger(context: string) {
  return logger.child({ context });
}

export function logError(message: string, error: Error, additionalData?: Record<string, unknown>) {
  logger.error({
    err: error,
    message,
    ...additionalData,
  });
}

export function logInfo(message: string, data?: Record<string, unknown>) {
  logger.info({
    message,
    ...data,
  });
}

export function logDebug(message: string, data?: Record<string, unknown>) {
  logger.debug({
    message,
    ...data,
  });
}

export function logWarn(message: string, data?: Record<string, unknown>) {
  logger.warn({
    message,
    ...data,
  });
}
