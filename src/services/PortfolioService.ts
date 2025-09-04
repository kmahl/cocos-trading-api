/**
 * Portfolio Service
 *
 * 🚧 WIP: Service migrated to modular routes structure
 * Subject to changes based on business logic decisions
 *
 * Handles portfolio calculations using cash flow approach
 * Pending decision: MARKET orders with null prices handling
 */

// TODO: Implementar path aliases correctamente para imports más limpios
import { AppDataSource } from '../data-source/index';
import { User } from '../entities/User';
import { Order, OrderSide, OrderStatus } from '../entities/Order';
import { MarketData } from '../entities/MarketData';
import { Logger } from '../utils/logger';
import { PortfolioResponseDto, PositionDto } from '../dto/responses';
import { InstrumentService } from './InstrumentService';

interface Position {
  instrumentId: number;
  ticker: string;
  name: string;
  quantity: number;
  totalCost: number; // Dinero invertido en esta posición
}

interface CashFlow {
  availableCash: number;
  positions: Map<number, Position>;
}

export class PortfolioService {
  private userRepository = AppDataSource.getRepository(User);
  private orderRepository = AppDataSource.getRepository(Order);
  private marketDataRepository = AppDataSource.getRepository(MarketData);
  private instrumentService = new InstrumentService();

  async getPortfolio(userId: number): Promise<PortfolioResponseDto> {
    Logger.portfolio('Calculating portfolio', { userId });

    // 1. Verificar que el usuario existe
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    // 2. Obtener TODAS las órdenes del usuario (incluyendo CASH_IN/CASH_OUT)
    // Ordenadas cronológicamente para procesar el cash flow correctamente
    const allOrders = await this.orderRepository.find({
      where: { userid: userId },
      relations: ['instrument'],
      order: { datetime: 'ASC' },
    });

    Logger.portfolio('Found orders', {
      userId,
      totalOrders: allOrders.length,
    });

    // 3. Procesar cash flow y posiciones cronológicamente
    const cashFlow = await this.processCashFlow(allOrders);

    Logger.portfolio('Cash flow processed', {
      userId,
      availableCash: cashFlow.availableCash,
      activePositions: cashFlow.positions.size,
    });

    // 4. Obtener precios actuales de mercado en batch (optimización)
    const instrumentIds = Array.from(cashFlow.positions.keys());
    const marketPrices =
      await this.instrumentService.getCurrentPricesBatch(instrumentIds);

    // 5. Calcular valores actuales de mercado para cada posición
    const positions: PositionDto[] = [];
    let totalMarketValue = 0;

    for (const [instrumentId, position] of cashFlow.positions) {
      if (position.quantity <= 0) continue; // Solo posiciones activas

      // Obtener precio actual del mercado (ya cargado en batch)
      const currentPrice = marketPrices.get(instrumentId) || 0;

      // Calcular valores
      const marketValue = position.quantity * currentPrice;
      const averageCost = position.totalCost / position.quantity;
      const totalReturn =
        position.totalCost > 0
          ? ((marketValue - position.totalCost) / position.totalCost) * 100
          : 0;

      const positionDto: PositionDto = {
        instrumentId: position.instrumentId,
        ticker: position.ticker,
        name: position.name,
        quantity: position.quantity,
        averagePrice: Number(averageCost.toFixed(2)),
        currentPrice: Number(currentPrice.toFixed(2)),
        marketValue: Number(marketValue.toFixed(2)),
        performancePercent: Number(totalReturn.toFixed(2)),
      };

      positions.push(positionDto);
      totalMarketValue += marketValue;
    }

    // 6. Calcular valor total de la cuenta
    const totalAccountValue = cashFlow.availableCash + totalMarketValue;

    // 7. Construir respuesta del portfolio
    const portfolio: PortfolioResponseDto = {
      userId,
      accountNumber: user.accountnumber,
      totalValue: Number(totalAccountValue.toFixed(2)),
      cashBalance: Number(cashFlow.availableCash.toFixed(2)),
      totalPerformancePercent: 0, // TODO: calcular performance total de la cuenta
      positions,
      summary: {
        totalPositions: positions.length,
        totalInstruments: positions.length,
        lastUpdated: new Date().toISOString(),
      },
    };

    Logger.portfolio('Portfolio calculated successfully', {
      userId,
      totalValue: portfolio.totalValue,
      cashBalance: portfolio.cashBalance,
      positionsCount: positions.length,
    });

    return portfolio;
  }

