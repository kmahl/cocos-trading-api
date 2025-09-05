import { Repository } from 'typeorm';
import { AppDataSource } from '../data-source/index';
import { User } from '../entities/User';
import { Logger } from '../utils/logger';
import { IUserRepository } from '../types/interfaces';

/**
 * UserRepository
 *
 * Responsabilidad única: Gestionar acceso a datos de usuarios
 * Separación clara entre lógica de negocio (Services) y acceso a datos (Repository)
 */
export class UserRepository implements IUserRepository {
  private repository: Repository<User>;

  constructor() {
    this.repository = AppDataSource.getRepository(User);
  }

  /**
   * Buscar usuario por ID con validación de existencia
   * Movido desde PortfolioService para seguir Repository Pattern
   */
  async findByIdOrThrow(userId: number): Promise<User> {
    Logger.query('Finding user by ID', { userId });

    const user = await this.repository.findOne({
      where: { id: userId },
    });

    if (!user) {
      const error = new Error(`User with ID ${userId} not found`);
      Logger.error('User not found', error);
      throw error;
    }

    Logger.query('User found successfully', {
      userId,
      accountNumber: user.accountNumber,
    });

    return user;
  }

  /**
   * Buscar usuario por ID sin lanzar error (puede devolver null)
   */
  async findById(userId: number): Promise<User | null> {
    Logger.query('Finding user by ID (nullable)', { userId });

    return await this.repository.findOne({
      where: { id: userId },
    });
  }
}
