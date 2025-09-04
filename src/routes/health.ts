import { Router } from 'express';

const router = Router();

/**
 * GET /health
 * Health check endpoint
 */
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy - 🎯 TSX HOT RELOAD IS WORKING! 🎯',
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
