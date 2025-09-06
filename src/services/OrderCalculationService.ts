/**
 * Service responsible for order calculations and price determination
 */

import { OrderType } from '../entities/index';
import { ValidationError } from '../middlewares/errorHandler';

interface OrderCalculation {
  executionPrice: number;
  executionSize: number;
}

export class OrderCalculationService {
  calculateOrderExecution(
    type: OrderType,
    currentPrice: number,
    size?: number,
    amount?: number,
    limitPrice?: number
  ): OrderCalculation {
    const executionPrice = this.determineExecutionPrice(
      type,
      currentPrice,
      limitPrice
    );
    const executionSize = this.calculateSize(size, amount, executionPrice);

    return { executionPrice, executionSize };
  }

  private determineExecutionPrice(
    type: OrderType,
    currentPrice: number,
    limitPrice?: number
  ): number {
    if (type === OrderType.MARKET) {
      return currentPrice;
    }

    if (type === OrderType.LIMIT && limitPrice) {
      return limitPrice;
    }

    throw new ValidationError('LIMIT orders require a price');
  }

  private calculateSize(
    size?: number,
    amount?: number,
    price?: number
  ): number {
    if (size) {
      return size;
    }

    if (amount && price && price > 0) {
      return Math.floor(amount / price);
    }

    throw new ValidationError('Invalid size calculation parameters');
  }
}
