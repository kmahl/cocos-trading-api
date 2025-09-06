/**
 * Market Data Repository
 *
 * Aplica Repository Pattern: Encapsula el acceso a datos de MarketData
 * Aplica SRP: Se enfoca únicamente en queries de market data
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../data-source/index';
import { MarketData } from '../entities/MarketData';
import { Logger } from '../utils/logger';
import { CurrentInstrumentMarketData } from '../types/market';
import { IMarketDataRepository } from '../types/interfaces';
import { toNumberOrZero } from '../utils';

export class MarketDataRepository implements IMarketDataRepository {
  private repository: Repository<MarketData>;

  constructor() {
    this.repository = AppDataSource.getRepository(MarketData);
  }

  /**
   * Obtener datos de mercado actuales para múltiples instrumentos
   * Query optimizada: Solo campos necesarios (close, previousClose) más recientes
   */
  async getCurrentMarketDataByInstruments(
    instrumentIds: number[]
  ): Promise<CurrentInstrumentMarketData[]> {
    if (instrumentIds.length === 0) {
      return [];
    }

    try {
      // Query optimizada con subquery robusta
      const marketDataEntities = await this.repository
        .createQueryBuilder('md')
        .where('md.instrumentid IN (:...instrumentIds)', { instrumentIds })
        .andWhere(
          `md.date = (
                SELECT MAX(md2.date) 
                FROM marketdata md2 
                WHERE md2.instrumentid = md.instrumentid
                )`
        )
        .getMany();

      const result: CurrentInstrumentMarketData[] = marketDataEntities.map(
        entity => ({
          instrumentId: entity.instrumentId,
          currentPrice: toNumberOrZero(entity?.close),
          date: entity.date,
        })
      );
      return result;
    } catch (error) {
      Logger.error('Error in market data batch query', error as Error);
      return [];
    }
  }
}
