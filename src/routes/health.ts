import { Router } from 'express';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Health check endpoint
 *     description: |
 *       Verify that the API service is running and healthy.
 *       Returns service status, uptime, and environment information.
 *
 *       Use this endpoint for:
 *       - Load balancer health checks
 *       - Monitoring system verification
 *       - Service discovery validation
 *     responses:
 *       200:
 *         description: Service is healthy and running
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           example: "healthy"
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-15T10:30:00Z"
 *                         uptime:
 *                           type: number
 *                           description: Server uptime in seconds
 *                           example: 3600.5
 *                         environment:
 *                           type: string
 *                           example: "development"
 *                         version:
 *                           type: string
 *                           example: "1.0.0"
 *                         service:
 *                           type: string
 *                           example: "cocos-trading-api"
 *             examples:
 *               healthy:
 *                 summary: Service is healthy
 *                 value:
 *                   success: true
 *                   data:
 *                     status: "healthy"
 *                     timestamp: "2024-01-15T10:30:00Z"
 *                     uptime: 3600.5
 *                     environment: "development"
 *                     version: "1.0.0"
 *                     service: "cocos-trading-api"
 *                   message: "Cocos Trading API is running"
 *       500:
 *         description: Service is experiencing issues
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      service: 'cocos-trading-api',
    },
    message: 'Cocos Trading API is running',
  });
});

export default router;
