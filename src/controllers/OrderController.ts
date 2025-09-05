import { Request, Response, NextFunction } from 'express';
// TODO: Implementar path aliases correctamente para imports más limpios
import { OrderService } from '../services/OrderService';
import { CreateOrderDto } from '../dto/index';
import { Logger } from '../utils/logger';
import { AppError } from '../middlewares/errorHandler';

interface RequestWithValidatedData extends Request {
  validatedData?: CreateOrderDto;
}

export class OrderController {
  private orderService = new OrderService();

  /**
   * POST /api/orders
   * Crear y enviar nueva orden al mercado
   */
  createOrder = async (
    req: RequestWithValidatedData,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const orderDto = req.validatedData;

      if (!orderDto) {
        throw new AppError('Order data is required and must be validated', 400);
      }

      Logger.order('Creating new order', { ...orderDto });

      const order = await this.orderService.createOrder(orderDto);

      Logger.order('Order created successfully', {
        orderId: order.id,
        status: order.status,
        side: order.side,
        instrumentId: order.instrumentId,
      });

      res.status(201).json({
        success: true,
        data: order,
        timestamp: new Date().toISOString(),
        message: 'Order created and processed successfully',
      });
    } catch (error) {
      Logger.error('Error creating order', error as Error);
      next(error);
    }
  };

  /**
   * GET /api/orders/user/:userId
   * Obtener historial de órdenes de un usuario
   */
  getUserOrders = async (
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

      const limitParam = req.query.limit as string;
      const limit = limitParam ? parseInt(limitParam, 10) : 50;

      if (isNaN(limit) || limit <= 0 || limit > 200) {
        throw new AppError('Limit must be between 1 and 200', 400);
      }

      Logger.order('Getting user orders', { userId, limit });

      const orders = await this.orderService.getUserOrders(userId, limit);

      Logger.order('User orders retrieved successfully', {
        userId,
        ordersCount: orders.length,
      });

      res.status(200).json({
        success: true,
        data: orders,
        timestamp: new Date().toISOString(),
        message: `Retrieved ${orders.length} orders for user ${userId}`,
      });
    } catch (error) {
      Logger.error('Error getting user orders', error as Error);
      next(error);
    }
  };

  /**
   * GET /api/orders/:orderId
   * Obtener orden específica por ID
   */
  getOrderById = async (
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

      Logger.order('Getting order by ID', { orderId });

      const order = await this.orderService.getOrderById(orderId);

      if (!order) {
        throw new AppError('Order not found', 404);
      }

      Logger.order('Order retrieved successfully', { orderId });

      res.status(200).json({
        success: true,
        data: order,
        timestamp: new Date().toISOString(),
        message: 'Order retrieved successfully',
      });
    } catch (error) {
      Logger.error('Error getting order', error as Error);
      next(error);
    }
  };
}
