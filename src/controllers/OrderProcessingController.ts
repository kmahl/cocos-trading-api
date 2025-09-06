import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/OrderService';
import { Logger } from '../utils/logger';
import { AppError } from '../middlewares/errorHandler';

/**
 * Controller para simular el procesamiento de órdenes por cola
 * Esto simula lo que haría un worker de Bull Queue
 */
export class OrderProcessingController {
  private orderService = new OrderService();

  /**
   * POST /api/orders/process/:orderId
   * Procesar una orden específica - Simula worker individual
   */
  processOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const orderIdParam = req.params.orderId;

      if (!orderIdParam) {
        throw new AppError('Order ID is required', 400);
      }

      const orderId = parseInt(orderIdParam, 10);

      if (isNaN(orderId) || orderId <= 0) {
        throw new AppError('Invalid order ID provided', 400);
      }

      Logger.order('Processing individual order', { orderId });

      const processedOrder = await this.orderService.processOrderById(orderId);

      Logger.order('Order processed successfully', {
        orderId: processedOrder.id,
        status: processedOrder.status,
        executionPrice: processedOrder.price,
      });

      res.status(200).json({
        success: true,
        data: processedOrder,
        timestamp: new Date().toISOString(),
        message: 'Order processed successfully',
      });
    } catch (error) {
      Logger.error('Error processing order', error as Error);
      next(error);
    }
  };

  /**
   * POST /api/orders/process-batch
   * Procesar múltiples órdenes pendientes - Simula worker batch
   */
  processBatchOrders = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { limit = 10 } = req.body;

      if (limit <= 0 || limit > 100) {
        throw new AppError('Limit must be between 1 and 100', 400);
      }

      Logger.order('Processing batch orders', { limit });

      const processedOrders =
        await this.orderService.processPendingOrders(limit);

      Logger.order('Batch processing completed', {
        processedCount: processedOrders.length,
        limit,
      });

      res.status(200).json({
        success: true,
        data: {
          processedOrders,
          count: processedOrders.length,
        },
        timestamp: new Date().toISOString(),
        message: `Processed ${processedOrders.length} orders successfully`,
      });
    } catch (error) {
      Logger.error('Error processing batch orders', error as Error);
      next(error);
    }
  };

  /**
   * GET /api/orders/pending
   * Obtener órdenes pendientes en la cola
   */
  getPendingOrders = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const limitParam = req.query.limit as string;
      const limit = limitParam ? parseInt(limitParam, 10) : 50;

      if (isNaN(limit) || limit <= 0 || limit > 100) {
        throw new AppError('Limit must be between 1 and 100', 400);
      }

      Logger.order('Getting pending orders', { limit });

      const pendingOrders = await this.orderService.getPendingOrders(limit);

      Logger.order('Pending orders retrieved', {
        count: pendingOrders.length,
        limit,
      });

      res.status(200).json({
        success: true,
        data: {
          orders: pendingOrders,
          count: pendingOrders.length,
        },
        timestamp: new Date().toISOString(),
        message: 'Pending orders retrieved successfully',
      });
    } catch (error) {
      Logger.error('Error getting pending orders', error as Error);
      next(error);
    }
  };
}
