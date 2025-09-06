/**
 * Interface definitions for dependency injection
 */

export interface IOrderCalculationService {
  calculateOrderExecution(
    type: string,
    currentPrice: number,
    size?: number,
    amount?: number,
    limitPrice?: number
  ): { executionPrice: number; executionSize: number };
}

export interface IOrderStatusService {
  determineInitialStatus(
    userId: number,
    instrumentId: number,
    side: string,
    size: number,
    price: number
  ): Promise<string>;
}

export interface IOrderExecutionService {
  executeOrder(orderId: number): Promise<void>;
}

export interface IInstrumentService {
  getCurrentPrice(instrumentId: number): Promise<number>;
}

export interface IPortfolioValidationService {
  checkAvailableCash(userId: number, amount: number): Promise<boolean>;
  checkAvailableShares(
    userId: number,
    instrumentId: number,
    size: number
  ): Promise<boolean>;
}
