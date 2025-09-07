/**
 * Service responsible for order execution logic
 */

import { Order, OrderStatus, OrderType } from '../entities/Order';
import { Logger } from '../utils/logger';
import { PortfolioValidationService } from './PortfolioValidationService';
import { OrderRepository } from '../repositories/OrderRepository';

export class OrderExecutionService {
  constructor(
    private portfolioValidationService: PortfolioValidationService,
    private orderRepository: OrderRepository
  ) {}

  async executeOrder(orderId: number): Promise<void> {
    const order = (await this.orderRepository.findById(orderId, {
      shouldThrow: true,
    })) as Order;

    if (order.status !== OrderStatus.NEW) {
      const message = `Cannot process order with status: ${order.status}. Only NEW orders can be processed.`;
      Logger.warn('Order not processable', {
        orderId,
        currentStatus: order.status,
      });
      throw new Error(message);
    }

    try {
      // SOLO validar para órdenes LIMIT - las MARKET ya fueron validadas en createOrder
      if (order.type === OrderType.LIMIT) {
        await this.validateOrderAtExecution(order);
      }

      order.status = OrderStatus.FILLED;
      await this.orderRepository.save(order);

      Logger.order('Order executed successfully', {
        orderId,
        orderType: order.type,
        executionPrice: order.price,
        size: order.size,
      });
    } catch (error) {
      Logger.error('Error executing order', error as Error);
      order.status = OrderStatus.REJECTED;
      await this.orderRepository.save(order);
      throw error;
    }
  }

  private async validateOrderAtExecution(order: Order): Promise<void> {
    await this.portfolioValidationService.validateOrderFundsOrThrow(
      order.userId,
      order.instrumentId,
      order.side,
      order.size,
      order.price || 0
    );
  }
}
