import { Router } from 'express';
import { CashController } from '../controllers/CashController';

/**
 * Rutas para operaciones de efectivo (cash transfers)
 *
 * Endpoints:
 * - POST /api/cash/deposit - Depositar efectivo
 * - POST /api/cash/withdraw - Retirar efectivo
 * - GET /api/cash/balance/:userId - Ver balance disponible
 */

const router = Router();

// Inicializar controller sin dependencias externas
const cashController = new CashController();

/**
 * @swagger
 * /api/cash/deposit:
 *   post:
 *     summary: Depositar efectivo en la cuenta
 *     tags: [Cash Operations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - amount
 *             properties:
 *               userId:
 *                 type: integer
 *                 description: ID del usuario
 *                 example: 1
 *               amount:
 *                 type: number
 *                 description: Monto a depositar en pesos
 *                 example: 10000
 *     responses:
 *       201:
 *         description: Depósito procesado exitosamente
 *       400:
 *         description: Error de validación
 */
router.post('/deposit', (req, res, next) => {
  cashController.deposit(req, res, next);
});

/**
 * @swagger
 * /api/cash/withdraw:
 *   post:
 *     summary: Retirar efectivo de la cuenta
 *     tags: [Cash Operations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - amount
 *             properties:
 *               userId:
 *                 type: integer
 *                 description: ID del usuario
 *                 example: 1
 *               amount:
 *                 type: number
 *                 description: Monto a retirar en pesos
 *                 example: 5000
 *     responses:
 *       201:
 *         description: Retiro procesado exitosamente
 *       400:
 *         description: Fondos insuficientes o error de validación
 */
router.post('/withdraw', (req, res, next) => {
  cashController.withdraw(req, res, next);
});

/**
 * @swagger
 * /api/cash/balance/{userId}:
 *   get:
 *     summary: Obtener balance de efectivo disponible
 *     tags: [Cash Operations]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario
 *     responses:
 *       200:
 *         description: Balance obtenido exitosamente
 *       400:
 *         description: ID de usuario inválido
 */
router.get('/balance/:userId', (req, res, next) => {
  cashController.getBalance(req, res, next);
});

export default router;
