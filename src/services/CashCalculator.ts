/**
 * Cash Calculator Service
 *
 * Aplica SRP: Se enfoca únicamente en cálculos de cash balance
 * Implementa el algoritmo: CashBalance = Cash_in - Cash_out - Purchases + Sales
 * Calcula: total (desde FILLED), reserved (desde NEW), available (total - reserved)
 */

import { Order, OrderSide, OrderStatus } from '../entities/Order';
import { CashCalculationResult } from '../types/portfolio';
import { ICashCalculator } from '../types/interfaces';
import { Logger } from '../utils/logger';

export class CashCalculator implements ICashCalculator {
  /**
   * Calcula cash balance completo desde todas las órdenes relevantes
   * @param allOrders Órdenes FILLED + NEW del usuario
   */
  calculateCashBalance(allOrders: Order[]): CashCalculationResult {
    let totalCash = 0;
    let reservedCash = 0;
    const purchases: Order[] = [];
    const sales: Order[] = [];

    for (const order of allOrders) {
      const price = order.price ?? 0;
      const amount = order.size * price;

      if (order.status === OrderStatus.FILLED) {
        // Procesar órdenes FILLED para el total
        switch (order.side) {
          case OrderSide.CASH_IN:
            totalCash += order.size;
            break;

          case OrderSide.CASH_OUT:
            totalCash -= order.size;
            break;

          case OrderSide.BUY:
            totalCash -= amount;
            purchases.push(order);
            break;

          case OrderSide.SELL:
            totalCash += amount;
            sales.push(order);
            break;
        }
      } else if (
        order.status === OrderStatus.NEW &&
        order.side === OrderSide.BUY
      ) {
        // Calcular cash reservado en órdenes BUY NEW
        reservedCash += amount;
      }
    }

    const availableCash = totalCash - reservedCash;

    Logger.portfolio('Cash balance calculated', {
      total: totalCash,
      available: availableCash,
      reserved: reservedCash,
      totalOrders: allOrders.length,
      purchases: purchases.length,
      sales: sales.length,
    });

    return {
      cashBalance: {
        total: totalCash,
        available: availableCash,
        reserved: reservedCash,
      },
      purchases,
      sales,
    };
  }
}
