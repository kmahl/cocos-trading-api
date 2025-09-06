import { Router } from 'express';
import { PortfolioController } from '../controllers/PortfolioController';
import { validateParams } from '../middlewares/dtoValidation';
import { GetPortfolioDto } from '../dto/index';

const router = Router();
const portfolioController = new PortfolioController();

/**
 * @swagger
 * /portfolio/{userId}:
 *   get:
 *     tags: [Portfolio]
 *     summary: Get user portfolio
 *     description: |
 *       Get complete user portfolio including:
 *       - Total portfolio value
 *       - Available cash (excluding reserved funds)
 *       - All positions with current market values
 *       - Performance calculations for each position
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: User ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Portfolio retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Portfolio'
 *             examples:
 *               success:
 *                 summary: Successful portfolio response
 *                 value:
 *                   success: true
 *                   data:
 *                     totalValue: 125000.50
 *                     availableCash: 25000.00
 *                     reservedCash: 5000.00
 *                     positions:
 *                       - instrument:
 *                           id: 1
 *                           ticker: "DYCA"
 *                           name: "Distribuidora YPF Costa Argentina S.A."
 *                           type: "ACCIONES"
 *                         quantity: 100
 *                         averagePrice: 45.50
 *                         currentPrice: 52.75
 *                         marketValue: 5275.00
 *                         totalCost: 4550.00
 *                         unrealizedPnL: 725.00
 *                         performance: 15.93
 *                   message: "Portfolio retrieved successfully"
 *                   timestamp: "2024-01-15T10:30:00Z"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/:userId',
  validateParams(GetPortfolioDto),
  portfolioController.getPortfolio
);

export default router;
