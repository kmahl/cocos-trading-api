/**
 * Cash Calculator Service
 *
 * Aplica SRP: Se enfoca únicamente en cálculos de cash balance
 * Implementa el algoritmo: CashBalance = Cash_in - Cash_out - Purchases + Sales
 */

import { Order, OrderSide } from '../entities/Order';
import { CashCalculationResult } from '../types/portfolio';
import { ICashCalculator } from '../types/interfaces';
import { Logger } from '../utils/logger';

export class CashCalculator implements ICashCalculator {
  calculateCashBalance(filledOrders: Order[]): CashCalculationResult {
    let cashBalance = 0;
    const purchases: Order[] = [];
    const sales: Order[] = [];

    // Las órdenes ya vienen filtradas como FILLED desde OrderRepository.getFilledOrdersByUserId()
    for (const order of filledOrders) {
      const price = order.price ?? 0;
      const amount = order.size * price;
      // Acá no multiplico por price los cash in/out porque hay casos donde es null, prefiero asumirlo como 1
      // Y para los BUY/SELL si es null lo trato como 0 para no afectar el cash balance (asumo que es regalo)
      switch (order.side) {
        case OrderSide.CASH_IN:
          cashBalance += order.size;
          break;

        case OrderSide.CASH_OUT:
          cashBalance -= order.size;
          break;

        case OrderSide.BUY:
          cashBalance -= amount;
          purchases.push(order);
          break;

        case OrderSide.SELL:
          cashBalance += amount;
          sales.push(order);
          break;
      }
    }

    Logger.portfolio('Cash balance calculated', {
      cashBalance,
      totalOrders: filledOrders.length,
      purchases: purchases.length,
      sales: sales.length,
    });

    return {
      cashBalance,
      purchases,
      sales,
    };
  }
}
