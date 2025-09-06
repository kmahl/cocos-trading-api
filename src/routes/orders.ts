import { Router } from 'express';
// TODO: Implementar path aliases correctamente para imports más limpios
import { OrderController } from '../controllers/OrderController';
import { validateBody } from '../middlewares/dtoValidation';
import { CreateOrderDto } from '../dto/index';

const router = Router();
const orderController = new OrderController();

/**
 * POST /orders
 * Crear y enviar nueva orden al mercado
 */
router.post('/', validateBody(CreateOrderDto), orderController.createOrder);

/**
 * GET /orders/user/:userId?limit={limit}&status={status}
 * Obtener historial de órdenes de un usuario
 * Query params:
 * - limit: número máximo de órdenes (1-200, default: 50)
 * - status: filtrar por estado (NEW, FILLED, REJECTED, CANCELLED)
 */
router.get('/user/:userId', orderController.getUserOrders);

/**
 * GET /orders/:orderId
 * Obtener orden específica por ID
 */
router.get('/:orderId', orderController.getOrderById);

/**
 * PUT /orders/:orderId/cancel
 * Cancelar orden específica
 */
router.put('/:orderId/cancel', orderController.cancelOrder);

export default router;
