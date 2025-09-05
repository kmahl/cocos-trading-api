/**
 * Instrument Service
 */

import { AppDataSource } from '../data-source/index';
import { Instrument } from '../entities/Instrument';
import { MarketData } from '../entities/MarketData';
import { Logger } from '../utils/logger';
import { InstrumentResponseDto, MarketDataResponseDto } from '../dto/responses';
import { AppError } from '../middlewares/errorHandler';

export class InstrumentService {
  private instrumentRepository = AppDataSource.getRepository(Instrument);
  private marketDataRepository = AppDataSource.getRepository(MarketData);

  /**
   * Buscar instrumentos por ticker o nombre
   */
  async searchInstruments(
    query: string,
    limit: number = 100
  ): Promise<InstrumentResponseDto[]> {
    if (!query || query.trim().length < 1) {
      return [];
    }

    const searchTerm = query.trim();

    try {
      const instruments = await this.instrumentRepository
        .createQueryBuilder('instrument')
        .where('UPPER(instrument.ticker) LIKE UPPER(:searchTerm)', {
          searchTerm: `%${searchTerm}%`,
        })
        .orWhere('UPPER(instrument.name) LIKE UPPER(:searchTerm)', {
          searchTerm: `%${searchTerm}%`,
        })
        .orWhere('UPPER(instrument.type) LIKE UPPER(:searchTerm)', {
          searchTerm: `%${searchTerm}%`,
        })
        .orderBy('instrument.ticker', 'ASC')
        .limit(limit)
        .getMany();

      return instruments.map((instrument: Instrument) => ({
        id: instrument.id,
        ticker: instrument.ticker,
        name: instrument.name,
        type: instrument.type,
      }));
    } catch (error) {
      Logger.error('Error searching instruments', error as Error);
      throw new AppError('Failed to search instruments', 500);
    }
  }

  /**
   * Obtener datos de mercado para un instrumento con filtros opcionales
   */
  async getMarketData(
    instrumentId: number,
    options?: {
      startDate?: string;
      endDate?: string;
      limit?: number;
    }
  ): Promise<MarketDataResponseDto[]> {
    try {
      const queryBuilder = this.marketDataRepository
        .createQueryBuilder('md')
        .where('md.instrumentid = :instrumentId', { instrumentId });

      // Aplicar filtros de fecha
      if (options?.startDate) {
        queryBuilder.andWhere('md.date >= :startDate', {
          startDate: options.startDate,
        });
      }

      if (options?.endDate) {
        queryBuilder.andWhere('md.date <= :endDate', {
          endDate: options.endDate,
        });
      }

      // Ordenar por fecha descendente (más reciente primero)
      queryBuilder.orderBy('md.date', 'DESC');

      // Aplicar límite
      if (options?.limit && options.limit > 0) {
        queryBuilder.limit(Math.min(options.limit, 1000));
      }

      const marketDataList = await queryBuilder.getMany();

      if (marketDataList.length === 0) {
        return [];
      }

      // Procesar registros
      return marketDataList.map(marketData => {
        // Manejo robusto de fechas
        let dateString: string;
        try {
          if (marketData.date instanceof Date) {
            dateString = marketData.date.toISOString();
          } else if (typeof marketData.date === 'string') {
            dateString = new Date(marketData.date).toISOString();
          } else {
            dateString = new Date().toISOString();
          }
        } catch {
          dateString = new Date().toISOString();
        }

        return {
          instrumentId: marketData.instrumentId,
          high: marketData.high,
          low: marketData.low,
          open: marketData.open,
          close: marketData.close,
          previousClose: marketData.previousClose,
          date: dateString,
        };
      });
    } catch (error) {
      Logger.error('Error getting market data', error as Error);
      throw new AppError(
        `Failed to get market data for instrument ${instrumentId}`,
        500
      );
    }
  }

  /**
   * Obtener instrumento por ID
   */
  async getInstrumentById(id: number): Promise<InstrumentResponseDto | null> {
    try {
      const instrument = await this.instrumentRepository.findOne({
        where: { id },
      });

      if (!instrument) {
        return null;
      }

      return {
        id: instrument.id,
        ticker: instrument.ticker,
        name: instrument.name,
        type: instrument.type,
      };
    } catch (error) {
      Logger.error('Error getting instrument', error as Error);
      throw new AppError('Failed to get instrument', 500);
    }
  }

  /**
   * Obtener precio actual de un instrumento
   * @returns El precio de cierre más reciente, o 0 si no hay datos
   */
  async getCurrentPrice(instrumentId: number): Promise<number> {
    try {
      const marketDataList = await this.getMarketData(instrumentId, {
        limit: 1,
      });

      if (marketDataList.length === 0) {
        return 0;
      }

      return marketDataList[0]?.close || 0;
    } catch (error) {
      Logger.error('Error getting current price', error as Error);
      return 0;
    }
  }
}
