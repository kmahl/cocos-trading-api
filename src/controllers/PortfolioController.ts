import { Request, Response, NextFunction } from 'express';
import { PortfolioService } from '../services/PortfolioService';
import { Logger } from '../utils/logger';
import { AppError } from '../middlewares/errorHandler';

export class PortfolioController {
  private portfolioService = new PortfolioService();

  /**
   * GET /api/portfolio/:userId
   * Obtener portfolio completo del usuario
   */
  getPortfolio = async (
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
        throw new AppError('Invalid user ID provided', 400);
      }

      Logger.api('Getting portfolio', { userId });

      const portfolio = await this.portfolioService.getPortfolio(userId);

      Logger.api('Portfolio retrieved successfully', {
        userId,
        totalValue: portfolio.totalValue,
        positionsCount: portfolio.positions.length,
      });

      res.status(200).json({
        success: true,
        data: portfolio,
        timestamp: new Date().toISOString(),
        message: 'Portfolio retrieved successfully',
      });
    } catch (error) {
      Logger.error('Error getting portfolio', error as Error);
      next(error);
    }
  };
}
