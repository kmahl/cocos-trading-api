import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/OrderService';
import { PortfolioService } from '../services/PortfolioService';
import { CreateOrderDto } from '../dto';
import { OrderSide, OrderType } from '../entities';
import { Logger } from '../utils/logger';
import { AppError } from '../middlewares/errorHandler';

/**
 * Controller para operaciones de efectivo (cash transfers)
 *
 * Reutiliza OrderService pero expone endpoints más intuitivos para cash operations.
 * Autocompleta campos específicos como instrumentId=66 (ARS), type=MARKET, price=1.
 */
export class CashController {
  private readonly orderService: OrderService;
  private readonly portfolioService: PortfolioService;
  private readonly ARS_INSTRUMENT_ID = 66; // ID del instrumento ARS (pesos)

  constructor() {
    this.orderService = new OrderService();
    this.portfolioService = new PortfolioService();
  }

  /**
   * POST /api/cash/deposit
   * Depositar efectivo en la cuenta del usuario
   */
  deposit = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { userId, amount } = req.body;

      // Validaciones básicas
      if (!userId || !amount) {
        throw new AppError('userId and amount are required', 400);
      }

      if (typeof userId !== 'number' || userId <= 0) {
        throw new AppError('userId must be a positive number', 400);
      }

      if (typeof amount !== 'number' || amount <= 0) {
        throw new AppError('amount must be a positive number', 400);
      }

      Logger.info(
        `Processing cash deposit for user ${userId}, amount: $${amount}`
      );

      // Autocompletar campos para cash deposit
      const orderDto: CreateOrderDto = {
        instrumentId: this.ARS_INSTRUMENT_ID,
        userId,
        side: OrderSide.CASH_IN,
        size: amount, // Para cash, size = amount
        type: OrderType.MARKET,
        price: 1, // Cash siempre vale 1 peso por peso
      };

      const order = await this.orderService.createOrder(orderDto);

      Logger.info(
        `Cash deposit completed for user ${userId}, order ID: ${order.id}`
      );

      res.status(201).json({
        success: true,
        data: {
          ...order,
          operation: 'CASH_DEPOSIT',
        },
        message: `Successfully deposited $${amount.toLocaleString()} to account`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      Logger.error(`Failed to process cash deposit:`, error as Error);
      next(error);
    }
  };

  /**
   * POST /api/cash/withdraw
   * Retirar efectivo de la cuenta del usuario
   */
  withdraw = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { userId, amount } = req.body;

      // Validaciones básicas
      if (!userId || !amount) {
        throw new AppError('userId and amount are required', 400);
      }

      if (typeof userId !== 'number' || userId <= 0) {
        throw new AppError('userId must be a positive number', 400);
      }

      if (typeof amount !== 'number' || amount <= 0) {
        throw new AppError('amount must be a positive number', 400);
      }

      Logger.info(
        `Processing cash withdrawal for user ${userId}, amount: $${amount}`
      );

      // Verificar fondos disponibles antes del retiro
      const portfolio = await this.portfolioService.getPortfolio(userId);
      const availableCash = portfolio.cashBalance.available;

      if (availableCash < amount) {
        throw new AppError(
          `Insufficient funds. Available: $${availableCash.toLocaleString()}, Requested: $${amount.toLocaleString()}`,
          400
        );
      }

      // Autocompletar campos para cash withdrawal
      const orderDto: CreateOrderDto = {
        instrumentId: this.ARS_INSTRUMENT_ID,
        userId,
        side: OrderSide.CASH_OUT,
        size: amount, // Para cash, size = amount
        type: OrderType.MARKET,
        price: 1, // Cash siempre vale 1 peso por peso
      };

      const order = await this.orderService.createOrder(orderDto);

      Logger.info(
        `Cash withdrawal completed for user ${userId}, order ID: ${order.id}`
      );

      res.status(201).json({
        success: true,
        data: {
          ...order,
          operation: 'CASH_WITHDRAWAL',
        },
        message: `Successfully withdrew $${amount.toLocaleString()} from account`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      Logger.error(`Failed to process cash withdrawal:`, error as Error);
      next(error);
    }
  };

  /**
   * GET /api/cash/balance/:userId
   * Obtener el balance de efectivo disponible
   */
  getBalance = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userIdParam = req.params.userId;
      if (!userIdParam) {
        throw new AppError('User ID is required', 400);
      }

      const userId = parseInt(userIdParam, 10);

      if (isNaN(userId) || userId <= 0) {
        throw new AppError('Invalid user ID', 400);
      }

      const portfolio = await this.portfolioService.getPortfolio(userId);

      res.status(200).json({
        success: true,
        data: {
          userId,
          totalCash: portfolio.cashBalance.total,
          availableCash: portfolio.cashBalance.available,
          reservedCash: portfolio.cashBalance.reserved,
        },
        message: 'Cash balance retrieved successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      Logger.error(`Failed to get cash balance:`, error as Error);
      next(error);
    }
  };
}
