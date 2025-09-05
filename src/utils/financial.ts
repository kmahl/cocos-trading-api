export const toNumberOrZero = (value: any): number => {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

/**
 * Calcular rendimiento entre dos montos
 */
export const calculatePerformancePercent = (
  currentAmount: number,
  baseAmount: number
): number => {
  const current = toNumberOrZero(currentAmount);
  const base = toNumberOrZero(baseAmount);

  if (base <= 0 || current <= 0) {
    return 0;
  }

  return ((current - base) / base) * 100;
};

/**
 * Calcular valor de mercado para una posición
 */
export const calculateMarketValue = (
  quantity: number,
  pricePerUnit: number
): number => {
  return toNumberOrZero(quantity) * toNumberOrZero(pricePerUnit);
};

/**
 * Validar si un monto monetario es válido
 */
export const isValidAmount = (amount: number): boolean => {
  const num = toNumberOrZero(amount);
  return num >= 0;
};

/**
 * Formatear monto a 2 decimales
 */
export const formatCurrency = (amount: number): number => {
  return Number(toNumberOrZero(amount).toFixed(2));
};
