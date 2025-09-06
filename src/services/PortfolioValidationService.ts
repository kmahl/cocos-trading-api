/**
 * Portfolio Validation Service
 *
 * Aplica SRP: Se enfoca únicamente en validaciones de portfolio
 * Para ser usado por OrderService y OrderValidator
 */

import { PortfolioService } from './PortfolioService';
import { Logger } from '../utils/logger';

export class PortfolioValidationService {
  private portfolioService = new PortfolioService();

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
}
