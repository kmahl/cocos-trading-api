/**
 * Position Calculator Service
 *
 * Aplica SRP: Se enfoca únicamente en cálculos de posiciones usando promedio ponderado
 * Implementa el algoritmo: CostoPromedioNuevo = (UnidadesPrevias×CostoPromedioPrevio + NuevasUnidades×PrecioCompra) / UnidadesTotales
 */

import { Order, OrderSide, OrderStatus } from '../entities/Order';
import { PositionCalculationResult } from '../types/portfolio';
import { IPositionCalculator } from '../types/interfaces';
import { Logger } from '../utils/logger';
import {
  toNumberOrZero,
  calculateMarketValue,
  calculatePerformancePercent,
} from '../utils/financial';

export class PositionCalculator implements IPositionCalculator {
  calculatePositions(
    allOrders: Order[],
    marketPrices: Map<number, number>
  ): Array<{
    instrumentId: number;
    ticker: string;
    name: string;
    quantity: {
      total: number;
      available: number;
      reserved: number;
    };
    currentPrice: number;
    marketValue: number;
    totalReturnPercent: number;
  }> {
    // Filtrar solo órdenes de trading (BUY/SELL)
    const tradingOrders = allOrders.filter(
      order => order.side === OrderSide.BUY || order.side === OrderSide.SELL
    );

    const instrumentGroups = this.groupOrdersByInstrument(tradingOrders);
    const positions: any[] = [];

    for (const [instrumentId, instrumentOrders] of instrumentGroups) {
      const currentMarketPrice = toNumberOrZero(marketPrices.get(instrumentId));

      // Calcular cantidad total desde órdenes FILLED
      const filledOrders = instrumentOrders.filter(
        order => order.status === OrderStatus.FILLED
      );
      const calculation = this.calculatePositionData(
        filledOrders,
        currentMarketPrice
      );

      if (calculation.quantity > 0) {
        // Calcular acciones reservadas desde órdenes SELL NEW
        const reservedShares = instrumentOrders
          .filter(
            order =>
              order.status === OrderStatus.NEW && order.side === OrderSide.SELL
          )
          .reduce((total, order) => total + order.size, 0);

        const availableShares = calculation.quantity - reservedShares;

        positions.push({
          instrumentId,
          ticker: instrumentOrders[0]?.instrument?.ticker ?? '',
          name: instrumentOrders[0]?.instrument?.name ?? '',
          quantity: {
            total: calculation.quantity,
            available: availableShares,
            reserved: reservedShares,
          },
          currentPrice: currentMarketPrice,
          marketValue: calculation.marketValue,
          totalReturnPercent: calculation.totalReturnPercent,
        });
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
