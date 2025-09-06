/**
 * Order Validator Service
 */

import { CreateOrderDto } from '../dto/index';
import { OrderType } from '../entities/index';
import { IOrderValidator, ValidationResult } from '../types/interfaces';
import { PortfolioValidationService } from './PortfolioValidationService';
import { Logger } from '../utils/logger';

export class OrderValidator implements IOrderValidator {
  private portfolioValidationService = new PortfolioValidationService();

  /**
   * SRP: Validar estructura básica de la orden
   */
  validateOrderData(orderDto: CreateOrderDto): ValidationResult {
    const errors: string[] = [];

    // Validar que tenga size O amount, pero no ambos
    const hasSize = orderDto.size !== undefined && orderDto.size !== null;
    const hasAmount = orderDto.amount !== undefined && orderDto.amount !== null;

    if (hasSize === hasAmount) {
      errors.push(
        'Must provide either size (exact shares) OR amount (total investment), but not both'
      );
    }

    // Validar LIMIT orders tengan precio
    if (
      orderDto.type === OrderType.LIMIT &&
      (!orderDto.price || orderDto.price <= 0)
    ) {
      errors.push('LIMIT orders must have a valid price');
    }

    // Validar MARKET orders no tengan precio
    if (orderDto.type === OrderType.MARKET && orderDto.price) {
      errors.push('MARKET orders should not specify a price');
    }

    // Validar valores positivos
    if (orderDto.size && orderDto.size <= 0) {
      errors.push('Size must be positive');
    }

    if (orderDto.amount && orderDto.amount <= 0) {
      errors.push('Amount must be positive');
    }

    Logger.validation('Order data validation', {
      instrumentId: orderDto.instrumentId,
      isValid: errors.length === 0,
      errors: errors.length,
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * SRP: Validar fondos disponibles para compra
   */
  async validateUserFunds(
    userId: number,
    requiredAmount: number
  ): Promise<boolean> {
    const hasEnoughFunds =
      await this.portfolioValidationService.checkAvailableCash(
        userId,
        requiredAmount
      );

    Logger.validation('User funds validation', {
      userId,
      requiredAmount,
      hasEnoughFunds,
    });

    return hasEnoughFunds;
  }

  /**
   * SRP: Validar acciones disponibles para venta
   */
  async validateUserShares(
    userId: number,
    instrumentId: number,
    requiredShares: number
  ): Promise<boolean> {
    const hasEnoughShares =
      await this.portfolioValidationService.checkAvailableShares(
        userId,
        instrumentId,
        requiredShares
      );

    Logger.validation('User shares validation', {
      userId,
      instrumentId,
      requiredShares,
      hasEnoughShares,
    });

    return hasEnoughShares;
  }
}
