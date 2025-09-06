/**
 * Service Factory for dependency injection
 */

import { OrderService } from '../services/OrderService';
import { OrderCalculationService } from '../services/OrderCalculationService';
import { OrderStatusService } from '../services/OrderStatusService';
import { OrderExecutionService } from '../services/OrderExecutionService';
import { PortfolioValidationService } from '../services/PortfolioValidationService';
import { InstrumentService } from '../services/InstrumentService';
import { OrderRepository } from '../repositories/OrderRepository';

export class ServiceFactory {
  private static instance: ServiceFactory;

  private portfolioValidationService: PortfolioValidationService;
  private orderRepository: OrderRepository;
  private instrumentService: InstrumentService;
  private calculationService: OrderCalculationService;
  private statusService: OrderStatusService;
  private executionService: OrderExecutionService;

  private constructor() {
    this.portfolioValidationService = new PortfolioValidationService();
    this.orderRepository = new OrderRepository();
    this.instrumentService = new InstrumentService();
    this.calculationService = new OrderCalculationService();
    this.statusService = new OrderStatusService(
      this.portfolioValidationService
    );
    this.executionService = new OrderExecutionService(
      this.portfolioValidationService,
      this.orderRepository
    );
  }

  static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory();
    }
    return ServiceFactory.instance;
  }

  createOrderService(): OrderService {
    return new OrderService(
      this.orderRepository,
      this.portfolioValidationService,
      this.instrumentService,
      this.calculationService,
      this.statusService,
      this.executionService
    );
  }

  getPortfolioValidationService(): PortfolioValidationService {
    return this.portfolioValidationService;
  }

  getInstrumentService(): InstrumentService {
    return this.instrumentService;
  }

  getOrderRepository(): OrderRepository {
    return this.orderRepository;
  }
}
