/**
 * Order Service - Orchestrates order creation and management
 */

import { Order, OrderStatus } from '../entities/Order';
import { Logger } from '../utils/logger';
import { CreateOrderDto, OrderSideDto, OrderTypeDto } from '../dto/index';
import { OrderResponseDto } from '../dto/responses';
import { PortfolioValidationService } from './PortfolioValidationService';
import { AppError, ValidationError } from '../middlewares/errorHandler';
import { InstrumentService } from './InstrumentService';
import { OrderRepository } from '../repositories/OrderRepository';
import { OrderCalculationService } from './OrderCalculationService';
import { OrderStatusService } from './OrderStatusService';
import { OrderExecutionService } from './OrderExecutionService';

export class OrderService {
  private orderRepository: OrderRepository;
  private portfolioValidationService: PortfolioValidationService;
  private instrumentService: InstrumentService;
  private calculationService: OrderCalculationService;
  private statusService: OrderStatusService;
  private executionService: OrderExecutionService;

  constructor(
    orderRepository?: OrderRepository,
    portfolioValidationService?: PortfolioValidationService,
    instrumentService?: InstrumentService,
    calculationService?: OrderCalculationService,
    statusService?: OrderStatusService,
    executionService?: OrderExecutionService
  ) {
    this.orderRepository = orderRepository || new OrderRepository();
    this.portfolioValidationService =
      portfolioValidationService || new PortfolioValidationService();
    this.instrumentService = instrumentService || new InstrumentService();
    this.calculationService =
      calculationService || new OrderCalculationService();
    this.statusService =
      statusService || new OrderStatusService(this.portfolioValidationService);
    this.executionService =
      executionService ||
      new OrderExecutionService(
        this.portfolioValidationService,
        this.orderRepository
      );
  }

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

    await this.validateOrder(orderDto);

    const currentPrice =
      await this.instrumentService.getCurrentPrice(instrumentId);
    if (!currentPrice) {
      throw new ValidationError('Unable to get current price for instrument');
    }

    const { executionPrice, executionSize } =
      this.calculationService.calculateOrderExecution(
        type,
        currentPrice,
        size,
        amount,
        price
      );

    if (executionSize <= 0) {
      throw new ValidationError('Invalid order size calculated');
    }

    const orderStatus = await this.statusService.determineInitialStatus(
      userId,
      instrumentId,
      side,
      executionSize,
      executionPrice
    );

    const savedOrder = await this.orderRepository.create({
      instrumentId,
      userId,
      side,
      size: executionSize,
      price: executionPrice,
      type,
      status: orderStatus,
      datetime: new Date(),
    });

    Logger.order('Order created', {
      orderId: savedOrder.id,
      status: orderStatus,
    });

    if (orderStatus === OrderStatus.REJECTED) {
      return this.mapOrderToResponse(savedOrder);
    }

    if (type === OrderTypeDto.MARKET) {
      await this.executionService.executeOrder(savedOrder.id);
      const processedOrder = await this.getOrderById(savedOrder.id);
      if (!processedOrder) {
        throw new AppError('Failed to retrieve processed order', 500);
      }
      return processedOrder;
    }

