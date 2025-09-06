/**
 * * This file defines interfaces for repositories, services, and validators
 */

import { Order } from '../entities/Order';
import { User } from '../entities/User';
import { Instrument } from '../entities/Instrument';
import { PortfolioResponseDto, OrderResponseDto } from '../dto/responses';
import { CreateOrderDto } from '../dto/index';
import { CashCalculationResult } from '../types/portfolio';
import { OrderValidationResult, OrderProcessingResult } from '../types/orders';
import {
  CurrentInstrumentMarketData,
  InstrumentMarketData,
} from '../types/market';

export interface IUserRepository {
  findById(id: number): Promise<User | null>;
  findByIdOrThrow(id: number): Promise<User>;
}
// TODO: ESTO NO TIENE TODOS LOS METODOS EXISTENTES EN ORDERREPOSITORY
export interface IOrderRepository {
  findByUserId(userId: number, limit?: number): Promise<Order[]>;
}
export interface IInstrumentRepository {
  findById(id: number): Promise<Instrument | null>;
  search(query: string, limit?: number): Promise<Instrument[]>;
  exists(id: number): Promise<boolean>;
}

export interface IMarketDataRepository {
  getCurrentMarketDataByInstruments(
    instrumentIds: number[]
  ): Promise<CurrentInstrumentMarketData[]>;
}

// Service interfaces for DIP
export interface IPortfolioService {
  getPortfolio(userId: number): Promise<PortfolioResponseDto>;
}

export interface ICashCalculator {
  calculateCashBalance(filledOrders: Order[]): CashCalculationResult;
}

export interface IPositionCalculator {
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
  }>;
}

export interface IOrderService {
  createOrder(orderDto: CreateOrderDto): Promise<OrderResponseDto>;
  getOrderById(id: number): Promise<OrderResponseDto | null>;
  getUserOrders(userId: number, limit?: number): Promise<OrderResponseDto[]>;
  validateOrder(orderDto: CreateOrderDto): Promise<OrderValidationResult>;
  processOrder(orderId: number): Promise<OrderProcessingResult>;
}

export interface IInstrumentService {
  searchInstruments(query: string, limit?: number): Promise<Instrument[]>;
  getMarketData(instrumentId: number): Promise<InstrumentMarketData | null>;
  getCurrentPrice(instrumentId: number): Promise<number>;
  getCurrentPricesBatch(instrumentIds: number[]): Promise<Map<number, number>>;
  instrumentExists(instrumentId: number): Promise<boolean>;
}

// Validation interfaces for SRP
export interface IOrderValidator {
  validateOrderData(orderDto: CreateOrderDto): ValidationResult;
  validateUserFunds(userId: number, amount: number): Promise<boolean>;
  validateUserShares(
    userId: number,
    instrumentId: number,
    shares: number
  ): Promise<boolean>;
}

// Error handling interface
export interface IErrorHandler {
  handleValidationError(error: ValidationError): never;
  handleNotFoundError(resource: string, id: number): never;
  handleInternalError(error: Error): never;
}

// Common types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
