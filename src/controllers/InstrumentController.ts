import { Request, Response, NextFunction } from 'express';
import { InstrumentService } from '../services/InstrumentService';
import { Logger } from '../utils/logger';
import { AppError } from '../middlewares/errorHandler';
import {
  InstrumentSearchResponseDto,
  MarketDataApiResponseDto,
} from '../dto/responses';

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

      // Validar y parsear límite
      let searchLimit = 100;
      if (limit !== undefined && limit !== null) {
        const parsedLimit =
          typeof limit === 'string' ? parseInt(limit, 10) : Number(limit);
        if (!isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= 100) {
          searchLimit = parsedLimit;
        } else if (!isNaN(parsedLimit)) {
          throw new AppError('Limit must be between 1 and 100', 400);
        }
      }

      const instruments = await this.instrumentService.searchInstruments(
        query,
        searchLimit
      );

      const response: InstrumentSearchResponseDto = {
        success: true,
        total: instruments.length,
        limit: searchLimit,
        query: query.trim(),
        timestamp: new Date().toISOString(),
        message: `Found ${instruments.length} instrument${instruments.length !== 1 ? 's' : ''} matching "${query.trim()}"`,
        data: instruments,
      };

      res.status(200).json(response);
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

      const instrument =
        await this.instrumentService.getInstrumentById(instrumentId);

      if (!instrument) {
        throw new AppError('Instrument not found', 404);
      }

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
   * GET /api/instruments/:id/market-data?type={type}&startDate={date}&endDate={date}&limit={number}
   * Obtener datos de mercado de un instrumento
   * @param type - Opcional: Filtrar por tipo de instrumento
   * @param startDate - Opcional: Fecha inicio (YYYY-MM-DD)
   * @param endDate - Opcional: Fecha fin (YYYY-MM-DD)
   * @param limit - Opcional: Límite de registros (default 100, max 1000)
   */
  getMarketData = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const instrumentIdParam = req.params.id;
      const { type, startDate, endDate, limit } = req.query;

      if (!instrumentIdParam) {
        throw new AppError('Instrument ID is required', 400);
      }

      const instrumentId = parseInt(instrumentIdParam, 10);

      if (isNaN(instrumentId) || instrumentId <= 0) {
        throw new AppError('Invalid instrument ID provided', 400);
      }

      // Validar fechas si se proporcionan
      let validStartDate: string | undefined;
      let validEndDate: string | undefined;

      if (startDate) {
        const startDateObj = new Date(startDate as string);
        if (isNaN(startDateObj.getTime())) {
          throw new AppError('Invalid start date format. Use YYYY-MM-DD', 400);
        }
        validStartDate = startDate as string;
      }

      if (endDate) {
        const endDateObj = new Date(endDate as string);
        if (isNaN(endDateObj.getTime())) {
          throw new AppError('Invalid end date format. Use YYYY-MM-DD', 400);
        }
        validEndDate = endDate as string;
      }

      // Validar límite
      const validLimit = limit
        ? Math.min(parseInt(limit as string, 10), 1000)
        : 100;

      // 1. Verificar que el instrumento existe
      const instrument =
        await this.instrumentService.getInstrumentById(instrumentId);
      if (!instrument) {
        throw new AppError('Instrument not found', 404);
      }

      // 2. Verificar filtro de tipo si se proporciona
      if (
        type &&
        instrument.type.toUpperCase() !== (type as string).toUpperCase()
      ) {
        const response: MarketDataApiResponseDto = {
          success: true,
          total: 0,
          instrumentId,
          instrumentType: instrument.type,
          requestedType: type as string,
          timestamp: new Date().toISOString(),
          message: `Instrument type '${instrument.type}' does not match requested type '${type}'`,
          data: [],
        };

        res.status(200).json(response);
        return;
      }

      // 3. Buscar market data para el instrumento
      const marketDataList = await this.instrumentService.getMarketData(
        instrumentId,
        {
          startDate: validStartDate,
          endDate: validEndDate,
          limit: validLimit,
        }
      );

      if (marketDataList.length === 0) {
        const response: MarketDataApiResponseDto = {
          success: true,
          total: 0,
          instrumentId,
          instrumentType: instrument.type,
          dateRange:
            validStartDate || validEndDate
              ? {
                  startDate: validStartDate,
                  endDate: validEndDate,
                }
              : undefined,
          limit: validLimit,
          timestamp: new Date().toISOString(),
          message:
            'No market data available for this instrument with the specified filters',
          data: [],
        };

        res.status(200).json(response);
        return;
      }

      const response: MarketDataApiResponseDto = {
        success: true,
        total: marketDataList.length,
        instrumentId,
        instrumentType: instrument.type,
        dateRange:
          validStartDate || validEndDate
            ? {
                startDate: validStartDate,
                endDate: validEndDate,
              }
            : undefined,
        limit: validLimit,
        timestamp: new Date().toISOString(),
        message: `Retrieved ${marketDataList.length} market data record${marketDataList.length !== 1 ? 's' : ''}`,
        data: marketDataList,
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Error getting market data', error as Error);
      next(error);
    }
  };
}