    return this.mapOrderToResponse(savedOrder);
  }

  /**
   * Cancelar una orden pendiente
   */
  async cancelOrder(
    orderId: number,
    userId: number
  ): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    if (order.userId !== userId) {
      throw new AppError('Unauthorized to cancel this order', 403);
    }

    // Solo se pueden cancelar órdenes en estado NEW
    if (order.status !== OrderStatus.NEW) {
      throw new ValidationError(
        `Cannot cancel order with status ${order.status}`
      );
    }

    Logger.order('Cancelling order', {
      orderId,
      userId,
      previousStatus: order.status,
    });

    // Cambiar estado a CANCELLED (libera automáticamente las reservas)
    order.status = OrderStatus.CANCELLED;
    await this.orderRepository.save(order);

    Logger.order('Order cancelled successfully', {
      orderId,
      userId,
      status: order.status,
    });

    // Retornar orden actualizada
    const cancelledOrder = await this.getOrderById(orderId);
    if (!cancelledOrder) {
      throw new AppError('Failed to retrieve cancelled order', 500);
    }

    return cancelledOrder;
  }

  /**
   * Obtener orden por ID
   */
  async getOrderById(orderId: number): Promise<OrderResponseDto | null> {
    const order = await this.orderRepository.findById(orderId, ['instrument']);

    if (!order) {
      return null;
    }

    return {
      id: order.id,
      instrumentId: order.instrumentId,
      userId: order.userId,
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
    limit: number = 50,
    status?: string
  ): Promise<OrderResponseDto[]> {
    Logger.order('Getting user orders', { userId, limit, status });

    // Construir condiciones de búsqueda
    const whereConditions: any = { userId: userId };

    // Agregar filtro de status si se proporciona
    if (status) {
      const normalizedStatus = status.trim().toUpperCase();
      const validStatuses = Object.values(OrderStatus) as string[];

      if (!validStatuses.includes(normalizedStatus)) {
        throw new ValidationError(
          `Invalid status '${status}'. Valid values are: ${validStatuses.join(', ')}`
        );
      }

      whereConditions.status = normalizedStatus as OrderStatus;
    }

    const orders = await this.orderRepository.find({
      where: whereConditions,
      relations: ['instrument'],
      order: { datetime: 'DESC' },
      take: limit,
    });

    return orders.map(order => ({
      id: order.id,
      instrumentId: order.instrumentId,
      userId: order.userId,
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
   * Procesar orden - Simula el worker de cola
   * Este método sería llamado por un endpoint separado
   */
  async processOrderById(orderId: number): Promise<OrderResponseDto> {
    await this.processOrder(orderId);

    const processedOrder = await this.getOrderById(orderId);
    if (!processedOrder) {
      throw new AppError('Failed to retrieve processed order', 500);
    }

    return processedOrder;
  }

  /**
   * Procesar múltiples órdenes pendientes - Simula procesamiento en batch
   */
  async processPendingOrders(limit: number = 10): Promise<OrderResponseDto[]> {
    Logger.order('Processing pending orders', { limit });

    // Obtener órdenes pendientes
    const pendingOrders = await this.orderRepository.find({
      where: { status: OrderStatus.NEW },
      order: { datetime: 'ASC' }, // FIFO
      take: limit,
    });

    const processedOrders: OrderResponseDto[] = [];

    for (const order of pendingOrders) {
      try {
        const processed = await this.processOrderById(order.id);
        processedOrders.push(processed);
      } catch (error) {
        Logger.error('Failed to process order', {
          orderId: order.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    Logger.order('Batch processing completed', {
      processed: processedOrders.length,
      total: pendingOrders.length,
    });

    return processedOrders;
  }

  /**
   * Obtener órdenes pendientes
   */
  async getPendingOrders(limit: number = 50): Promise<OrderResponseDto[]> {
    const orders = await this.orderRepository.find({
      where: { status: OrderStatus.NEW },
      relations: ['instrument'],
      order: { datetime: 'ASC' },
      take: limit,
    });

    return orders.map(order => ({
      id: order.id,
      instrumentId: order.instrumentId,
      userId: order.userId,
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

  private async processOrder(orderId: number): Promise<void> {
    await this.executionService.executeOrder(orderId);
  }

  /**
   * Validar fondos disponibles usando PortfolioValidationService
   */
  private async validateFundsWithReserves(
    userId: number,
    instrumentId: number,
    side: OrderSideDto,
    size: number,
    price: number
  ): Promise<void> {
    if (side === OrderSideDto.BUY) {
      // Para BUY: validar cash disponible (ya considera reservas)
      const requiredAmount = size * price;
      const hasEnoughCash =
        await this.portfolioValidationService.checkAvailableCash(
          userId,
          requiredAmount
        );

      if (!hasEnoughCash) {
        throw new ValidationError('Insufficient available cash balance');
      }

      Logger.order('Cash validation passed', {
        userId,
        requiredAmount,
        side: 'BUY',
      });
    } else {
      // Para SELL: validar acciones disponibles (ya considera reservas)
      const hasEnoughShares =
        await this.portfolioValidationService.checkAvailableShares(
          userId,
          instrumentId,
          size
        );

      if (!hasEnoughShares) {
        throw new ValidationError('Insufficient available shares');
      }

      Logger.order('Shares validation passed', {
        userId,
        instrumentId,
        requiredShares: size,
        side: 'SELL',
      });
    }
  }

  /**
   * Validar orden antes de crear
   */
  private async validateOrder(orderDto: CreateOrderDto): Promise<void> {
    const { instrumentId, type, size, amount, price } = orderDto;

    // Verificar que el instrumento existe
    const instrument =
      await this.instrumentService.getInstrumentById(instrumentId);
    if (!instrument) {
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
   * Validar fondos disponibles AL MOMENTO DEL PROCESAMIENTO
   * Esta validación considera el estado ACTUAL del portfolio
   */
  private async validateOrderFundsAtProcessing(
    userId: number,
    instrumentId: number,
    side: OrderSideDto,
    size: number,
    price: number
  ): Promise<void> {
    if (side === OrderSideDto.BUY) {
      // Validar cash disponible para compra
      const requiredAmount = size * price;
      const hasCash = await this.portfolioValidationService.checkAvailableCash(
        userId,
        requiredAmount
      );

      if (!hasCash) {
        throw new ValidationError(
          'Insufficient cash balance for purchase at processing time'
        );
      }

      Logger.order('Cash validation passed at processing', {
        userId,
        requiredAmount,
        side: 'BUY',
      });
    } else {
      // SELL
      // Validar acciones disponibles para venta
      const hasShares =
        await this.portfolioValidationService.checkAvailableShares(
          userId,
          instrumentId,
          size
        );

      if (!hasShares) {
        throw new ValidationError(
          'Insufficient shares for sale at processing time'
        );
      }

      Logger.order('Shares validation passed at processing', {
        userId,
        instrumentId,
        requiredShares: size,
        side: 'SELL',
      });
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
      const hasCash = await this.portfolioValidationService.checkAvailableCash(
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
      const hasShares =
        await this.portfolioValidationService.checkAvailableShares(
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

  /**
   * Mapear entidad Order a DTO de respuesta
   */
  private mapOrderToResponse(order: Order): OrderResponseDto {
    return {
      id: order.id,
      instrumentId: order.instrumentId,
      userId: order.userId,
      side: order.side,
      size: order.size,
      price: order.price || 0,
      type: order.type,
      status: order.status,
      datetime: order.datetime.toISOString(),
    };
  }
}
