import { Router } from 'express';
// TODO: Implementar path aliases correctamente para imports más limpios
import { InstrumentController } from '../controllers/InstrumentController';
import { validateQuery } from '../middlewares/dtoValidation';
import { SearchInstrumentsDto, GetMarketDataDto } from '../dto/index';

const router = Router();
const instrumentController = new InstrumentController();

/**
 * GET /instruments/search?q={query}&limit={limit}
 * Buscar instrumentos por ticker o nombre
 */
router.get(
  '/search',
  validateQuery(SearchInstrumentsDto),
  instrumentController.searchInstruments
);

/**
 * GET /instruments/:id
 * Obtener instrumento por ID
 */
router.get('/:id', instrumentController.getInstrumentById);

/**
 * GET /instruments/:id/market-data?type={type}&startDate={date}&endDate={date}&limit={number}
 * Obtener datos de mercado de un instrumento
 * @param type - Opcional: Filtrar por tipo de instrumento (ACCIONES, MONEDA, etc.)
 * @param startDate - Opcional: Fecha inicio del rango (YYYY-MM-DD)
 * @param endDate - Opcional: Fecha fin del rango (YYYY-MM-DD)
 * @param limit - Opcional: Límite de registros (default 100, max 1000)
 */
router.get(
  '/:id/market-data',
  validateQuery(GetMarketDataDto),
  instrumentController.getMarketData
);

export default router;
