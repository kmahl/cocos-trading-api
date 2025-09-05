/**
 * Market Data Calculator Service
 */

export class MarketDataCalculator {
  /**
   * Calcular rendimiento entre dos precios
   * Utilidad general para cálculos de performance
   */
  static calculatePerformancePercent(
    currentPrice: number,
    basePrice: number
  ): number {
    if (basePrice <= 0 || currentPrice <= 0) {
      return 0;
    }

    return ((currentPrice - basePrice) / basePrice) * 100;
  }

  /**
   * Calcular valor de mercado para una posición
   * Utilidad para cálculos de posiciones individuales
   */
  static calculateMarketValue(quantity: number, price: number): number {
    return quantity * price;
  }

  /**
   * Validar si un precio es válido
   * Utilidad para validaciones de datos de mercado
   */
  static isValidPrice(price: number): boolean {
    return typeof price === 'number' && !isNaN(price) && price >= 0;
  }

  /**
   * Formatear precio a 2 decimales
   * Utilidad para presentación de datos
   */
  static formatPrice(price: number): number {
    return Number(price.toFixed(2));
  }
}
