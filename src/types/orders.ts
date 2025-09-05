/**
 * Types e interfaces para Orders
 */

export interface OrderValidationResult {
  isValid: boolean;
  errors: string[];
  executionPrice?: number;
  executionSize?: number;
}

export interface OrderProcessingResult {
  orderId: number;
  status: string;
  executionPrice?: number;
  executedAt: Date;
}

export interface OrderFundsValidation {
  hasRequiredFunds: boolean;
  availableFunds: number;
  requiredFunds: number;
}
