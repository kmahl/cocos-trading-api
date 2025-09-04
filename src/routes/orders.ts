import { Router } from 'express';
// TODO: Implementar path aliases correctamente para imports más limpios
import { OrderController } from '../controllers/OrderController';
import { validateBody } from '../middlewares/validation';
import { CreateOrderDto } from '../dto/index';

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
