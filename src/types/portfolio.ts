/**
 * Portfolio Types
 *
 * Define las interfaces para el manejo de portfolios de usuarios
 */

export interface PortfolioResponseDto {
  userId: number;
  accountNumber: string;
  totalValue: number;
  cashBalance: number;
  positions: PositionDto[];
}

export interface PositionDto {
  instrumentId: number;
  ticker: string;
  name: string;
  quantity: number;
  currentPrice: number;
  marketValue: number;
  totalReturnPercent: number;
}

export interface Position {
  instrumentId: number;
  ticker: string;
  name: string;
  quantity: number;
  averageCost: number;
  marketValue: number;
  totalReturnPercent: number;
  totalInvestment: number;
  realizedGains: number;
}

export interface CashCalculationResult {
  cashBalance: number;
  purchases: any[];
  sales: any[];
}

export interface PositionCalculationResult {
  quantity: number;
  averageCost: number;
  marketValue: number;
  totalReturnPercent: number;
  totalInvestment: number;
  realizedGains: number;
}
