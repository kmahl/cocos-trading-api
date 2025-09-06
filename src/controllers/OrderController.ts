import { Request, Response, NextFunction } from 'express';
// TODO: Implementar path aliases correctamente para imports más limpios
import { OrderService } from '../services/OrderService';
import { CreateOrderDto, OrderSideDto } from '../dto/index';
import { Logger } from '../utils/logger';
import { AppError } from '../middlewares/errorHandler';

interface RequestWithValidatedData extends Request {
  validatedData?: CreateOrderDto;
}

export class OrderController {
  private orderService = new OrderService();

  /**
   * POST /api/orders
   * Crear y enviar nueva orden al mercado (solo BUY/SELL)
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

      // Validación: solo permitir BUY/SELL en endpoint de orders
      if (
        orderDto.side !== OrderSideDto.BUY &&
        orderDto.side !== OrderSideDto.SELL
      ) {
        throw new AppError(
          'Orders endpoint only accepts BUY and SELL orders. Use /api/cash/ endpoints for cash operations.',
          400
        );
      }

      Logger.order('Creating new trading order', { ...orderDto });

      const order = await this.orderService.createOrder(orderDto);

      Logger.order('Trading order created successfully', {
        orderId: order.id,
        status: order.status,
        side: order.side,
        instrumentId: order.instrumentId,
      });

      // Determinar mensaje basado en el status de la orden
      let message: string;
      let success: boolean = true;

      switch (order.status) {
        case 'FILLED':
          message = 'Order executed successfully';
          break;
        case 'NEW':
          message = 'Limit order created and pending execution';
          break;
        case 'REJECTED':
          message = `Order rejected: ${this.getRejectReasonFromSide(orderDto.side)}`;
          success = false; // La orden fue rechazada, es un fallo desde la perspectiva del usuario
          break;
        default:
          message = 'Order created successfully';
      }

      res.status(201).json({
        success,
        data: order,
        timestamp: new Date().toISOString(),
        message,
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

      const statusParam = req.query.status as string;

      Logger.order('Getting user orders', {
        userId,
        limit,
        status: statusParam,
      });

      const orders = await this.orderService.getUserOrders(
        userId,
        limit,
        statusParam
      );

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

  /**
   * PUT /api/orders/:orderId/cancel
   * Cancelar una orden existente
   * Solo se pueden cancelar órdenes con estado NEW
   * Requiere userId en el body para validar ownership
   */
  cancelOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const orderIdParam = req.params.orderId;
      const { userId } = req.body;

      if (!orderIdParam) {
        throw new AppError('Order ID is required', 400);
      }

      if (!userId) {
        throw new AppError('User ID is required in request body', 400);
      }

      const orderId = parseInt(orderIdParam, 10);
      const userIdNum = parseInt(userId, 10);

      if (isNaN(orderId) || orderId <= 0) {
        throw new AppError('Invalid order ID provided', 400);
      }

      if (isNaN(userIdNum) || userIdNum <= 0) {
        throw new AppError('Invalid user ID provided', 400);
      }

      Logger.order('Cancelling order', { orderId, userId: userIdNum });

      const cancelledOrder = await this.orderService.cancelOrder(
        orderId,
        userIdNum
      );

      Logger.order('Order cancelled successfully', {
        orderId: cancelledOrder.id,
        userId: userIdNum,
        previousStatus: 'NEW',
        currentStatus: cancelledOrder.status,
      });

      res.status(200).json({
        success: true,
        data: cancelledOrder,
        timestamp: new Date().toISOString(),
        message: 'Order cancelled successfully',
      });
    } catch (error) {
      Logger.error('Error cancelling order', error as Error);
      next(error);
    }
  };

  /**
   * Helper para generar mensaje de rechazo basado en el side de la orden
   */
  private getRejectReasonFromSide(side: OrderSideDto): string {
    if (side === OrderSideDto.BUY) {
      return 'Insufficient cash balance to complete purchase';
    } else if (side === OrderSideDto.SELL) {
      return 'Insufficient shares available to sell';
    }
    return 'Order validation failed';
  }
}
