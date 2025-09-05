/**
 * Types e interfaces para Market Data e Instruments
 */

export interface InstrumentMarketData {
  instrumentId: number;
  currentPrice: number;
  high: number | null;
  low: number | null;
  open: number | null;
  close: number | null;
  previousClose: number | null;
  date: Date;
}

export interface CurrentInstrumentMarketData {
  instrumentId: number;
  currentPrice: number;
  date: Date;
}

export interface MarketDataQuery {
  instrumentIds: number[];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}
