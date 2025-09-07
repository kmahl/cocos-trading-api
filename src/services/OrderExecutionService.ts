/**
 * Service responsible for order execution logic
 */

import { Order, OrderStatus, OrderType } from '../entities/Order';
import { Logger } from '../utils/logger';
import { PortfolioValidationService } from './PortfolioValidationService';
import { PortfolioService } from './PortfolioService';
import { OrderRepository } from '../repositories/OrderRepository';

export class OrderExecutionService {
  private portfolioService: PortfolioService;

  constructor(
    private portfolioValidationService: PortfolioValidationService,
    private orderRepository: OrderRepository
  ) {
    this.portfolioService = new PortfolioService();
  }

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
      // Para órdenes LIMIT: re-validar porque pueden haber cambiado las condiciones
      // Para órdenes MARKET: no re-validar porque se ejecutan inmediatamente tras la validación inicial
      if (order.type === OrderType.LIMIT) {
        // Validar pero SIN contar esta orden como "reserva" (evita el bug de auto-bloqueo)
        await this.validateOrderAtExecutionExcludingCurrent(order);
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

  /**
   * Validar orden pero calculando disponibilidad SIN incluir la orden actual
   * Evita el bug donde la orden se auto-bloquea por reservar sus propios recursos
   */
  private async validateOrderAtExecutionExcludingCurrent(
    order: Order
  ): Promise<void> {
    // Obtener portfolio calculado (incluye reservas de TODAS las órdenes)
    const portfolio = await this.portfolioService.getPortfolio(order.userId);

    // Calcular cuánto de los recursos "reservados" corresponde a esta orden
    if (order.side === 'BUY') {
      // Para compras: agregar de vuelta el cash que esta orden tenía reservado
      const orderReservedCash = order.size * (order.price || 0);
      const adjustedAvailable =
        portfolio.cashBalance.available + orderReservedCash;

      if (adjustedAvailable < orderReservedCash) {
        throw new Error('Insufficient available cash balance');
      }

      Logger.order('Cash validation passed (excluding current order)', {
        orderId: order.id,
        originalAvailable: portfolio.cashBalance.available,
        adjustedAvailable,
        required: orderReservedCash,
      });
    } else if (order.side === 'SELL') {
      // Para ventas: agregar de vuelta las acciones que esta orden tenía reservadas
      const position = portfolio.positions.find(
        p => p.instrumentId === order.instrumentId
      );
      if (!position) {
        throw new Error('No position found for instrument');
      }

      const adjustedAvailable = position.quantity.available + order.size;

      if (adjustedAvailable < order.size) {
        throw new Error('Insufficient available shares');
      }

      Logger.order('Shares validation passed (excluding current order)', {
        orderId: order.id,
        instrumentId: order.instrumentId,
        originalAvailable: position.quantity.available,
        adjustedAvailable,
        required: order.size,
      });
    }
  }
}
