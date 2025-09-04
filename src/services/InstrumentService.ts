/**
 * Instrument Service
 *
 * Service para manejo de instrumentos financieros y datos de mercado
 */

import { AppDataSource } from '../data-source/index';
import { Instrument } from '../entities/Instrument';
import { MarketData } from '../entities/MarketData';
import { Logger } from '../utils/logger';
import { InstrumentResponseDto, MarketDataResponseDto } from '../dto/responses';

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
      throw new Error('Failed to search instruments');
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
          instrumentId: marketData.instrumentid,
          high: marketData.high,
          low: marketData.low,
          open: marketData.open,
          close: marketData.close,
          previousClose: marketData.previousclose,
          date: dateString,
        };
      });
    } catch (error) {
      Logger.error('Error getting market data', error as Error);
      throw new Error(
        `Failed to get market data for instrument ${instrumentId}`
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
      throw new Error('Failed to get instrument');
    }
  }

  /**
   * Obtener precios actuales de múltiples instrumentos en batch
   * ⚡ OPTIMIZACIÓN: 1 query en lugar de N queries
   * TODO: Ver si esto va a servir
   */
  async getCurrentPricesBatch(
    instrumentIds: number[]
  ): Promise<Map<number, number>> {
    if (instrumentIds.length === 0) {
      return new Map();
    }

    try {
      const marketDataResults = await this.marketDataRepository
        .createQueryBuilder('md')
        .select(['md.instrumentid', 'md.close'])
        .where('md.instrumentid IN (:...instrumentIds)', { instrumentIds })
        .distinctOn(['md.instrumentid'])
        .orderBy('md.instrumentid')
        .addOrderBy('md.date', 'DESC')
        .getRawMany();

      const pricesMap = new Map<number, number>();

      // Inicializar todos con 0
      for (const instrumentId of instrumentIds) {
        pricesMap.set(instrumentId, 0);
      }

      // Actualizar con precios reales
      for (const row of marketDataResults) {
        const instrumentId = Number(row.md_instrumentid);
        let price = 0;

        if (row.md_close !== null && row.md_close !== undefined) {
          const priceValue = Number(row.md_close);
          price = isNaN(priceValue) ? 0 : priceValue;
        }

        pricesMap.set(instrumentId, price);
      }

      return pricesMap;
    } catch (error) {
      Logger.error('Error getting batch prices', error as Error);
      throw new Error('Failed to get batch prices');
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

  /**
   * Verificar si un instrumento existe
   */
  async instrumentExists(instrumentId: number): Promise<boolean> {
    try {
      const instrument = await this.getInstrumentById(instrumentId);
      return instrument !== null;
    } catch (error) {
      Logger.error('Error checking if instrument exists', error as Error);
      return false;
    }
  }
}
