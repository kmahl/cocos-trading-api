import { Router } from 'express';
import { PortfolioController } from '@controllers';
import { validateParams } from '@middlewares';
import { GetPortfolioDto } from '@dto';

const router = Router();
const portfolioController = new PortfolioController();

/**
 * GET /portfolio/:userId
 * Obtener portfolio completo del usuario
 */
router.get(
  '/:userId',
  validateParams(GetPortfolioDto),
  portfolioController.getPortfolio
);

export default router;
