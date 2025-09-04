// DTOs para respuestas de la API

export interface InstrumentResponseDto {
  id: number;
  ticker: string;
  name: string;
  type: string;
}

export interface InstrumentSearchResponseDto {
  success: boolean;
  total: number;
  limit: number;
  query: string;
  timestamp: string;
  message: string;
  data: InstrumentResponseDto[];
}

export interface MarketDataResponseDto {
  instrumentId: number;
  high: number | null;
  low: number | null;
  open: number | null;
  close: number | null;
  previousClose: number | null;
  date: string;
}

export interface MarketDataApiResponseDto {
  success: boolean;
  data: MarketDataResponseDto[] | null;
  total: number;
  instrumentId: number;
  instrumentType?: string;
  requestedType?: string;
  dateRange?: {
    startDate?: string;
    endDate?: string;
  };
  limit?: number;
  timestamp: string;
  message: string;
}

export interface PositionDto {
  instrumentId: number;
  ticker: string;
  name: string;
  quantity: number;
  marketValue: number;
  performancePercent: number;
  currentPrice: number | null;
  averagePrice: number;
}

export interface PortfolioResponseDto {
  userId: number;
  accountNumber: string;
  totalValue: number;
  cashBalance: number;
  totalPerformancePercent: number;
  positions: PositionDto[];
  summary: {
    totalPositions: number;
    totalInstruments: number;
    lastUpdated: string;
  };
}

export interface OrderResponseDto {
  id: number;
  instrumentId: number;
  userId: number;
  side: string;
  size: number;
  price: number | null;
  type: string;
  status: string;
  datetime: string;
  instrument?: {
    ticker: string;
    name: string;
  };
}

export interface ApiErrorResponseDto {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  path: string;
  details?: Record<string, unknown>;
}

export interface ApiSuccessResponseDto<T = Record<string, unknown>> {
  success: boolean;
  data: T;
  timestamp: string;
  message?: string;
}
