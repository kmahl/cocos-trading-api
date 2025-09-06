import winston from 'winston';

// Tipo para metadatos de log
interface LogMeta {
  [key: string]: unknown;
}

// Iconos para categorías
const icons = {
  DATABASE: '🗄️',
  ORDER: '📈',
  PORTFOLIO: '💼',
  AUTH: '🔐',
  API: '🌐',
  VALIDATION: '✅',
  QUERY: '🔍',
  WARNING: '⚠️',
  ERROR: '❌',
  SUCCESS: '✅',
  INFO: 'ℹ️',
};

// Formato colorido para consola
const coloredConsoleFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'HH:mm:ss',
  }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    // Asegurar que message es string
    const messageStr = String(message);

    // Extraer el tag del mensaje si existe
    const tagMatch = messageStr.match(/^\[([^\]]+)\]/);
    const tag = tagMatch ? tagMatch[1] : '';
    const cleanMessage = tagMatch
      ? messageStr.replace(/^\[[^\]]+\]\s*/, '')
      : messageStr;

    // Obtener icono específico del tag
    let icon = '📝'; // icono por defecto
    if (tag && icons[tag as keyof typeof icons]) {
      icon = icons[tag as keyof typeof icons];
    }

    // Formatear metadata si existe
    let formattedMeta = '';
    const filteredMeta = { ...meta };
    delete filteredMeta.service;
    delete filteredMeta.environment;
    // Esto no creo que sea optimo para los logs de alta frecuencia y en la nube, pero para desarrollo local está bien
    if (Object.keys(filteredMeta).length > 0) {
      formattedMeta =
        '\n  📊 ' +
        JSON.stringify(filteredMeta, null, 2)
          .split('\n')
          .map(line => '     ' + line)
          .join('\n');
    }

    return `[${timestamp}] ${icon} ${level}: ${cleanMessage}${formattedMeta}`;
  })
);

// Configuración de formato para archivos (JSON estructurado)
const fileFormat = winston.format.combine(
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
  format: fileFormat,
  transports: [
    // Console output mejorado para desarrollo
    new winston.transports.Console({
      format: coloredConsoleFormat,
    }),

    // Archivo para errores
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: fileFormat,
    }),

    // Archivo para todos los logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: fileFormat,
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

  // Validation logging
  static validation(message: string, meta?: LogMeta) {
    logger.info(`[VALIDATION] ${message}`, this.getMergedMeta(meta));
  }

  // Query logging para repositorios
  static query(message: string, meta?: LogMeta) {
    logger.info(`[QUERY] ${message}`, this.getMergedMeta(meta));
  }

  // Warning logging
  static warning(message: string, meta?: LogMeta) {
    logger.warn(`[WARNING] ${message}`, this.getMergedMeta(meta));
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
