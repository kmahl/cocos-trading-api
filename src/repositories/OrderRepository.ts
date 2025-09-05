/**
 * Order Repository
 *
 * Aplica Repository Pattern: Encapsula el acceso a datos de Orders
 * Aplica SRP: Se enfoca únicamente en queries de órdenes
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../data-source/index';
import { Order, OrderStatus } from '../entities/Order';
import { Logger } from '../utils/logger';
import { IOrderRepository } from '../types/interfaces';

export class OrderRepository implements IOrderRepository {
  private repository: Repository<Order>;

  constructor() {
    this.repository = AppDataSource.getRepository(Order);
  }

  /**
   * Obtener órdenes ejecutadas de un usuario con instrumentos
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
   * Obtener todas las órdenes ejecutadas (FILLED) de un usuario específico
   *
   * CRÍTICO: Ordenamiento cronológico en DB para garantizar cálculos correctos
   * - Las órdenes funcionan como un libro contable secuencial
   * - El promedio ponderado depende del orden cronológico de ejecución
   * - Incluye relación con instrument para evitar N+1 queries
   *
   * @param userId - ID del usuario
   * @returns Array de órdenes ejecutadas ordenadas cronológicamente
   */
  async getFilledOrdersByUserId(userId: number): Promise<Order[]> {
    try {
      const orders = await this.repository.find({
        where: {
          userId: userId,
          status: OrderStatus.FILLED,
        },
        relations: ['instrument'], // Incluir instrument para evitar N+1 queries
        order: {
          datetime: 'ASC', // CRÍTICO: Orden cronológico para cálculos de promedio ponderado
        },
      });

      return orders;
    } catch (error) {
      const err = error instanceof Error ? error.message : 'Unknown error';
      Logger.error('Error retrieving filled orders', { userId, error: err });
      throw new Error(
        `Error retrieving filled orders for user ${userId}: ${err}`
      );
    }
  }
}
