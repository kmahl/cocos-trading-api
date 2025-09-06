import { Router } from 'express';
import { OrderProcessingController } from '../controllers/OrderProcessingController';

const router = Router();
const orderProcessingController = new OrderProcessingController();

/**
 * POST /process/:orderId
 * Procesar una orden específica (simula worker individual)
 */
router.post('/process/:orderId', orderProcessingController.processOrder);

/**
 * POST /process-batch
 * Procesar múltiples órdenes pendientes (simula worker batch)
 */
router.post('/process-batch', orderProcessingController.processBatchOrders);

/**
 * GET /pending
 * Obtener órdenes pendientes en la cola
 */
router.get('/pending', orderProcessingController.getPendingOrders);

export default router;
