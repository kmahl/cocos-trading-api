/**
 * Service responsible for order status determination
 */

import { OrderStatus } from '../entities/Order';
import { OrderSideDto } from '../dto/index';
import { PortfolioValidationService } from './PortfolioValidationService';
import { Logger } from '../utils/logger';

export class OrderStatusService {
  constructor(private portfolioValidationService: PortfolioValidationService) {}

  async determineInitialStatus(
    userId: number,
    instrumentId: number,
    side: OrderSideDto,
    size: number,
    price: number
  ): Promise<OrderStatus> {
    try {
      const hasValidFunds = await this.validateFundsAndShares(
        userId,
        instrumentId,
        side,
        size,
        price
      );

      return hasValidFunds ? OrderStatus.NEW : OrderStatus.REJECTED;
    } catch (error) {
      Logger.error('Error determining order status', error as Error);
      return OrderStatus.REJECTED;
    }
  }

  private async validateFundsAndShares(
    userId: number,
    instrumentId: number,
    side: OrderSideDto,
    size: number,
    price: number
  ): Promise<boolean> {
    return await this.portfolioValidationService.validateOrderFunds(
      userId,
      instrumentId,
      side,
      size,
      price
    );
  }
}
