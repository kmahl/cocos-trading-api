/**
 * Instrument Service
 *
 * 🚧 WIP: Service migrated to modular routes structure
 * Subject to changes based on business logic decisions
 */

import { AppDataSource } from '@data-source/index';
import { Instrument } from '@entities/Instrument';
import { MarketData } from '@entities/MarketData';
import { Logger } from '@utils/logger';
import { InstrumentResponseDto, MarketDataResponseDto } from '@dto/responses';

export class InstrumentService {
  private instrumentRepository = AppDataSource.getRepository(Instrument);
  private marketDataRepository = AppDataSource.getRepository(MarketData);

  /**
   * Buscar instrumentos por ticker o nombre
   */
  async searchInstruments(
    query: string,
    limit: number = 10
  ): Promise<InstrumentResponseDto[]> {
    Logger.api('Searching instruments', { query, limit });

    if (!query || query.trim().length < 1) {
      Logger.warn('Empty search query provided');
      return [];
    }

    const searchTerm = query.trim().toUpperCase();

    try {
      // Buscar por ticker (exacto primero) y luego por nombre (contiene)
      const instruments = await this.instrumentRepository
        .createQueryBuilder('instrument')
        .where('UPPER(instrument.ticker) LIKE :ticker', {
          ticker: `%${searchTerm}%`,
        })
        .orWhere('UPPER(instrument.name) LIKE :name', {
          name: `%${searchTerm}%`,
        })
        .orderBy('instrument.ticker', 'ASC')
        .limit(limit)
        .getMany();

      Logger.api('Instruments found', {
        query,
        resultCount: instruments.length,
      });

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
   * Obtener datos de mercado para un instrumento
   */
  async getMarketData(
    instrumentId: number
  ): Promise<MarketDataResponseDto | null> {
    Logger.api('Getting market data', { instrumentId });

    try {
      const marketData = await this.marketDataRepository.findOne({
        where: { instrumentid: instrumentId },
        order: { date: 'DESC' },
      });

      if (!marketData) {
        Logger.warn('No market data found', { instrumentId });
        return null;
      }

      return {
        instrumentId: marketData.instrumentid,
        high: marketData.high,
        low: marketData.low,
        open: marketData.open,
        close: marketData.close,
        previousClose: marketData.previousclose,
        date: marketData.date.toISOString(),
      };
    } catch (error) {
      Logger.error('Error getting market data', error as Error);
      throw new Error('Failed to get market data');
    }
  }

  /**
   * Obtener instrumento por ID
   */
  async getInstrumentById(id: number): Promise<InstrumentResponseDto | null> {
    Logger.api('Getting instrument by ID', { id });

    try {
      const instrument = await this.instrumentRepository.findOne({
        where: { id },
      });

      if (!instrument) {
        Logger.warn('Instrument not found', { id });
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
   */
  async getCurrentPricesBatch(
    instrumentIds: number[]
  ): Promise<Map<number, number>> {
    if (instrumentIds.length === 0) {
      return new Map();
    }

    Logger.api('Getting current prices batch', {
      instrumentCount: instrumentIds.length,
      instrumentIds,
    });

    try {
      // Query TypeORM optimizada con DISTINCT ON
      const marketDataResults = await this.marketDataRepository
        .createQueryBuilder('md')
        .select(['md.instrumentid', 'md.close'])
        .where('md.instrumentid IN (:...instrumentIds)', { instrumentIds })
        .distinctOn(['md.instrumentid'])
        .orderBy('md.instrumentid')
        .addOrderBy('md.date', 'DESC')
        .getRawMany();

      // Una sola iteración: convertir resultados y manejar instrumentos sin datos
      const pricesMap = new Map<number, number>();

      // Primero, inicializar todos con 0
      for (const instrumentId of instrumentIds) {
        pricesMap.set(instrumentId, 0);
      }

      // Luego, actualizar con precios reales
      for (const row of marketDataResults) {
        const instrumentId = Number(row.md_instrumentid);
        let price = 0;

        if (row.md_close !== null && row.md_close !== undefined) {
          const priceValue = Number(row.md_close);
          price = isNaN(priceValue) ? 0 : priceValue;
        }

        pricesMap.set(instrumentId, price);
      }

      // Log solo instrumentos sin datos
      const instrumentsWithoutData = instrumentIds.filter(
        id => !marketDataResults.some(row => Number(row.md_instrumentid) === id)
      );

      if (instrumentsWithoutData.length > 0) {
        Logger.api('Instruments without market data', {
          instrumentIds: instrumentsWithoutData,
        });
      }

      Logger.api('Batch prices loaded successfully', {
        instrumentCount: instrumentIds.length,
        pricesFound: marketDataResults.length,
        instrumentsWithoutData: instrumentsWithoutData.length,
      });

      return pricesMap;
    } catch (error) {
      Logger.error('Error getting batch prices', error as Error);
      throw new Error('Failed to get batch prices');
    }
  }

  /**
   * Obtener precio actual de un instrumento
   */
  async getCurrentPrice(instrumentId: number): Promise<number | null> {
    Logger.api('Getting current price', { instrumentId });

    try {
      const marketData = await this.getMarketData(instrumentId);
      return marketData?.close || null;
    } catch (error) {
      Logger.error('Error getting current price', error as Error);
      return null;
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
