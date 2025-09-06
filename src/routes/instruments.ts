import { Router } from 'express';
import { InstrumentController } from '../controllers/InstrumentController';
import { validateQuery } from '../middlewares/dtoValidation';
import { SearchInstrumentsDto, GetMarketDataDto } from '../dto/index';

const router = Router();
const instrumentController = new InstrumentController();

/**
 * @swagger
 * /instruments/search:
 *   get:
 *     tags: [Instruments]
 *     summary: Search financial instruments
 *     description: |
 *       Search instruments by ticker symbol or company name.
 *       Supports case-insensitive partial matching.
 *
 *       **Search Examples:**
 *       - Ticker: "DYCA" → finds "DYCA"
 *       - Name: "molinos" → finds "Molinos Agro S.A."
 *       - Partial: "s.a" → finds companies with "S.A." in name
 *       - Type: "ACCIONES" → finds all stock instruments
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *         description: Search term (ticker, name, or instrument type)
 *         example: "dyca"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Maximum number of results
 *         example: 10
 *     responses:
 *       200:
 *         description: Search results found
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
 *                         $ref: '#/components/schemas/Instrument'
 *             examples:
 *               ticker_search:
 *                 summary: Search by ticker
 *                 value:
 *                   success: true
 *                   data:
 *                     - id: 1
 *                       ticker: "DYCA"
 *                       name: "Distribuidora YPF Costa Argentina S.A."
 *                       type: "ACCIONES"
 *                   message: "Search completed successfully"
 *               name_search:
 *                 summary: Search by company name
 *                 value:
 *                   success: true
 *                   data:
 *                     - id: 4
 *                       ticker: "MOLA"
 *                       name: "Molinos Agro S.A."
 *                       type: "ACCIONES"
 *                   message: "Search completed successfully"
 *               no_results:
 *                 summary: No results found
 *                 value:
 *                   success: true
 *                   data: []
 *                   message: "No instruments found matching search criteria"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/search',
  validateQuery(SearchInstrumentsDto),
  instrumentController.searchInstruments
);

/**
 * @swagger
 * /instruments/{id}:
 *   get:
 *     tags: [Instruments]
 *     summary: Get instrument by ID
 *     description: Retrieve detailed information about a specific financial instrument
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Instrument ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Instrument found
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Instrument'
 *             examples:
 *               stock:
 *                 summary: Stock instrument
 *                 value:
 *                   success: true
 *                   data:
 *                     id: 1
 *                     ticker: "DYCA"
 *                     name: "Distribuidora YPF Costa Argentina S.A."
 *                     type: "ACCIONES"
 *                   message: "Instrument retrieved successfully"
 *               currency:
 *                 summary: Currency instrument
 *                 value:
 *                   success: true
 *                   data:
 *                     id: 66
 *                     ticker: "ARS"
 *                     name: "PESOS"
 *                     type: "MONEDA"
 *                   message: "Instrument retrieved successfully"
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/:id', instrumentController.getInstrumentById);

/**
 * @swagger
 * /instruments/{id}/market-data:
 *   get:
 *     tags: [Instruments]
 *     summary: Get instrument market data
 *     description: |
 *       Get historical and current market data for a specific instrument.
 *       Includes prices, volumes, and trading information.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Instrument ID
 *         example: 4
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [ACCIONES, MONEDA]
 *         description: Filter by instrument type
 *         example: "ACCIONES"
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for data range (YYYY-MM-DD)
 *         example: "2024-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for data range (YYYY-MM-DD)
 *         example: "2024-01-31"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 100
 *         description: Maximum number of records
 *         example: 50
 *     responses:
 *       200:
 *         description: Market data retrieved successfully
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
 *                         $ref: '#/components/schemas/MarketData'
 *             examples:
 *               with_data:
 *                 summary: Market data available
 *                 value:
 *                   success: true
 *                   data:
 *                     - id: 1
 *                       instrumentId: 4
 *                       high: 140.50
 *                       low: 135.00
 *                       open: 138.25
 *                       close: 139.75
 *                       previousClose: 137.80
 *                       date: "2024-01-15T16:00:00Z"
 *                   message: "Market data retrieved successfully"
 *               no_data:
 *                 summary: No market data available
 *                 value:
 *                   success: true
 *                   data: []
 *                   message: "No market data available for this instrument"
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/:id/market-data',
  validateQuery(GetMarketDataDto),
  instrumentController.getMarketData
);

export default router;
