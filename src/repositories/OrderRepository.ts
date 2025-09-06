/**
 * Order Repository
 *
 * Aplica Repository Pattern: Encapsula el acceso a datos de Orders
 * Aplica SRP: Se enfoca únicamente en queries de órdenes
 */

import { Repository, In } from 'typeorm';
import { AppDataSource } from '../data-source/index';
import { Order, OrderStatus } from '../entities/Order';
import { Logger } from '../utils/logger';
import { IOrderRepository } from '../types/interfaces';
import { AppError, NotFoundError } from '../middlewares/errorHandler';

export class OrderRepository implements IOrderRepository {
  private repository: Repository<Order>;

  constructor() {
    this.repository = AppDataSource.getRepository(Order);
  }

  /**
   * Obtener todas las órdenes relevantes de un usuario (FILLED + NEW)
   * Excluye REJECTED y CANCELLED para cálculos de portfolio
   */
  async getAllUserOrders(userId: number): Promise<Order[]> {
    try {
      return await this.repository.find({
        where: {
          userId: userId,
          status: In([OrderStatus.FILLED, OrderStatus.NEW]),
        },
        relations: ['instrument'],
        order: {
          datetime: 'ASC', // Importante para cálculos cronológicos
        },
      });
    } catch (error) {
      Logger.error('Error fetching all user orders', error as Error);
      throw new AppError('Failed to fetch user orders', 500);
    }
  }

  /**
   * Obtener órdenes ejecutadas de un usuario con instrumentos
   * @deprecated Usar getAllUserOrders() para portfolio calculations
   */
  async findByUserId(userId: number): Promise<Order[]> {
    try {
      return await this.repository.find({
        where: {
          userId: userId,
          status: OrderStatus.FILLED,
        },
        relations: ['instrument'],
        order: { datetime: 'ASC' },
      });
    } catch (error) {
      Logger.error('Error getting filled orders', error as Error);
      return [];
    }
  }

  /**
   * Buscar orden por ID (puede devolver null)
   */
  async findById(orderId: number, relations?: string[]): Promise<Order | null> {
    Logger.query('Finding order by ID', { orderId, relations });

    const options: any = { where: { id: orderId } };
    if (relations && relations.length > 0) {
      options.relations = relations;
    }

    return await this.repository.findOne(options);
  }

  /**
   * Crear nueva orden (create + save)
   */
  async create(orderData: Partial<Order>): Promise<Order> {
    Logger.query('Creating new order', {
      userId: orderData.userId,
      instrumentId: orderData.instrumentId,
      side: orderData.side,
      type: orderData.type,
    });

    const order = this.repository.create(orderData);
    const savedOrder = await this.repository.save(order);

    Logger.query('Order created successfully', {
      orderId: savedOrder.id,
      status: savedOrder.status,
    });

    return savedOrder;
  }

  /**
   * Actualizar orden existente
   */
  async update(order: Order): Promise<Order> {
    Logger.query('Updating order', {
      orderId: order.id,
      status: order.status,
    });

    return await this.repository.save(order);
  }

  /**
   * Buscar orden por ID con validación de existencia
   */
  async findByIdOrThrow(orderId: number): Promise<Order> {
    Logger.query('Finding order by ID', { orderId });

    const order = await this.repository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      const error = new NotFoundError(`Order with ID ${orderId} not found`);
      Logger.error('Order not found', error);
      throw error;
    }

    Logger.query('Order found successfully', {
      orderId,
      status: order.status,
      userId: order.userId,
    });

    return order;
  }

  /**
   * Buscar múltiples órdenes con filtros
   */
  async find(options: any): Promise<Order[]> {
    Logger.query('Finding orders with filters', options);
    return await this.repository.find(options);
  }

  /**
   * Buscar una orden con filtros
   */
  async findOne(options: any): Promise<Order | null> {
    Logger.query('Finding single order with filters', options);
    return await this.repository.findOne(options);
  }

  /**
   * Guardar orden (para updates)
   */
  async save(order: Order): Promise<Order> {
    return await this.repository.save(order);
  }
}
