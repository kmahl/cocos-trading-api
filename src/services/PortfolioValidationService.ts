/**
 * Portfolio Validation Service
 *
 * Aplica SRP: Se enfoca únicamente en validaciones de portfolio
 * Para ser usado por OrderService y OrderValidator
 */

import { PortfolioService } from './PortfolioService';
import { Logger } from '../utils/logger';

export class PortfolioValidationService {
  private portfolioService: PortfolioService;

  constructor(portfolioService?: PortfolioService) {
    this.portfolioService = portfolioService || new PortfolioService();
  }

  /**
   * Verificar si el usuario tiene suficiente cash para una compra
   */
  async checkAvailableCash(
    userId: number,
    requiredAmount: number
  ): Promise<boolean> {
    try {
      const portfolio = await this.portfolioService.getPortfolio(userId);
      const hasEnoughCash = portfolio.cashBalance.available >= requiredAmount;

      Logger.portfolio('Cash availability checked', {
        userId,
        requiredAmount,
        availableCash: portfolio.cashBalance.available,
        totalCash: portfolio.cashBalance.total,
        reservedCash: portfolio.cashBalance.reserved,
        hasEnoughCash,
      });

      return hasEnoughCash;
    } catch (error) {
      Logger.error('Error checking available cash', {
        userId,
        requiredAmount,
        error,
      });
      return false;
    }
  }

  /**
   * Verificar si el usuario tiene suficientes acciones para una venta
   */
  async checkAvailableShares(
    userId: number,
    instrumentId: number,
    requiredShares: number
  ): Promise<boolean> {
    try {
      // No es el metodo más eficiente, pero reutiliza lógica existente
      const portfolio = await this.portfolioService.getPortfolio(userId);
      const position = portfolio.positions.find(
        p => p.instrumentId === instrumentId
      );
      const hasEnoughShares = position
        ? position.quantity.available >= requiredShares
        : false;

      Logger.portfolio('Shares availability checked', {
        userId,
        instrumentId,
        requiredShares,
        availableShares: position?.quantity.available ?? 0,
        totalShares: position?.quantity.total ?? 0,
        reservedShares: position?.quantity.reserved ?? 0,
        hasEnoughShares,
      });

      return hasEnoughShares;
    } catch (error) {
      Logger.error('Error checking available shares', {
        userId,
        instrumentId,
        requiredShares,
        error,
      });
      return false;
    }
  }

  /**
   * Método centralizado para validar fondos/acciones según el tipo de orden
   * Elimina duplicación entre OrderStatusService y OrderExecutionService
   */
  async validateOrderFunds(
    userId: number,
    instrumentId: number,
    side: string,
    size: number,
    price: number
  ): Promise<boolean> {
    if (side === 'BUY') {
      const requiredAmount = size * price;
      return await this.checkAvailableCash(userId, requiredAmount);
    } else if (side === 'SELL') {
      return await this.checkAvailableShares(userId, instrumentId, size);
    }

    // Para CASH_IN/CASH_OUT siempre retornar true
    return true;
  }

  /**
   * Versión que lanza excepción en lugar de retornar boolean
   * Para usar en contextos donde se necesita throw instead of return
   */
  async validateOrderFundsOrThrow(
    userId: number,
    instrumentId: number,
    side: string,
    size: number,
    price: number
  ): Promise<void> {
    const isValid = await this.validateOrderFunds(
      userId,
      instrumentId,
      side,
      size,
      price
    );

    if (!isValid) {
      if (side === 'BUY') {
        throw new Error('Insufficient available cash balance');
      } else if (side === 'SELL') {
        throw new Error('Insufficient available shares');
      }
    }
  }
}
