import { Request, Response, NextFunction } from 'express';
import { InstrumentService } from '@services';
import { Logger } from '@utils';
import { AppError } from '@middlewares';

export class InstrumentController {
  private instrumentService = new InstrumentService();

  /**
   * GET /api/instruments/search?q={query}&limit={limit}
   * Buscar instrumentos por ticker o nombre
   */
  searchInstruments = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { q: query, limit } = req.query;

      if (!query || typeof query !== 'string') {
        throw new AppError('Search query is required', 400);
      }

      const searchLimit = limit ? parseInt(limit as string, 10) : 10;

      if (isNaN(searchLimit) || searchLimit <= 0 || searchLimit > 100) {
        throw new AppError('Limit must be between 1 and 100', 400);
      }

      Logger.api('Searching instruments', { query, limit: searchLimit });

      const instruments = await this.instrumentService.searchInstruments(
        query,
        searchLimit
      );

      Logger.api('Instruments search completed', {
        query,
        resultsCount: instruments.length,
      });

      res.status(200).json({
        success: true,
        data: instruments,
        timestamp: new Date().toISOString(),
        message: `Found ${instruments.length} instruments matching "${query}"`,
      });
    } catch (error) {
      Logger.error('Error searching instruments', error as Error);
      next(error);
    }
  };

  /**
   * GET /api/instruments/:id
   * Obtener instrumento por ID
   */
  getInstrumentById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const instrumentIdParam = req.params.id;

      if (!instrumentIdParam) {
        throw new AppError('Instrument ID is required', 400);
      }

      const instrumentId = parseInt(instrumentIdParam, 10);

      if (isNaN(instrumentId) || instrumentId <= 0) {
        throw new AppError('Invalid instrument ID provided', 400);
      }

      Logger.api('Getting instrument by ID', { instrumentId });

      const instrument =
        await this.instrumentService.getInstrumentById(instrumentId);

      if (!instrument) {
        throw new AppError('Instrument not found', 404);
      }

      Logger.api('Instrument retrieved successfully', { instrumentId });

      res.status(200).json({
        success: true,
        data: instrument,
        timestamp: new Date().toISOString(),
        message: 'Instrument retrieved successfully',
      });
    } catch (error) {
      Logger.error('Error getting instrument', error as Error);
      next(error);
    }
  };

  /**
   * GET /api/instruments/:id/market-data
   * Obtener datos de mercado de un instrumento
   */
  getMarketData = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const instrumentIdParam = req.params.id;

      if (!instrumentIdParam) {
        throw new AppError('Instrument ID is required', 400);
      }

      const instrumentId = parseInt(instrumentIdParam, 10);

      if (isNaN(instrumentId) || instrumentId <= 0) {
        throw new AppError('Invalid instrument ID provided', 400);
      }

      Logger.api('Getting market data', { instrumentId });

      const marketData =
        await this.instrumentService.getMarketData(instrumentId);

      if (!marketData) {
        throw new AppError('Market data not found for this instrument', 404);
      }

      Logger.api('Market data retrieved successfully', { instrumentId });

      res.status(200).json({
        success: true,
        data: marketData,
        timestamp: new Date().toISOString(),
        message: 'Market data retrieved successfully',
      });
    } catch (error) {
      Logger.error('Error getting market data', error as Error);
      next(error);
    }
  };
}
