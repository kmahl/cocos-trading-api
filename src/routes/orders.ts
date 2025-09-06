import { Router } from 'express';
import { OrderController } from '../controllers/OrderController';
import { validateBody } from '../middlewares/dtoValidation';
import { CreateOrderDto } from '../dto/index';

const router = Router();
const orderController = new OrderController();

/**
 * @swagger
 * /orders:
 *   post:
 *     tags: [Orders]
 *     summary: Create and send order to market
 *     description: |
 *       Create a new trading order. Supports both MARKET and LIMIT orders.
 *
 *       **Order Types:**
 *       - `MARKET`: Executes immediately at current market price (status becomes FILLED)
 *       - `LIMIT`: Sets specific price, stays pending until filled (status becomes NEW)
 *
 *       **Order Sides:**
 *       - `BUY`: Purchase shares (requires sufficient cash)
 *       - `SELL`: Sell shares (requires sufficient shares)
 *       - `CASH_IN`: Deposit cash to account
 *       - `CASH_OUT`: Withdraw cash from account
 *
 *       **Size vs Amount:**
 *       - Use `size` for exact number of shares
 *       - Use `amount` for total investment amount (calculates max shares)
 *       - Cannot use both simultaneously
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOrderRequest'
 *           examples:
 *             market_buy_size:
 *               summary: Market Buy Order (by shares)
 *               value:
 *                 instrumentId: 1
 *                 userId: 1
 *                 side: "BUY"
 *                 size: 100
 *                 type: "MARKET"
 *             market_buy_amount:
 *               summary: Market Buy Order (by amount)
 *               value:
 *                 instrumentId: 4
 *                 userId: 1
 *                 side: "BUY"
 *                 amount: 5000
 *                 type: "MARKET"
 *             limit_sell:
 *               summary: Limit Sell Order
 *               value:
 *                 instrumentId: 1
 *                 userId: 1
 *                 side: "SELL"
 *                 size: 50
 *                 price: 55.00
 *                 type: "LIMIT"
 *             cash_in:
 *               summary: Cash Deposit
 *               value:
 *                 instrumentId: 66
 *                 userId: 1
 *                 side: "CASH_IN"
 *                 size: 10000
 *                 type: "MARKET"
 *     responses:
 *       201:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Order'
 *             examples:
 *               market_filled:
 *                 summary: Market order executed immediately
 *                 value:
 *                   success: true
 *                   data:
 *                     id: 123
 *                     instrumentId: 1
 *                     userId: 1
 *                     side: "BUY"
 *                     size: 100
 *                     price: 52.75
 *                     type: "MARKET"
 *                     status: "FILLED"
 *                     datetime: "2024-01-15T10:30:00Z"
 *                   message: "Order created and processed successfully"
 *               limit_pending:
 *                 summary: Limit order stays pending
 *                 value:
 *                   success: true
 *                   data:
 *                     id: 124
 *                     instrumentId: 4
 *                     userId: 1
 *                     side: "SELL"
 *                     size: 50
 *                     price: 55.00
 *                     type: "LIMIT"
 *                     status: "NEW"
 *                     datetime: "2024-01-15T10:30:00Z"
 *                   message: "Order created successfully"
 *       400:
 *         description: Validation error or insufficient funds
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               insufficient_cash:
 *                 summary: Insufficient cash for purchase
 *                 value:
 *                   success: false
 *                   error: "Validation Error"
 *                   message: "Insufficient cash available for this order"
 *                   timestamp: "2024-01-15T10:30:00Z"
 *               insufficient_shares:
 *                 summary: Insufficient shares for sale
 *                 value:
 *                   success: false
 *                   error: "Validation Error"
 *                   message: "Insufficient shares available for this order"
 *                   timestamp: "2024-01-15T10:30:00Z"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/', validateBody(CreateOrderDto), orderController.createOrder);

/**
 * @swagger
 * /orders/user/{userId}:
 *   get:
 *     tags: [Orders]
 *     summary: Get user order history
 *     description: Get all orders for a specific user with optional filtering
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: User ID
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 200
 *           default: 50
 *         description: Maximum number of orders to return
 *         example: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [NEW, FILLED, REJECTED, CANCELLED]
 *         description: Filter by order status
 *         example: FILLED
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Order'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/user/:userId', orderController.getUserOrders);

/**
 * @swagger
 * /orders/{orderId}:
 *   get:
 *     tags: [Orders]
 *     summary: Get specific order details
 *     description: Retrieve detailed information about a specific order
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Order ID
 *         example: 123
 *     responses:
 *       200:
 *         description: Order retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Order'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/:orderId', orderController.getOrderById);

/**
 * @swagger
 * /orders/{orderId}/cancel:
 *   put:
 *     tags: [Orders]
 *     summary: Cancel specific order
 *     description: |
 *       Cancel a pending order. Only orders with status 'NEW' can be cancelled.
 *       Market orders cannot be cancelled as they execute immediately.
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Order ID to cancel
 *         example: 124
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Order'
 *             examples:
 *               cancelled:
 *                 summary: Successfully cancelled order
 *                 value:
 *                   success: true
 *                   data:
 *                     id: 124
 *                     status: "CANCELLED"
 *                   message: "Order cancelled successfully"
 *       400:
 *         description: Order cannot be cancelled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               already_filled:
 *                 summary: Order already executed
 *                 value:
 *                   success: false
 *                   error: "Validation Error"
 *                   message: "Cannot cancel order with status FILLED"
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put('/:orderId/cancel', orderController.cancelOrder);

export default router;
