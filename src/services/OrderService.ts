/**
 * Order Service
 *
 * 🚧 WIP: Service migrated to modular routes structure
 * Subject to changes based on business logic decisions
 *
 * Handles order processing and validation
 * Pending decision: Queue implementation for order processing
 */

// TODO: Implementar path aliases correctamente para imports más limpios
import { AppDataSource } from '../data-source/index';
import { Order, OrderStatus } from '../entities/Order';
import { Logger } from '../utils/logger';
import { CreateOrderDto, OrderSideDto, OrderTypeDto } from '../dto/index';
import { OrderResponseDto } from '../dto/responses';
import { PortfolioService } from './PortfolioService';
import { InstrumentService } from './InstrumentService';
import { ValidationError } from '../middlewares/errorHandler';

export class OrderService {
  private orderRepository = AppDataSource.getRepository(Order);
  private portfolioService = new PortfolioService();
  private instrumentService = new InstrumentService();

  /**
   * Crear y procesar una nueva orden
   */
  async createOrder(orderDto: CreateOrderDto): Promise<OrderResponseDto> {
    const { userId, instrumentId, side, type, size, amount, price } = orderDto;

    Logger.order('Creating order', {
      userId,
      instrumentId,
      side,
      type,
      size,
      amount,
    });

    // 1. Validaciones básicas
    await this.validateOrder(orderDto);

    // 2. Obtener precio actual para MARKET orders o validar LIMIT price
    const currentPrice =
      await this.instrumentService.getCurrentPrice(instrumentId);
    if (!currentPrice) {
      throw new ValidationError('Unable to get current price for instrument');
    }

    // 3. Determinar precio de ejecución y cantidad
    const executionPrice =
      type === OrderTypeDto.MARKET ? currentPrice : price || 0;
    const executionSize = size || Math.floor((amount || 0) / executionPrice);

    if (executionSize <= 0) {
      throw new ValidationError('Invalid order size calculated');
    }

    // 4. Validar fondos/posiciones disponibles
    await this.validateOrderFunds(
      userId,
      instrumentId,
      side,
      executionSize,
      executionPrice
    );

    // 5. Crear orden en base de datos
    const order = this.orderRepository.create({
      instrumentid: instrumentId, // DB usa snake_case
      userid: userId, // DB usa snake_case
      side,
      size: executionSize,
      price: executionPrice,
      type,
      status: OrderStatus.NEW,
      datetime: new Date(),
    });

    const savedOrder = await this.orderRepository.save(order);

    // 6. Procesar orden (para efectos del challenge, todas se ejecutan inmediatamente)
    await this.processOrder(savedOrder.id);

    // 7. Retornar orden actualizada
    const processedOrder = await this.getOrderById(savedOrder.id);
    if (!processedOrder) {
      throw new Error('Failed to retrieve processed order');
    }

    Logger.order('Order created and processed successfully', {
      orderId: processedOrder.id,
      status: processedOrder.status,
      executionPrice: processedOrder.price,
    });

    return processedOrder;
  }

  /**
   * Obtener orden por ID
   */
  async getOrderById(orderId: number): Promise<OrderResponseDto | null> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['instrument'],
    });

    if (!order) {
      return null;
    }

    return {
      id: order.id,
      instrumentId: order.instrumentid,
      userId: order.userid,
      side: order.side,
      size: order.size,
      price: order.price || 0,
      type: order.type,
      status: order.status,
      datetime: order.datetime.toISOString(),
      instrument: order.instrument
        ? {
            ticker: order.instrument.ticker,
            name: order.instrument.name,
          }
        : undefined,
    };
  }

  /**
   * Obtener historial de órdenes de un usuario
   */
  async getUserOrders(
    userId: number,
    limit: number = 50
  ): Promise<OrderResponseDto[]> {
    Logger.order('Getting user orders', { userId, limit });

    const orders = await this.orderRepository.find({
      where: { userid: userId },
      relations: ['instrument'],
      order: { datetime: 'DESC' },
      take: limit,
    });

    return orders.map(order => ({
      id: order.id,
      instrumentId: order.instrumentid,
      userId: order.userid,
      side: order.side,
      size: order.size,
      price: order.price || 0,
      type: order.type,
      status: order.status,
      datetime: order.datetime.toISOString(),
      instrument: order.instrument
        ? {
            ticker: order.instrument.ticker,
            name: order.instrument.name,
          }
        : undefined,
    }));
  }

  /**
   * Procesar orden - Para el challenge, todas se ejecutan inmediatamente
   */
  private async processOrder(orderId: number): Promise<void> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });
    if (!order) {
      throw new Error('Order not found for processing');
    }

    Logger.order('Processing order', { orderId, status: order.status });

    try {
      // En un sistema real, aquí habría lógica compleja de matching
      // Para el challenge, ejecutamos todas las órdenes inmediatamente
      order.status = OrderStatus.FILLED;
      await this.orderRepository.save(order);

      Logger.order('Order filled successfully', {
        orderId,
        executionPrice: order.price,
        size: order.size,
      });
    } catch (error) {
      Logger.error('Error processing order', error as Error);
      order.status = OrderStatus.REJECTED;
      await this.orderRepository.save(order);
      throw error;
    }
  }

  /**
   * Validar orden antes de crear
   */
  private async validateOrder(orderDto: CreateOrderDto): Promise<void> {
    const { instrumentId, type, size, amount, price } = orderDto;

    // Verificar que el instrumento existe
    const instrumentExists =
      await this.instrumentService.instrumentExists(instrumentId);
    if (!instrumentExists) {
      throw new ValidationError('Instrument not found');
    }

    // Validar que LIMIT orders tengan precio
    if (type === OrderTypeDto.LIMIT && (!price || price <= 0)) {
      throw new ValidationError('LIMIT orders must have a valid price');
    }

    // Validar que MARKET orders no tengan precio
    if (type === OrderTypeDto.MARKET && price) {
      throw new ValidationError('MARKET orders should not specify a price');
    }

    // Validar size OR amount (XOR logic ya validado en DTO)
    if (size && size <= 0) {
      throw new ValidationError('Size must be greater than 0');
    }

    if (amount && amount <= 0) {
      throw new ValidationError('Amount must be greater than 0');
    }
  }

  /**
   * Validar fondos disponibles antes de ejecutar orden
   */
  private async validateOrderFunds(
    userId: number,
    instrumentId: number,
    side: OrderSideDto,
    size: number,
    price: number
  ): Promise<void> {
    if (side === OrderSideDto.BUY) {
      // Validar cash disponible para compra
      const requiredAmount = size * price;
      const hasCash = await this.portfolioService.checkAvailableCash(
        userId,
        requiredAmount
      );

      if (!hasCash) {
        throw new ValidationError('Insufficient cash balance for purchase');
      }

      Logger.order('Cash validation passed', {
        userId,
        requiredAmount,
        side: 'BUY',
      });
    } else {
      // SELL
      // Validar acciones disponibles para venta
      const hasShares = await this.portfolioService.checkAvailableShares(
        userId,
        instrumentId,
        size
      );

      if (!hasShares) {
        throw new ValidationError('Insufficient shares for sale');
      }

      Logger.order('Shares validation passed', {
        userId,
        instrumentId,
        requiredShares: size,
        side: 'SELL',
      });
    }
  }
}
