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
   * Método unificado para buscar orden por ID
   * @param orderId - ID de la orden a buscar
   * @param options - Opciones adicionales (relations, shouldThrow)
   */
  async findById(
    orderId: number,
    options: {
      relations?: string[];
      shouldThrow?: boolean;
    } = {}
  ): Promise<Order | null> {
    const { relations = [], shouldThrow = false } = options;

    Logger.query('Finding order by ID', { orderId, relations, shouldThrow });

    const queryOptions: any = { where: { id: orderId } };
    if (relations.length > 0) {
      queryOptions.relations = relations;
    }

    const order = await this.repository.findOne(queryOptions);

    if (!order && shouldThrow) {
      const error = new NotFoundError(`Order with ID ${orderId} not found`);
      Logger.error('Order not found', error);
      throw error;
    }

    if (order) {
      Logger.query('Order found successfully', {
        orderId,
        status: order.status,
        userId: order.userId,
      });
    }

    return order;
  }

  /**
   * Crear nueva orden (create + save)
   */
  async createAndSave(orderData: Partial<Order>): Promise<Order> {
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
   * Método unificado para guardar/actualizar orden
   */
  async save(order: Order): Promise<Order> {
    Logger.query('Saving/updating order', {
      orderId: order.id,
      status: order.status,
    });

    return await this.repository.save(order);
  }

  /**
   * Método unificado para buscar órdenes con filtros
   * @param options - Opciones de búsqueda de TypeORM
   * @param findOne - Si true, devuelve solo el primer resultado
   */
  async find(options: any): Promise<Order[]>;
  async find(options: any, findOne: true): Promise<Order | null>;
  async find(options: any, findOne: false): Promise<Order[]>;
  async find(
    options: any,
    findOne: boolean = false
  ): Promise<Order[] | Order | null> {
    Logger.query('Finding orders with filters', { options, findOne });

    if (findOne) {
      return await this.repository.findOne(options);
    }

    return await this.repository.find(options);
  }
}
