/**
 * Unit Tests for InstrumentService
 * 
 * Tests the business logic layer by mocking:
 * - TypeORM repository methods
 * - Query builder operations
 * - Database interactions
 */

import { InstrumentService } from '../../../src/services/InstrumentService';
import { Instrument } from '../../../src/entities/Instrument';
import { MarketData } from '../../../src/entities/MarketData';
import { AppDataSource } from '../../../src/data-source/index';

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  Logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock AppDataSource
jest.mock('../../../src/data-source/index', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

describe('InstrumentService - Unit Tests', () => {
  let instrumentService: InstrumentService;
  let mockInstrumentRepository: any;
  let mockMarketDataRepository: any;
  let mockQueryBuilder: any;

  // Test data
  const mockInstruments: Instrument[] = [
    {
      id: 1,
      ticker: 'DYCA',
      name: 'Distribuidora YPF Costa Argentina S.A.',
      type: 'ACCIONES',
    } as Instrument,
    {
      id: 4,
      ticker: 'MOLA',
      name: 'Molinos Agro S.A.',
      type: 'ACCIONES',
    } as Instrument,
    {
      id: 66,
      ticker: 'ARS',
      name: 'PESOS',
      type: 'MONEDA',
    } as Instrument,
  ];

  const mockMarketData: MarketData[] = [
    {
      id: 1,
      instrumentid: 4,
      high: 100.50,
      low: 95.25,
      open: 98.00,
      close: 99.75,
      previousclose: 97.50,
      date: new Date('2023-07-15T00:00:00Z'),
    } as MarketData,
    {
      id: 2,
      instrumentid: 4,
      high: 102.00,
      low: 97.50,
      open: 99.75,
      close: 101.25,
      previousclose: 99.75,
      date: new Date('2023-07-14T00:00:00Z'),
    } as MarketData,
  ];

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock query builder
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      distinctOn: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getOne: jest.fn(),
      getRawMany: jest.fn(),
    } as any;

    // Create mock repositories
    mockInstrumentRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      findOneBy: jest.fn(),
      findOne: jest.fn(),
    } as any;

    mockMarketDataRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      find: jest.fn(),
    } as any;

    // Mock AppDataSource.getRepository
    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
      if (entity === Instrument) return mockInstrumentRepository;
      if (entity === MarketData) return mockMarketDataRepository;
      throw new Error(`Unknown entity: ${entity}`);
    });

    instrumentService = new InstrumentService();
  });

  describe('searchInstruments', () => {
    
    describe('Successful searches', () => {
      
      test('should search instruments by ticker (case insensitive)', async () => {
        // Arrange
        const query = 'DYCA';
        const limit = 10;
        const expectedResults = [mockInstruments[0]];
        
        mockQueryBuilder.getMany.mockResolvedValue(expectedResults);

        // Act
        const result = await instrumentService.searchInstruments(query, limit);

        // Assert
        expect(mockInstrumentRepository.createQueryBuilder).toHaveBeenCalledWith('instrument');
        expect(mockQueryBuilder.where).toHaveBeenCalledWith(
          'UPPER(instrument.ticker) LIKE UPPER(:searchTerm)',
          { searchTerm: '%DYCA%' }
        );
        expect(mockQueryBuilder.limit).toHaveBeenCalledWith(limit);
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          id: 1,
          ticker: 'DYCA',
          name: 'Distribuidora YPF Costa Argentina S.A.',
          type: 'ACCIONES',
        });
      });

      test('should search instruments by name', async () => {
        // Arrange
        const query = 'Molinos';
        const limit = 5;
        const expectedResults = [mockInstruments[1]];
        
        mockQueryBuilder.getMany.mockResolvedValue(expectedResults);

        // Act
        const result = await instrumentService.searchInstruments(query, limit);

        // Assert
        expect(mockQueryBuilder.orWhere).toHaveBeenCalledWith(
          'UPPER(instrument.name) LIKE UPPER(:searchTerm)',
          { searchTerm: '%Molinos%' }
        );
        expect(result).toHaveLength(1);
        expect(result[0]?.name).toContain('Molinos');
      });

      test('should search instruments by type', async () => {
        // Arrange
        const query = 'ACCIONES';
        const expectedResults = [mockInstruments[0], mockInstruments[1]];
        
        mockQueryBuilder.getMany.mockResolvedValue(expectedResults);

        // Act
        const result = await instrumentService.searchInstruments(query);

        // Assert
        expect(mockQueryBuilder.orWhere).toHaveBeenCalledWith(
          'UPPER(instrument.type) LIKE UPPER(:searchTerm)',
          { searchTerm: '%ACCIONES%' }
        );
        expect(result).toHaveLength(2);
        expect(result.every(r => r.type === 'ACCIONES')).toBe(true);
      });

      test('should use default limit when not provided', async () => {
        // Arrange
        const query = 'TEST';
        
        mockQueryBuilder.getMany.mockResolvedValue([]);

        // Act
        await instrumentService.searchInstruments(query);

        // Assert
        expect(mockQueryBuilder.limit).toHaveBeenCalledWith(100);
      });

      test('should return empty array for empty query', async () => {
        // Act
        const result = await instrumentService.searchInstruments('');

        // Assert
        expect(result).toEqual([]);
        expect(mockInstrumentRepository.createQueryBuilder).not.toHaveBeenCalled();
      });

      test('should return empty array for whitespace-only query', async () => {
        // Act
        const result = await instrumentService.searchInstruments('   ');

        // Assert
        expect(result).toEqual([]);
      });

      test('should handle multiple words in search query', async () => {
        // Arrange
        const query = 'YPF Costa';
        const expectedResults = [mockInstruments[0]];
        
        mockQueryBuilder.getMany.mockResolvedValue(expectedResults);

        // Act
        const result = await instrumentService.searchInstruments(query);

        // Assert
        expect(mockQueryBuilder.where).toHaveBeenCalledWith(
          'UPPER(instrument.ticker) LIKE UPPER(:searchTerm)',
          { searchTerm: '%YPF Costa%' }
        );
      });

    });

    describe('Error handling', () => {
      
      test('should throw error when repository query fails', async () => {
        // Arrange
        const query = 'TEST';
        const dbError = new Error('Database connection failed');
        mockQueryBuilder.getMany.mockRejectedValue(dbError);

        // Act & Assert
        await expect(instrumentService.searchInstruments(query))
          .rejects.toThrow('Failed to search instruments');
      });

    });

  });

  describe('getInstrumentById', () => {
    
    describe('Successful retrieval', () => {
      
      it('should return instrument when found', async () => {
        // Arrange
        const instrumentId = 4;
        const expectedInstrument = mockInstruments[1];
        
        mockInstrumentRepository.findOne.mockResolvedValue(expectedInstrument);

        // Act
        const result = await instrumentService.getInstrumentById(instrumentId);

        // Assert
        expect(mockInstrumentRepository.findOne).toHaveBeenCalledWith({
          where: { id: instrumentId },
        });
        expect(result).toEqual({
          id: 4,
          ticker: 'MOLA',
          name: 'Molinos Agro S.A.',
          type: 'ACCIONES',
        });
      });

      test('should return null when instrument not found', async () => {
        // Arrange
        const instrumentId = 999999;
        
        mockInstrumentRepository.findOne.mockResolvedValue(null);

        // Act
        const result = await instrumentService.getInstrumentById(instrumentId);

        // Assert
        expect(result).toBeNull();
      });

    });

    describe('Error handling', () => {
      
      test('should throw error when repository query fails', async () => {
        // Arrange
        const instrumentId = 4;
        const dbError = new Error('Database connection failed');
        mockInstrumentRepository.findOne.mockRejectedValue(dbError);

        // Act & Assert
        await expect(instrumentService.getInstrumentById(instrumentId))
          .rejects.toThrow('Failed to get instrument');
      });

    });

  });

  describe('getMarketData', () => {
    
    describe('Successful retrieval', () => {
      
      test('should return market data without filters', async () => {
        // Arrange
        const instrumentId = 4;
        
        mockQueryBuilder.getMany.mockResolvedValue(mockMarketData);

        // Act
        const result = await instrumentService.getMarketData(instrumentId);

        // Assert
        expect(mockMarketDataRepository.createQueryBuilder).toHaveBeenCalledWith('md');
        expect(mockQueryBuilder.where).toHaveBeenCalledWith(
          'md.instrumentid = :instrumentId',
          { instrumentId }
        );
        expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('md.date', 'DESC');
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
          instrumentId: 4,
          high: 100.50,
          low: 95.25,
          open: 98.00,
          close: 99.75,
          previousClose: 97.50,
          date: expect.any(String),
        });
      });

      test('should apply date filters when provided', async () => {
        // Arrange
        const instrumentId = 4;
        const options = {
          startDate: '2023-07-01',
          endDate: '2023-07-31',
        };
        
        mockQueryBuilder.getMany.mockResolvedValue([mockMarketData[0]]);

        // Act
        const result = await instrumentService.getMarketData(instrumentId, options);

        // Assert
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'md.date >= :startDate',
          { startDate: '2023-07-01' }
        );
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'md.date <= :endDate',
          { endDate: '2023-07-31' }
        );
        expect(result).toHaveLength(1);
      });

      test('should apply limit when provided', async () => {
        // Arrange
        const instrumentId = 4;
        const options = { limit: 10 };
        
        mockQueryBuilder.getMany.mockResolvedValue([mockMarketData[0]]);

        // Act
        await instrumentService.getMarketData(instrumentId, options);

        // Assert
        expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
      });

      test('should cap limit at 1000', async () => {
        // Arrange
        const instrumentId = 4;
        const options = { limit: 1500 };
        
        mockQueryBuilder.getMany.mockResolvedValue([]);

        // Act
        await instrumentService.getMarketData(instrumentId, options);

        // Assert
        expect(mockQueryBuilder.limit).toHaveBeenCalledWith(1000);
      });

      test('should return empty array when no data found', async () => {
        // Arrange
        const instrumentId = 66; // ARS - no market data
        
        mockQueryBuilder.getMany.mockResolvedValue([]);

        // Act
        const result = await instrumentService.getMarketData(instrumentId);

        // Assert
        expect(result).toEqual([]);
      });

      test('should handle different date formats correctly', async () => {
        // Arrange
        const instrumentId = 4;
        const marketDataWithStringDate = {
          ...mockMarketData[0],
          date: '2023-07-15T00:00:00.000Z',
        };
        
        mockQueryBuilder.getMany.mockResolvedValue([marketDataWithStringDate]);

        // Act
        const result = await instrumentService.getMarketData(instrumentId);

        // Assert
        expect(result[0]?.date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
      });

    });

    describe('Error handling', () => {
      
      test('should throw error when repository query fails', async () => {
        // Arrange
        const instrumentId = 4;
        const dbError = new Error('Database query failed');
        mockQueryBuilder.getMany.mockRejectedValue(dbError);

        // Act & Assert
        await expect(instrumentService.getMarketData(instrumentId))
          .rejects.toThrow('Failed to get market data for instrument 4');
      });

    });

  });

  describe('getCurrentPrice', () => {
    
    describe('Successful retrieval', () => {
      
      test('should return current price from latest market data', async () => {
        // Arrange
        const instrumentId = 4;
        const latestMarketData = {
          instrumentId: 4,
          close: 99.75,
          high: 100.50,
          low: 95.25,
          open: 98.00,
          previousClose: 97.50,
          date: '2023-07-15T00:00:00.000Z',
        };
        
        // Mock the getMarketData call
        jest.spyOn(instrumentService, 'getMarketData').mockResolvedValue([latestMarketData]);

        // Act
        const result = await instrumentService.getCurrentPrice(instrumentId);

        // Assert
        expect(instrumentService.getMarketData).toHaveBeenCalledWith(instrumentId, { limit: 1 });
        expect(result).toBe(99.75);
      });

      test('should return 0 when no market data available', async () => {
        // Arrange
        const instrumentId = 66; // ARS - no market data
        
        jest.spyOn(instrumentService, 'getMarketData').mockResolvedValue([]);

        // Act
        const result = await instrumentService.getCurrentPrice(instrumentId);

        // Assert
        expect(result).toBe(0);
      });

      test('should return 0 when close price is null', async () => {
        // Arrange
        const instrumentId = 4;
        const marketDataWithNullClose = {
          instrumentId: 4,
          close: null,
          high: 100.50,
          low: 95.25,
          open: 98.00,
          previousClose: 97.50,
          date: '2023-07-15T00:00:00.000Z',
        };
        
        jest.spyOn(instrumentService, 'getMarketData').mockResolvedValue([marketDataWithNullClose]);

        // Act
        const result = await instrumentService.getCurrentPrice(instrumentId);

        // Assert
        expect(result).toBe(0);
      });

    });

    describe('Error handling', () => {
      
      test('should return 0 when getMarketData throws error', async () => {
        // Arrange
        const instrumentId = 4;
        
        jest.spyOn(instrumentService, 'getMarketData').mockRejectedValue(new Error('DB Error'));

        // Act
        const result = await instrumentService.getCurrentPrice(instrumentId);

        // Assert
        expect(result).toBe(0);
      });

    });

  });

  describe('getCurrentPricesBatch', () => {
    
    describe('Successful retrieval', () => {
      
      test('should return prices for multiple instruments', async () => {
        // Arrange
        const instrumentIds = [1, 4];
        const mockRawResults = [
          { md_instrumentid: 1, md_close: 150.25 },
          { md_instrumentid: 4, md_close: 99.75 },
        ];
        
        mockQueryBuilder.getRawMany.mockResolvedValue(mockRawResults);

        // Act
        const result = await instrumentService.getCurrentPricesBatch(instrumentIds);

        // Assert
        expect(mockMarketDataRepository.createQueryBuilder).toHaveBeenCalledWith('md');
        expect(mockQueryBuilder.select).toHaveBeenCalledWith(['md.instrumentid', 'md.close']);
        expect(mockQueryBuilder.where).toHaveBeenCalledWith(
          'md.instrumentid IN (:...instrumentIds)',
          { instrumentIds }
        );
        expect(result.get(1)).toBe(150.25);
        expect(result.get(4)).toBe(99.75);
      });

      test('should return 0 for instruments with no market data', async () => {
        // Arrange
        const instrumentIds = [1, 66]; // 66 = ARS with no market data
        const mockRawResults = [
          { md_instrumentid: 1, md_close: 150.25 },
          // No result for 66
        ];
        
        mockQueryBuilder.getRawMany.mockResolvedValue(mockRawResults);

        // Act
        const result = await instrumentService.getCurrentPricesBatch(instrumentIds);

        // Assert
        expect(result.get(1)).toBe(150.25);
        expect(result.get(66)).toBe(0);
      });

      test('should return empty map for empty input', async () => {
        // Act
        const result = await instrumentService.getCurrentPricesBatch([]);

        // Assert
        expect(result.size).toBe(0);
        expect(mockMarketDataRepository.createQueryBuilder).not.toHaveBeenCalled();
      });

      test('should handle null close prices gracefully', async () => {
        // Arrange
        const instrumentIds = [1];
        const mockRawResults = [
          { md_instrumentid: 1, md_close: null },
        ];
        
        mockQueryBuilder.getRawMany.mockResolvedValue(mockRawResults);

        // Act
        const result = await instrumentService.getCurrentPricesBatch(instrumentIds);

        // Assert
        expect(result.get(1)).toBe(0);
      });

    });

    describe('Error handling', () => {
      
      test('should throw error when repository query fails', async () => {
        // Arrange
        const instrumentIds = [1, 4];
        const dbError = new Error('Database connection failed');
        mockQueryBuilder.getRawMany.mockRejectedValue(dbError);

        // Act & Assert
        await expect(instrumentService.getCurrentPricesBatch(instrumentIds))
          .rejects.toThrow('Failed to get batch prices');
      });

    });

  });

  describe('instrumentExists', () => {
    
    test('should return true when instrument exists', async () => {
      // Arrange
      const instrumentId = 4;
      
      jest.spyOn(instrumentService, 'getInstrumentById').mockResolvedValue({
        id: 4,
        ticker: 'MOLA',
        name: 'Molinos Agro S.A.',
        type: 'ACCIONES',
      });

      // Act
      const result = await instrumentService.instrumentExists(instrumentId);

      // Assert
      expect(result).toBe(true);
    });

    test('should return false when instrument does not exist', async () => {
      // Arrange
      const instrumentId = 999999;
      
      jest.spyOn(instrumentService, 'getInstrumentById').mockResolvedValue(null);

      // Act
      const result = await instrumentService.instrumentExists(instrumentId);

      // Assert
      expect(result).toBe(false);
    });

    test('should return false when getInstrumentById throws error', async () => {
      // Arrange
      const instrumentId = 4;
      
      jest.spyOn(instrumentService, 'getInstrumentById').mockRejectedValue(new Error('DB Error'));

      // Act
      const result = await instrumentService.instrumentExists(instrumentId);

      // Assert
      expect(result).toBe(false);
    });

  });

});