  /**
   * Procesa todas las órdenes cronológicamente para calcular cash flow y posiciones
   */
  private async processCashFlow(orders: Order[]): Promise<CashFlow> {
    const cashFlow: CashFlow = {
      availableCash: 0,
      positions: new Map(),
    };

    for (const order of orders) {
      // Solo procesar órdenes ejecutadas (FILLED)
      if (order.status !== OrderStatus.FILLED) {
        continue; // Las órdenes no ejecutadas no afectan el cash flow
      }

      if (order.side === OrderSide.CASH_IN) {
        // Depósito de dinero
        cashFlow.availableCash += order.size; // size = amount para CASH_IN
        Logger.portfolio('Cash deposit', {
          amount: order.size,
          newBalance: cashFlow.availableCash,
        });
      } else if (order.side === OrderSide.CASH_OUT) {
        // Retiro de dinero
        cashFlow.availableCash -= order.size; // size = amount para CASH_OUT
        Logger.portfolio('Cash withdrawal', {
          amount: order.size,
          newBalance: cashFlow.availableCash,
        });
      } else if (order.side === OrderSide.BUY) {
        // Compra de acciones: -cash, +acciones
        // Para MARKET orders, buscar precio de ejecución en marketdata
        const executionPrice =
          order.price ||
          (await this.getExecutionPrice(order.instrumentid, order.datetime));
        const totalCost = executionPrice * order.size;

        if (executionPrice === 0) {
          Logger.portfolio('Warning: BUY order without execution price', {
            orderId: order.id,
            instrumentId: order.instrumentid,
            size: order.size,
            datetime: order.datetime,
          });
        }

        cashFlow.availableCash -= totalCost;

        // Actualizar posición
        const existing = cashFlow.positions.get(order.instrumentid) || {
          instrumentId: order.instrumentid,
          ticker: order.instrument!.ticker,
          name: order.instrument!.name,
          quantity: 0,
          totalCost: 0,
        };

        existing.quantity += order.size;
        existing.totalCost += totalCost;
        cashFlow.positions.set(order.instrumentid, existing);
      } else if (order.side === OrderSide.SELL) {
        // Venta de acciones: +cash, -acciones
        const totalReceived = (order.price || 0) * order.size;
        cashFlow.availableCash += totalReceived;

        // Actualizar posición
        const existing = cashFlow.positions.get(order.instrumentid);
        if (existing) {
          // Calcular costo proporcional de las acciones vendidas
          const avgCost = existing.totalCost / existing.quantity;
          const costOfSold = avgCost * order.size;

          existing.quantity -= order.size;
          existing.totalCost -= costOfSold;

          if (existing.quantity <= 0) {
            // Si se vendieron todas, eliminar la posición
            cashFlow.positions.delete(order.instrumentid);
          } else {
            cashFlow.positions.set(order.instrumentid, existing);
          }
        }
      }
    }

    return cashFlow;
  }

  /**
   * Obtiene el precio de ejecución para una orden MARKET
   * Busca el precio más cercano disponible en marketdata
   */
  private async getExecutionPrice(
    instrumentId: number,
    orderDate: Date
  ): Promise<number> {
    // Primero intentar el precio exacto de esa fecha
    let marketData = await this.marketDataRepository.findOne({
      where: {
        instrumentid: instrumentId,
        date: orderDate,
      },
    });

    // Si no hay precio exacto, buscar el más cercano anterior
    if (!marketData) {
      marketData = await this.marketDataRepository.findOne({
        where: { instrumentid: instrumentId },
        order: { date: 'DESC' },
      });
    }

    if (!marketData?.close) {
      Logger.portfolio('No execution price found', {
        instrumentId,
        orderDate: orderDate.toISOString(),
      });
      return 0;
    }

    const price = Number(marketData.close);
    return isNaN(price) ? 0 : price;
  }

  /**
   * Verificar si el usuario tiene suficiente cash para una compra
   */
  async checkAvailableCash(
    userId: number,
    requiredAmount: number
  ): Promise<boolean> {
    const portfolio = await this.getPortfolio(userId);
    return portfolio.cashBalance >= requiredAmount;
  }

  /**
   * Verificar si el usuario tiene suficientes acciones para una venta
   */
  async checkAvailableShares(
    userId: number,
    instrumentId: number,
    requiredShares: number
  ): Promise<boolean> {
    const portfolio = await this.getPortfolio(userId);
    const position = portfolio.positions.find(
      p => p.instrumentId === instrumentId
    );
    return position ? position.quantity >= requiredShares : false;
  }
}
