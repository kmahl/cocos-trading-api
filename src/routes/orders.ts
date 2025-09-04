import { Router } from 'express';
import { OrderController } from '@controllers';
import { validateBody } from '@middlewares';
import { CreateOrderDto } from '@dto';

const router = Router();
const orderController = new OrderController();

/**
 * POST /orders
 * Crear y enviar nueva orden al mercado
 */
router.post('/', validateBody(CreateOrderDto), orderController.createOrder);

/**
 * GET /orders/user/:userId?limit={limit}
 * Obtener historial de órdenes de un usuario
 */
router.get('/user/:userId', orderController.getUserOrders);

/**
 * GET /orders/:orderId
 * Obtener orden específica por ID
 */
router.get('/:orderId', orderController.getOrderById);

export default router;
