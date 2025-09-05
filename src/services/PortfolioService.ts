/**
 * Portfolio Service
 */

import { UserRepository } from '../repositories/UserRepository';
import { OrderRepository } from '../repositories/OrderRepository';
import { MarketDataRepository } from '../repositories/MarketDataRepository';
import { CashCalculator } from './CashCalculator';
import { PositionCalculator } from './PositionCalculator';
import { IPortfolioService } from '../types/interfaces';
import { PortfolioResponseDto, PositionDto } from '../dto/responses';
import { Position } from '../types/portfolio';
import { Order } from '../entities/Order';
import { Logger } from '../utils/logger';

export class PortfolioService implements IPortfolioService {
  private userRepository = new UserRepository();
  private orderRepository = new OrderRepository();
  private marketDataRepository = new MarketDataRepository();
  private cashCalculator = new CashCalculator();
  private positionCalculator = new PositionCalculator();

  async getPortfolio(userId: number): Promise<PortfolioResponseDto> {
    Logger.portfolio('Calculating portfolio', { userId });

    // 1. Verificar que el usuario existe
    const user = await this.userRepository.findByIdOrThrow(userId);

    // 2. Obtener órdenes ejecutadas del usuario
    const filledOrders =
      await this.orderRepository.getFilledOrdersByUserId(userId);

    // 3. Calcular cash balance
    const { cashBalance } =
      this.cashCalculator.calculateCashBalance(filledOrders);

    // 4. Obtener órdenes de trading y precios actuales para las posiciones
    // Solo necesitamos órdenes de trading (BUY/SELL), no CASH_IN/CASH_OUT
    const tradingOrders = this.extractTradingOrders(filledOrders);

    const instrumentIds = this.getUniqueInstrumentIds(tradingOrders);
    const marketData =
      await this.marketDataRepository.getCurrentMarketDataByInstruments(
        instrumentIds
      );
    const marketPrices = new Map(
      marketData.map(data => [data.instrumentId, data.currentPrice])
    );

    // 5. Calcular posiciones
    const positions = this.positionCalculator.calculatePositions(
      tradingOrders,
      marketPrices
    );

    // 6. Convertir a DTOs (sin recálculos redundantes)
    const positionDtos = this.buildPositionDtos(positions);

    // 7. Calcular valor total del portfolio (usar marketValue ya calculado)
    const totalMarketValue = positions.reduce(
      (sum, pos) => sum + pos.marketValue,
      0
    );
    const totalValue = cashBalance + totalMarketValue;

    Logger.portfolio('Portfolio calculated successfully', {
      userId,
      totalValue,
      cashBalance,
      positionsCount: positionDtos.length,
    });

    return {
      userId: user.id,
      accountNumber: user.accountNumber,
      totalValue: Number(totalValue.toFixed(2)),
      cashBalance: Number(cashBalance.toFixed(2)),
      positions: positionDtos,
    };
  }

  /**
   * Convertir posiciones a DTOs sin recálculos redundantes
   * Los valores ya vienen calculados desde PositionCalculator
   */
  private buildPositionDtos(positions: Position[]): PositionDto[] {
    return positions.map(position => ({
      instrumentId: position.instrumentId,
      ticker: position.ticker,
      name: position.name,
      quantity: position.quantity,
      currentPrice: Number(
        (position.marketValue / position.quantity).toFixed(2)
      ), // Derivado de marketValue
      marketValue: Number(position.marketValue.toFixed(2)),
      totalReturnPercent: Number(position.totalReturnPercent.toFixed(2)),
    }));
  }

  /**
   * Extraer órdenes de trading (BUY/SELL)
   * Excluye CASH_IN/CASH_OUT que no afectan posiciones de instrumentos
   */
  private extractTradingOrders(filledOrders: Order[]): Order[] {
    return filledOrders.filter(
      order => order.side === 'BUY' || order.side === 'SELL'
    );
  }

  /**
   * Obtener IDs únicos de instrumentos desde órdenes de trading
   */
  private getUniqueInstrumentIds(tradingOrders: Order[]): number[] {
    return [...new Set(tradingOrders.map(order => order.instrumentId))];
  }
}
