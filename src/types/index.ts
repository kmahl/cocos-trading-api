/**
 * Index file para exportar todos los types
 */

export * from './portfolio';
export * from './orders';
export * from './market';

// Common types
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface DatabaseQueryOptions {
  relations?: string[];
  order?: Record<string, 'ASC' | 'DESC'>;
  limit?: number;
  offset?: number;
}
