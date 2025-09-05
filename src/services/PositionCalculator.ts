/**
 * Position Calculator Service
 *
 * Aplica SRP: Se enfoca únicamente en cálculos de posiciones usando promedio ponderado
 * Implementa el algoritmo: CostoPromedioNuevo = (UnidadesPrevias×CostoPromedioPrevio + NuevasUnidades×PrecioCompra) / UnidadesTotales
 */

import { Order, OrderSide } from '../entities/Order';
import { Position, PositionCalculationResult } from '../types/portfolio';
import { IPositionCalculator } from '../types/interfaces';
import { Logger } from '../utils/logger';
import {
  toNumberOrZero,
  calculateMarketValue,
  calculatePerformancePercent,
  formatCurrency,
} from '../utils/financial';

export class PositionCalculator implements IPositionCalculator {
  calculatePositions(
    tradingOrders: Order[],
    marketPrices: Map<number, number>
  ): Position[] {
    const instrumentGroups = this.groupOrdersByInstrument(tradingOrders);
    const positions: Position[] = [];

    for (const [instrumentId, instrumentOrders] of instrumentGroups) {
      const currentMarketPrice = toNumberOrZero(marketPrices.get(instrumentId));
      const calculation = this.calculatePositionData(
        instrumentOrders,
        currentMarketPrice
      );

      if (calculation.quantity > 0) {
        const position: Position = {
          instrumentId,
          ticker: instrumentOrders[0]?.instrument?.ticker ?? '',
          name: instrumentOrders[0]?.instrument?.name ?? '',
          quantity: calculation.quantity,
          averageCost: formatCurrency(calculation.averageCost),
          marketValue: formatCurrency(calculation.marketValue),
          totalReturnPercent: formatCurrency(calculation.totalReturnPercent),
          totalInvestment: calculation.totalInvestment,
          realizedGains: calculation.realizedGains,
        };
        positions.push(position);
      }
    }

    Logger.portfolio('Positions calculated', {
      totalInstruments: instrumentGroups.size,
      activePositions: positions.length,
    });

    return positions;
  }

  private groupOrdersByInstrument(
    tradingOrders: Order[]
  ): Map<number, Order[]> {
    const groups = new Map<number, Order[]>();

    for (const order of tradingOrders) {
      const instrumentId = order.instrumentId;
      if (!groups.has(instrumentId)) {
        groups.set(instrumentId, []);
      }
      groups.get(instrumentId)!.push(order);
    }

    return groups;
  }

  private calculatePositionData(
    orders: Order[],
    currentMarketPrice: number
  ): PositionCalculationResult {
    let quantity = 0;
    let averageCost = 0;
    let totalInvestment = 0;
    let realizedGains = 0;

    // Las órdenes ya vienen ordenadas cronológicamente desde la DB (ORDER BY datetime ASC)
    // Esto garantiza que el procesamiento secuencial funcione como un libro contable
    for (const order of orders) {
      const pricePerUnit = toNumberOrZero(order.price);

      if (order.side === OrderSide.BUY) {
        const totalCost = quantity * averageCost + order.size * pricePerUnit;
        quantity += order.size;
        averageCost = quantity > 0 ? totalCost / quantity : 0;
        totalInvestment += order.size * pricePerUnit;
      } else if (order.side === OrderSide.SELL) {
        if (quantity <= 0) continue;

        const gain = (pricePerUnit - averageCost) * order.size;
        realizedGains += gain;
        quantity -= order.size;
      }
    }

    const marketValue = calculateMarketValue(quantity, currentMarketPrice);
    const totalReturnPercent =
      totalInvestment > 0
        ? calculatePerformancePercent(
            realizedGains + marketValue,
            totalInvestment
          )
        : 0;

    return {
      quantity,
      averageCost,
      marketValue,
      totalReturnPercent,
      totalInvestment,
      realizedGains,
    };
  }
}
