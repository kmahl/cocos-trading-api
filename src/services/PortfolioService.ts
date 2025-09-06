/**
 * Portfolio Service
 */

import { UserRepository } from '../repositories/UserRepository';
import { OrderRepository } from '../repositories/OrderRepository';
import { MarketDataRepository } from '../repositories/MarketDataRepository';
import { CashCalculator } from './CashCalculator';
import { PositionCalculator } from './PositionCalculator';
import { IPortfolioService } from '../types/interfaces';
import { PortfolioResponseDto } from '../dto/responses';
import { Logger } from '../utils/logger';
import { OrderSide } from '../entities/Order';

export class PortfolioService implements IPortfolioService {
  private userRepository = new UserRepository();
  private orderRepository = new OrderRepository();
  private marketDataRepository = new MarketDataRepository();
  private cashCalculator = new CashCalculator();
  private positionCalculator = new PositionCalculator();

  async getPortfolio(userId: number): Promise<PortfolioResponseDto> {
    Logger.portfolio('Getting portfolio', { userId });

    // 1. Verificar que el usuario existe
    const user = await this.userRepository.findByIdOrThrow(userId);

    // 2. Obtener todas las órdenes relevantes (FILLED + NEW)
    const allOrders = await this.orderRepository.getAllUserOrders(userId);

    // 3. Calcular cash balance con desglose completo (total, available, reserved)
    const cashResult = this.cashCalculator.calculateCashBalance(allOrders);

    // 4. Obtener instrumentos únicos de órdenes de trading (solo para market data)
    const instrumentIds = [
      ...new Set(
        allOrders
          .filter(
            order =>
              order.side === OrderSide.BUY || order.side === OrderSide.SELL
          )
          .map(order => order.instrumentId)
      ),
    ];

    // 5. Obtener precios de mercado para todos los instrumentos
    const marketData =
      await this.marketDataRepository.getCurrentMarketDataByInstruments(
        instrumentIds
      );
    const marketPrices = new Map(
      marketData.map(data => [data.instrumentId, data.currentPrice])
    );

    // 6. Calcular posiciones con desglose de reservas
    const positions = this.positionCalculator.calculatePositions(
      allOrders,
      marketPrices
    );

    // 7. Calcular valor total del portfolio
    const positionsValue = positions.reduce(
      (total, position) => total + position.marketValue,
      0
    );
    const totalValue = cashResult.cashBalance.total + positionsValue;

    Logger.portfolio('Portfolio calculated successfully', {
      userId,
      totalValue,
      cashTotal: cashResult.cashBalance.total,
      cashAvailable: cashResult.cashBalance.available,
      cashReserved: cashResult.cashBalance.reserved,
      positionsCount: positions.length,
    });

    return {
      userId: user.id,
      accountNumber: user.accountNumber,
      totalValue,
      cashBalance: cashResult.cashBalance,
      positions,
    };
  }
}
