import { Request, Response, NextFunction } from 'express';
// TODO: Implementar path aliases correctamente para imports más limpios
import { Logger } from '../utils/logger';
import { ApiErrorResponseDto } from '../dto/responses';

// Clase para errores personalizados
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Errores específicos del negocio
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

// Error handler global
export const globalErrorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let isOperational = false;

  // Si es un error de aplicación conocido
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    isOperational = error.isOperational;
  }

  // Log del error
  if (statusCode >= 500) {
    Logger.error('Server Error', {
      message: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
      statusCode,
    });
  } else {
    Logger.warn('Client Error', {
      message: error.message,
      path: req.path,
      method: req.method,
      statusCode,
    });
  }

  // Respuesta del error
  const errorResponse: ApiErrorResponseDto = {
    error: statusCode >= 500 ? 'Internal Server Error' : 'Client Error',
    message: isOperational ? message : 'Something went wrong',
    statusCode,
    timestamp: new Date().toISOString(),
    path: req.path,
  };

  // En desarrollo, incluir stack trace
  if (process.env.NODE_ENV === 'development' && error.stack) {
    errorResponse.details = { stack: error.stack };
  }

  res.status(statusCode).json(errorResponse);
};

// Middleware para manejar rutas no encontradas
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = new NotFoundError(`Route ${req.method} ${req.path} not found`);
  next(error);
};

// Wrapper para async functions
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
