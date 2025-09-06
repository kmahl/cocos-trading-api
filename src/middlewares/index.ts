// Barrel exports para middlewares
export {
  globalErrorHandler,
  AppError,
  ValidationError,
  NotFoundError,
} from './errorHandler';

// DTO validation middleware (security + class-validator)
export {
  validateDto,
  validateParams,
  validateQuery,
  validateBody,
} from './dtoValidation';
