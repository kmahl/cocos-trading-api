import { Request, Response, NextFunction } from 'express';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';
// TODO: Implementar path aliases correctamente para imports más limpios
import { Logger } from '../utils/logger';

// Tipo genérico para clases DTO
type DtoConstructor<T = object> = new (...args: unknown[]) => T;

// Extend Request para incluir validatedData
interface RequestWithValidatedData extends Request {
  validatedData?: object;
}

// Middleware de validación genérico
export const validateDto = <T extends object>(
  dtoClass: DtoConstructor<T>,
  source: 'body' | 'query' | 'params' = 'body'
) => {
  return async (
    req: RequestWithValidatedData,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Opciones de seguridad para plainToInstance
      const dto = plainToInstance(dtoClass, req[source], {
        enableImplicitConversion: true,
        excludeExtraneousValues: true, // 🔒 Solo propiedades definidas en DTO
      });

      const errors = await validate(dto, {
        whitelist: true, // 🔒 Solo validar propiedades definidas
        forbidNonWhitelisted: true, // 🔒 Error en propiedades extra
        forbidUnknownValues: true, // 🔒 Rechazar valores desconocidos
        skipMissingProperties: false, // ✅ Validar propiedades requeridas
        stopAtFirstError: false, // ✅ Mostrar todos los errores
      });

      if (errors.length > 0) {
        const errorMessages = errors.map((error: ValidationError) => {
          return {
            property: error.property,
            constraints: error.constraints,
            value: error.value,
          };
        });

        Logger.warn('Validation failed', {
          path: req.path,
          method: req.method,
          errors: errorMessages,
        });

        res.status(400).json({
          error: 'Validation Error',
          message: 'Request validation failed',
          statusCode: 400,
          timestamp: new Date().toISOString(),
          path: req.path,
          details: errorMessages,
        });
        return;
      }

      // Agregar el DTO validado al request
      req.validatedData = dto;
      next();
    } catch (error) {
      Logger.error('Validation middleware error', error as Error);
      next(error);
    }
  };
};

// Middleware para validar parámetros de URL
export const validateParams = <T extends object>(dtoClass: DtoConstructor<T>) =>
  validateDto(dtoClass, 'params');

// Middleware para validar query parameters
export const validateQuery = <T extends object>(dtoClass: DtoConstructor<T>) =>
  validateDto(dtoClass, 'query');

// Middleware para validar body
export const validateBody = <T extends object>(dtoClass: DtoConstructor<T>) =>
  validateDto(dtoClass, 'body');
