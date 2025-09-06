import {
    InstrumentResponseDto,
    MarketDataResponseDto
} from '../../../src/dto/responses';

import { Request, Response, NextFunction } from 'express';
import { InstrumentController } from '../../../src/controllers/InstrumentController';
import { InstrumentService } from '../../../src/services/InstrumentService';
import { Instrument } from '../../../src/entities/Instrument';
import { MarketData } from '../../../src/entities/MarketData';

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
    Logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    },
}));

// Mock the InstrumentService
jest.mock('../../../src/services/InstrumentService');

describe('InstrumentController - Unit Tests', () => {
    let instrumentController: InstrumentController;
    let mockInstrumentService: jest.Mocked<InstrumentService>;
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: jest.MockedFunction<NextFunction>;

    // Test data
    const mockInstruments: InstrumentResponseDto = {
        id: 1,
        ticker: 'DYCA',
        name: 'Distribuidora YPF Costa Argentina S.A.',
        type: 'ACCIONES',
    }

    const mockInstrumentsList: InstrumentResponseDto[] = [
        {
            id: 1,
            ticker: 'DYCA',
            name: 'Distribuidora YPF Costa Argentina S.A.',
            type: 'ACCIONES',
        },
        {
            id: 4,
            ticker: 'MOLA',
            name: 'Molinos Agro S.A.',
            type: 'ACCIONES',
        } as Instrument,
    ];

    const mockMarketData: MarketDataResponseDto =
        {
            instrumentId: 4,
            high: 100.50,
            low: 95.25,
            open: 98.00,
            close: 99.75,
            previousClose: 97.50,
            date: '2023-07-15T00:00:00Z',
        } as MarketDataResponseDto;

    const mockMarketDataList: MarketDataResponseDto[] = [
        {
            instrumentId: 4,
            high: 100.50,
            low: 95.25,
            open: 98.00,
            close: 99.75,
            previousClose: 97.50,
            date: '2023-07-15T00:00:00Z',
        } as MarketDataResponseDto,
    ];

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Create mock service instance
        mockInstrumentService = new InstrumentService() as jest.Mocked<InstrumentService>;

        // Mock service methods
        mockInstrumentService.searchInstruments = jest.fn();
        mockInstrumentService.getInstrumentById = jest.fn();
        mockInstrumentService.getMarketData = jest.fn();
        mockInstrumentService.getCurrentPrice = jest.fn();

        // Mock Next function
        mockNext = jest.fn();

        // Create controller with mocked service
        instrumentController = new InstrumentController();
        (instrumentController as any).instrumentService = mockInstrumentService;

        // Mock Express response object
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };

        // Mock Express request object
        mockRequest = {
            query: {},
            params: {},
        };
    });

    describe('searchInstruments', () => {

        describe('Successful searches', () => {

            test('should return 200 with instruments when query is valid', async () => {
                // Arrange
                mockRequest.query = { q: 'DYCA', limit: '10' };
                mockInstrumentService.searchInstruments.mockResolvedValue(mockInstrumentsList);

                // Act
                await instrumentController.searchInstruments(mockRequest as Request, mockResponse as Response, mockNext);

                // Assert
                expect(mockInstrumentService.searchInstruments).toHaveBeenCalledWith('DYCA', 10);
                expect(mockResponse.status).toHaveBeenCalledWith(200);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    success: true,
                    total: 2,
                    limit: 10,
                    query: 'DYCA',
                    message: 'Found 2 instruments matching "DYCA"',
                    data: mockInstrumentsList,
                    timestamp: expect.any(String),
                });
            });

            test('should use default limit when not provided', async () => {
                // Arrange
                mockRequest.query = { q: 'ACCIONES' };
                mockInstrumentService.searchInstruments.mockResolvedValue(mockInstrumentsList);

                // Act
                await instrumentController.searchInstruments(mockRequest as Request, mockResponse as Response, mockNext);

                // Assert
                expect(mockInstrumentService.searchInstruments).toHaveBeenCalledWith('ACCIONES', 100);
                expect(mockResponse.json).toHaveBeenCalledWith(
                    expect.objectContaining({
                        limit: 100,
                    })
                );
            });

            test('should handle empty search results', async () => {
                // Arrange
                mockRequest.query = { q: 'NONEXISTENT' };
                mockInstrumentService.searchInstruments.mockResolvedValue([]);

                // Act
                await instrumentController.searchInstruments(mockRequest as Request, mockResponse as Response, mockNext);

                // Assert
                expect(mockResponse.status).toHaveBeenCalledWith(200);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    success: true,
                    total: 0,
                    limit: 100,
                    query: 'NONEXISTENT',
                    message: 'Found 0 instruments matching "NONEXISTENT"',
                    data: [],
                    timestamp: expect.any(String),
                });
            });

            test('should handle case insensitive search', async () => {
                // Arrange
                mockRequest.query = { q: 'dyca', limit: '5' };
                mockInstrumentService.searchInstruments.mockResolvedValue(mockInstrumentsList);

                // Act
                await instrumentController.searchInstruments(mockRequest as Request, mockResponse as Response, mockNext);

                // Assert
                expect(mockInstrumentService.searchInstruments).toHaveBeenCalledWith('dyca', 5);
            });

        });

        describe('Input validation', () => {

            test('should return 400 when query parameter is missing', async () => {
                // Arrange
                mockRequest.query = {};

                // Act
                await instrumentController.searchInstruments(mockRequest as Request, mockResponse as Response, mockNext);

                // Assert
                expect(mockInstrumentService.searchInstruments).not.toHaveBeenCalled();
                expect(mockNext).toHaveBeenCalledWith(
                    expect.objectContaining({
                        message: 'Search query is required',
                        statusCode: 400
                    })
                );
                expect(mockResponse.status).not.toHaveBeenCalled();
                expect(mockResponse.json).not.toHaveBeenCalled();
            });

            test('should return 400 when query parameter is empty', async () => {
                // Arrange
                mockRequest.query = { q: '' };

                // Act
                await instrumentController.searchInstruments(mockRequest as Request, mockResponse as Response, mockNext);

                // Assert
                expect(mockInstrumentService.searchInstruments).not.toHaveBeenCalled();
                expect(mockNext).toHaveBeenCalledWith(
                    expect.objectContaining({
                        message: 'Search query is required',
                        statusCode: 400
                    })
                );
                expect(mockResponse.status).not.toHaveBeenCalled();
                expect(mockResponse.json).not.toHaveBeenCalled();
            });

            test('should return 400 when limit is invalid (too low)', async () => {
                // Arrange
                mockRequest.query = { q: 'test', limit: '0' };

                // Act
                await instrumentController.searchInstruments(mockRequest as Request, mockResponse as Response, mockNext);

                // Assert
                expect(mockInstrumentService.searchInstruments).not.toHaveBeenCalled();
                expect(mockNext).toHaveBeenCalledWith(
                    expect.objectContaining({
                        message: 'Limit must be between 1 and 100',
                        statusCode: 400
                    })
                );
                expect(mockResponse.status).not.toHaveBeenCalled();
                expect(mockResponse.json).not.toHaveBeenCalled();
            });

            test('should return 400 when limit is invalid (too high)', async () => {
                // Arrange
                mockRequest.query = { q: 'test', limit: '101' };

                // Act
                await instrumentController.searchInstruments(mockRequest as Request, mockResponse as Response, mockNext);

                // Assert
                expect(mockInstrumentService.searchInstruments).not.toHaveBeenCalled();
                expect(mockNext).toHaveBeenCalledWith(
                    expect.objectContaining({
                        message: 'Limit must be between 1 and 100',
                        statusCode: 400
                    })
                );
                expect(mockResponse.status).not.toHaveBeenCalled();
                expect(mockResponse.json).not.toHaveBeenCalled();
            });

            test('should use default limit when limit is not a number', async () => {
                // Arrange
                mockRequest.query = { q: 'test', limit: 'invalid' };
                mockInstrumentService.searchInstruments.mockResolvedValue([]);

                // Act
                await instrumentController.searchInstruments(mockRequest as Request, mockResponse as Response, mockNext);

                // Assert
                expect(mockInstrumentService.searchInstruments).toHaveBeenCalledWith('test', 100);
                expect(mockResponse.status).toHaveBeenCalledWith(200);
            });

        });

        describe('Error handling', () => {

            test('should call next with error when service throws error', async () => {
                // Arrange
                mockRequest.query = { q: 'test' };
                const serviceError = new Error('Database connection failed');
                mockInstrumentService.searchInstruments.mockRejectedValue(serviceError);

                // Act
                await instrumentController.searchInstruments(mockRequest as Request, mockResponse as Response, mockNext);

                // Assert
                expect(mockNext).toHaveBeenCalledWith(serviceError);
                expect(mockResponse.status).not.toHaveBeenCalled();
                expect(mockResponse.json).not.toHaveBeenCalled();
            });

        });

    });

    describe('getInstrumentById', () => {

        describe('Successful retrieval', () => {

            test('should return 200 with instrument when found', async () => {
                // Arrange
                mockRequest.params = { id: '4' };
                mockInstrumentService.getInstrumentById.mockResolvedValue(mockInstruments);

                // Act
                await instrumentController.getInstrumentById(mockRequest as Request, mockResponse as Response, mockNext);

                // Assert
                expect(mockInstrumentService.getInstrumentById).toHaveBeenCalledWith(4);
                expect(mockResponse.status).toHaveBeenCalledWith(200);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    success: true,
                    message: 'Instrument retrieved successfully',
                    data: mockInstruments,
                    timestamp: expect.any(String),
                });
            });

            test('should return 404 when instrument not found', async () => {
                // Arrange
                mockRequest.params = { id: '999999' };
                mockInstrumentService.getInstrumentById.mockResolvedValue(null);

                // Act
                await instrumentController.getInstrumentById(mockRequest as Request, mockResponse as Response, mockNext);

                // Assert
                expect(mockInstrumentService.getInstrumentById).toHaveBeenCalledWith(999999);
                expect(mockNext).toHaveBeenCalledWith(
                    expect.objectContaining({
                        message: 'Instrument not found',
                        statusCode: 404
                    })
                );
                expect(mockResponse.status).not.toHaveBeenCalled();
                expect(mockResponse.json).not.toHaveBeenCalled();
            });

        });

        describe('Input validation', () => {

            test('should return 400 when ID is not a number', async () => {
                // Arrange
                mockRequest.params = { id: 'invalid' };

                // Act
                await instrumentController.getInstrumentById(mockRequest as Request, mockResponse as Response, mockNext);

                // Assert
                expect(mockInstrumentService.getInstrumentById).not.toHaveBeenCalled();
                expect(mockNext).toHaveBeenCalledWith(
                    expect.objectContaining({
                        message: 'Invalid instrument ID provided',
                        statusCode: 400
                    })
                );
                expect(mockResponse.status).not.toHaveBeenCalled();
                expect(mockResponse.json).not.toHaveBeenCalled();
            });

            test('should return 400 when ID is negative', async () => {
                // Arrange
                mockRequest.params = { id: '-1' };

                // Act
                await instrumentController.getInstrumentById(mockRequest as Request, mockResponse as Response, mockNext);

                // Assert
                expect(mockInstrumentService.getInstrumentById).not.toHaveBeenCalled();
                expect(mockNext).toHaveBeenCalledWith(
                    expect.objectContaining({
                        message: 'Invalid instrument ID provided',
                        statusCode: 400
                    })
                );
                expect(mockResponse.status).not.toHaveBeenCalled();
                expect(mockResponse.json).not.toHaveBeenCalled();
            });

            test('should return 400 when ID is zero', async () => {
                // Arrange
                mockRequest.params = { id: '0' };

                // Act
                await instrumentController.getInstrumentById(mockRequest as Request, mockResponse as Response, mockNext);

                // Assert
                expect(mockInstrumentService.getInstrumentById).not.toHaveBeenCalled();
                expect(mockNext).toHaveBeenCalledWith(
                    expect.objectContaining({
                        message: 'Invalid instrument ID provided',
                        statusCode: 400
                    })
                );
                expect(mockResponse.status).not.toHaveBeenCalled();
                expect(mockResponse.json).not.toHaveBeenCalled();
            });

        });

        describe('Error handling', () => {

            test('should call next with error when service throws error', async () => {
                // Arrange
                mockRequest.params = { id: '4' };
                const serviceError = new Error('Database query failed');
                mockInstrumentService.getInstrumentById.mockRejectedValue(serviceError);

                // Act
                await instrumentController.getInstrumentById(mockRequest as Request, mockResponse as Response, mockNext);

                // Assert
                expect(mockNext).toHaveBeenCalledWith(serviceError);
                expect(mockResponse.status).not.toHaveBeenCalled();
                expect(mockResponse.json).not.toHaveBeenCalled();
            });

        });

    });

    describe('getMarketData', () => {

        describe('Successful retrieval', () => {

            test('should return 200 with market data when instrument exists', async () => {
                // Arrange
                mockRequest.params = { id: '4' };
                mockRequest.query = { limit: '10' };

                mockInstrumentService.getInstrumentById.mockResolvedValue(mockInstruments);
                mockInstrumentService.getMarketData.mockResolvedValue(mockMarketDataList);

                // Act
                await instrumentController.getMarketData(mockRequest as Request, mockResponse as Response, mockNext);

                // Assert
                expect(mockInstrumentService.getInstrumentById).toHaveBeenCalledWith(4);
                expect(mockInstrumentService.getMarketData).toHaveBeenCalledWith(4, {
                    startDate: undefined,
                    endDate: undefined,
                    limit: 10
                });
                expect(mockResponse.status).toHaveBeenCalledWith(200);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    success: true,
                    total: 1,
                    instrumentId: 4,
                    instrumentType: 'ACCIONES',
                    dateRange: undefined,
                    limit: 10,
                    message: 'Retrieved 1 market data record',
                    data: [mockMarketData],
                    timestamp: expect.any(String),
                });
            });

            test('should return 200 with empty data when no market data available', async () => {
                // Arrange
                mockRequest.params = { id: '66' }; // ARS PESOS
                mockRequest.query = {};

                const arsInstrument = { id: 66, ticker: 'ARS', name: 'PESOS', type: 'MONEDA' } as InstrumentResponseDto;
                mockInstrumentService.getInstrumentById.mockResolvedValue(arsInstrument);
                mockInstrumentService.getMarketData.mockResolvedValue([]);

                // Act
                await instrumentController.getMarketData(mockRequest as Request, mockResponse as Response, mockNext);

                // Assert
                expect(mockResponse.status).toHaveBeenCalledWith(200);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    success: true,
                    total: 0,
                    instrumentId: 66,
                    instrumentType: 'MONEDA',
                    dateRange: undefined,
                    limit: 100,
                    message: 'No market data available for this instrument with the specified filters',
                    data: [],
                    timestamp: expect.any(String),
                });
            });

            test('should apply date filters when provided', async () => {
                // Arrange
                mockRequest.params = { id: '4' };
                mockRequest.query = {
                    startDate: '2023-07-01',
                    endDate: '2023-07-31',
                    limit: '5',
                };

                mockInstrumentService.getInstrumentById.mockResolvedValue(mockInstruments);
                mockInstrumentService.getMarketData.mockResolvedValue(mockMarketDataList);

                // Act
                await instrumentController.getMarketData(mockRequest as Request, mockResponse as Response, mockNext);

                // Assert
                expect(mockInstrumentService.getMarketData).toHaveBeenCalledWith(
                    4,
                    { 
                        startDate: '2023-07-01', 
                        endDate: '2023-07-31',
                        limit: 5
                    }
                );
                expect(mockResponse.json).toHaveBeenCalledWith(
                    expect.objectContaining({
                        dateRange: {
                            startDate: '2023-07-01',
                            endDate: '2023-07-31',
                        },
                    })
                );
            });

            test('should apply type filter when provided', async () => {
                // Arrange
                mockRequest.params = { id: '4' };
                mockRequest.query = { type: 'ACCIONES' };

                mockInstrumentService.getInstrumentById.mockResolvedValue(mockInstruments);
                mockInstrumentService.getMarketData.mockResolvedValue(mockMarketDataList);

                // Act
                await instrumentController.getMarketData(mockRequest as Request, mockResponse as Response, mockNext);

                // Assert
                expect(mockResponse.json).toHaveBeenCalledWith(
                    expect.objectContaining({
                        instrumentType: 'ACCIONES',
                        data: [mockMarketData],
                    })
                );
            });

            test('should return empty data when type filter does not match', async () => {
                // Arrange
                mockRequest.params = { id: '4' }; // MOLA is ACCIONES
                mockRequest.query = { type: 'MONEDA' }; // Requesting MONEDA

                mockInstrumentService.getInstrumentById.mockResolvedValue(mockInstruments);

                // Act
                await instrumentController.getMarketData(mockRequest as Request, mockResponse as Response, mockNext);

                // Assert
                expect(mockInstrumentService.getMarketData).not.toHaveBeenCalled();
                expect(mockResponse.status).toHaveBeenCalledWith(200);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    success: true,
                    total: 0,
                    instrumentId: 4,
                    instrumentType: 'ACCIONES',
                    requestedType: 'MONEDA',
                    message: "Instrument type 'ACCIONES' does not match requested type 'MONEDA'",
                    data: [],
                    timestamp: expect.any(String),
                });
            });

        });

        describe('Input validation', () => {

            test('should return 400 when instrument ID is invalid', async () => {
                // Arrange
                mockRequest.params = { id: 'invalid' };

                // Act
                await instrumentController.getMarketData(mockRequest as Request, mockResponse as Response, mockNext);

                // Assert
                expect(mockInstrumentService.getInstrumentById).not.toHaveBeenCalled();
                expect(mockNext).toHaveBeenCalledWith(
                    expect.objectContaining({
                        message: 'Invalid instrument ID provided',
                        statusCode: 400
                    })
                );
                expect(mockResponse.status).not.toHaveBeenCalled();
                expect(mockResponse.json).not.toHaveBeenCalled();
            });

            test('should return 400 when date format is invalid', async () => {
                // Arrange
                mockRequest.params = { id: '4' };
                mockRequest.query = { startDate: 'invalid-date' };

                // Act
                await instrumentController.getMarketData(mockRequest as Request, mockResponse as Response, mockNext);

                // Assert
                expect(mockNext).toHaveBeenCalledWith(
                    expect.objectContaining({
                        message: 'Invalid start date format. Use YYYY-MM-DD',
                        statusCode: 400
                    })
                );
                expect(mockResponse.status).not.toHaveBeenCalled();
                expect(mockResponse.json).not.toHaveBeenCalled();
            });

            test('should return 404 when instrument does not exist', async () => {
                // Arrange
                mockRequest.params = { id: '999999' };
                mockInstrumentService.getInstrumentById.mockResolvedValue(null);

                // Act
                await instrumentController.getMarketData(mockRequest as Request, mockResponse as Response, mockNext);

                // Assert
                expect(mockNext).toHaveBeenCalledWith(
                    expect.objectContaining({
                        message: 'Instrument not found',
                        statusCode: 404
                    })
                );
                expect(mockResponse.status).not.toHaveBeenCalled();
                expect(mockResponse.json).not.toHaveBeenCalled();
            });

            test('should handle large limit gracefully (cap at 1000)', async () => {
                // Arrange
                mockRequest.params = { id: '4' };
                mockRequest.query = { limit: '1500' };

                mockInstrumentService.getInstrumentById.mockResolvedValue(mockInstruments);
                mockInstrumentService.getMarketData.mockResolvedValue(mockMarketDataList);

                // Act
                await instrumentController.getMarketData(mockRequest as Request, mockResponse as Response, mockNext);

                // Assert
                expect(mockInstrumentService.getMarketData).toHaveBeenCalledWith(4, {
                    startDate: undefined,
                    endDate: undefined,
                    limit: 1000
                });
                expect(mockResponse.json).toHaveBeenCalledWith(
                    expect.objectContaining({
                        limit: 1000,
                    })
                );
            });

        });

        describe('Error handling', () => {

            test('should call next with error when service throws error', async () => {
                // Arrange
                mockRequest.params = { id: '4' };
                const serviceError = new Error('Market data query failed');
                mockInstrumentService.getInstrumentById.mockRejectedValue(serviceError);

                // Act
                await instrumentController.getMarketData(mockRequest as Request, mockResponse as Response, mockNext);

                // Assert
                expect(mockNext).toHaveBeenCalledWith(serviceError);
                expect(mockResponse.status).not.toHaveBeenCalled();
                expect(mockResponse.json).not.toHaveBeenCalled();
            });

        });

    });

});
