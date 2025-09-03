import winston from 'winston';

// Tipo para metadatos de log
interface LogMeta {
  [key: string]: unknown;
}

// Configuración de formato personalizado
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const logObject: Record<string, unknown> = {
      timestamp,
      level,
      message,
      ...meta,
    };

    if (stack) {
      logObject.stack = stack;
    }

    return JSON.stringify(logObject);
  })
);

// Logger principal
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  transports: [
    // Console output para desarrollo
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),

    // Archivo para errores
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: customFormat,
    }),

    // Archivo para todos los logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: customFormat,
    }),
  ],
});

// Logger wrapper con métodos de conveniencia
export class Logger {
  // Método helper para mergear defaultMeta con meta adicional
  private static getMergedMeta(meta?: LogMeta): LogMeta {
    const defaultMeta: LogMeta = {
      service: 'cocos-trading-api',
      environment: process.env.NODE_ENV || 'development',
    };

    return {
      ...defaultMeta,
      ...meta,
    };
  }

  static info(message: string, meta?: LogMeta) {
    logger.info(message, this.getMergedMeta(meta));
  }

  static error(message: string, error?: Error | LogMeta) {
    if (error instanceof Error) {
      logger.error(
        message,
        this.getMergedMeta({
          error: error.message,
          stack: error.stack,
        })
      );
    } else {
      logger.error(message, this.getMergedMeta(error));
    }
  }

  static warn(message: string, meta?: LogMeta) {
    logger.warn(message, this.getMergedMeta(meta));
  }

  static debug(message: string, meta?: LogMeta) {
    logger.debug(message, this.getMergedMeta(meta));
  }

  static http(message: string, meta?: LogMeta) {
    logger.http(message, this.getMergedMeta(meta));
  }

  // Métodos específicos del negocio
  static database(message: string, meta?: LogMeta) {
    logger.info(`[DATABASE] ${message}`, this.getMergedMeta(meta));
  }

  static order(message: string, meta?: LogMeta) {
    logger.info(`[ORDER] ${message}`, this.getMergedMeta(meta));
  }

  static portfolio(message: string, meta?: LogMeta) {
    logger.info(`[PORTFOLIO] ${message}`, this.getMergedMeta(meta));
  }

  static auth(message: string, meta?: LogMeta) {
    logger.info(`[AUTH] ${message}`, this.getMergedMeta(meta));
  }

  static api(message: string, meta?: LogMeta) {
    logger.info(`[API] ${message}`, this.getMergedMeta(meta));
  }

  // Logger para requests HTTP
  static request(req: {
    method: string;
    url: string;
    headers: Record<string, unknown>;
    body?: unknown;
    ip: string;
  }) {
    const { method, url, headers, body, ip } = req;
    const logData: LogMeta = {
      method,
      url,
      userAgent: headers['user-agent'],
      ip,
    };

    if (body && typeof body === 'object' && body !== null) {
      logData.body = body;
    }

    this.http('HTTP Request', logData);
  }

  // Logger para responses HTTP
  static response(
    req: { method: string; url: string },
    res: { statusCode: number },
    responseTime: number
  ) {
    const { method, url } = req;
    const { statusCode } = res;

    this.http('HTTP Response', {
      method,
      url,
      statusCode,
      responseTime: `${responseTime}ms`,
    });
  }
}

export default logger;
