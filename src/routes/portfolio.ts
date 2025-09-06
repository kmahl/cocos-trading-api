import { Router } from 'express';
// TODO: Implementar path aliases correctamente para imports más limpios
import { PortfolioController } from '../controllers/PortfolioController';
import { validateParams } from '../middlewares/dtoValidation';
import { GetPortfolioDto } from '../dto/index';

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
