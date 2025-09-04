import { Router } from 'express';
import { InstrumentController } from '@controllers';
import { validateQuery } from '@middlewares';
import { SearchInstrumentsDto } from '@dto';

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
 * GET /instruments/:id/market-data
 * Obtener datos de mercado de un instrumento
 */
router.get('/:id/market-data', instrumentController.getMarketData);

export default router;
