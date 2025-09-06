import { Router } from 'express';

// Import individual route modules
import portfolioRoutes from './portfolio';
import instrumentRoutes from './instruments';
import orderRoutes from './orders';
import orderProcessingRoutes from './order-processing';
import healthRoutes from './health';

const router = Router();

// =============================================================================
// API ROUTES
// =============================================================================

/**
 * Portfolio routes
 * Base path: /api/portfolio
 */
router.use('/portfolio', portfolioRoutes);

/**
 * Instruments routes
 * Base path: /api/instruments
 */
router.use('/instruments', instrumentRoutes);

/**
 * Orders routes
 * Base path: /api/orders
 */
router.use('/orders', orderRoutes);

/**
 * Order Processing routes (simula cola de procesamiento)
 * Base path: /api/order-processing
 */
router.use('/order-processing', orderProcessingRoutes);

/**
 * Health check routes
 * Base path: /api/health
 */
router.use('/health', healthRoutes);

// =============================================================================
// ROOT ENDPOINT
// =============================================================================

/**
 * GET /api
 * API information endpoint
 */
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      name: 'Cocos Trading API',
      version: '1.0.0',
      description: 'API REST para sistema de trading',
      endpoints: {
        health: '/api/health',
        portfolio: '/api/portfolio/:userId',
        instruments: {
          search: '/api/instruments/search?q={query}',
          byId: '/api/instruments/:id',
          marketData: '/api/instruments/:id/market-data',
        },
        orders: {
          create: 'POST /api/orders',
          userHistory: '/api/orders/user/:userId',
          byId: '/api/orders/:orderId',
        },
        orderProcessing: {
          processOne: 'POST /api/order-processing/process/:orderId',
          processBatch: 'POST /api/order-processing/process-batch',
          pending: 'GET /api/order-processing/pending',
        },
      },
      documentation: 'Ver colección de Postman para ejemplos completos',
    },
    timestamp: new Date().toISOString(),
    message: 'Cocos Trading API - Challenge Backend',
  });
});

export default router;
