/**
 * Functional Tests for Instruments Endpoints
 * 
 * Tests the complete functionality of:
 * - GET /api/instruments/search
 * - GET /api/instruments/:id
 * - GET /api/instruments/:id/market-data
 */

import request from 'supertest';
import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { AppDataSource } from '../src/data-source/index';
import router from '../src/routes';
import { globalErrorHandler } from '../src/middlewares';

// Mock logger to avoid console spam in tests
jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// We need to create the app for tests
let app: Express;

// Test data constants
const TEST_INSTRUMENTS = {
  MOLA: { id: 4, ticker: 'MOLA', name: 'Molinos Agro S.A.', type: 'ACCIONES' },
  DYCA: { id: 1, ticker: 'DYCA', name: 'Distribuidora YPF Costa Argentina S.A.', type: 'ACCIONES' },
  ARS_PESOS: { id: 66, ticker: 'ARS', name: 'PESOS', type: 'MONEDA' },
};

// Setup and teardown
beforeAll(async () => {
  // Initialize database connection for tests
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    
    // Create Express app for testing
    app = express();
    
    // Middleware setup
    app.use(helmet());
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Routes
    app.use('/api', router);
    
    // Error handling
    app.use(globalErrorHandler);
    
  } catch (error) {
    console.error('Test setup failed:', error);
    throw error;
  }
});

afterAll(async () => {
  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  } catch (error) {
    console.error('Test cleanup failed:', error);
  }
});

describe('Instruments API', () => {
  
  describe('GET /api/instruments/search', () => {
    
    test('should search instruments by ticker (case insensitive)', async () => {
      const response = await request(app)
        .get('/api/instruments/search')
        .query({ q: 'dyca' })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        total: expect.any(Number),
        limit: 100,
        query: 'dyca',
        message: expect.stringMatching(/Found \d+ instrument/),
        data: expect.any(Array)
      });

      // Should find DYCA
      const foundDyca = response.body.data.find((inst: any) => inst.ticker === 'DYCA');
      expect(foundDyca).toBeDefined();
      expect(foundDyca).toMatchObject({
        id: TEST_INSTRUMENTS.DYCA.id,
        ticker: TEST_INSTRUMENTS.DYCA.ticker,
        name: TEST_INSTRUMENTS.DYCA.name,
        type: TEST_INSTRUMENTS.DYCA.type
      });
    });

    test('should search instruments by name (case insensitive)', async () => {
      const response = await request(app)
        .get('/api/instruments/search')
        .query({ q: 'MOLINOS' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: expect.stringMatching(/molinos/i)
          })
        ])
      );
    });

    test('should search instruments by type', async () => {
      const response = await request(app)
        .get('/api/instruments/search')
        .query({ q: 'ACCIONES', limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.limit).toBe(10);
      
      // All results should be of type ACCIONES
      response.body.data.forEach((instrument: any) => {
        expect(instrument.type).toBe('ACCIONES');
      });
    });

    test('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/instruments/search')
        .query({ q: 'acciones', limit: 5 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.limit).toBe(5);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    test('should return empty results for non-existent search', async () => {
      const response = await request(app)
        .get('/api/instruments/search')
        .query({ q: 'xyz123notfound' })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        total: 0,
        data: []
      });
    });

    test('should return 400 for missing query parameter', async () => {
      const response = await request(app)
        .get('/api/instruments/search')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/search query is required/i);
    });

    test('should return 400 for empty query', async () => {
      const response = await request(app)
        .get('/api/instruments/search')
        .query({ q: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should return 400 for invalid limit (too high)', async () => {
      const response = await request(app)
        .get('/api/instruments/search')
        .query({ q: 'acciones', limit: 1500 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/limit must be between 1 and 100/i);
    });

  });

  describe('GET /api/instruments/:id', () => {

    test('should get instrument by valid ID', async () => {
      const response = await request(app)
        .get(`/api/instruments/${TEST_INSTRUMENTS.MOLA.id}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Instrument retrieved successfully',
        data: {
          id: TEST_INSTRUMENTS.MOLA.id,
          ticker: TEST_INSTRUMENTS.MOLA.ticker,
          name: TEST_INSTRUMENTS.MOLA.name,
          type: TEST_INSTRUMENTS.MOLA.type
        }
      });
    });

    test('should return 404 for non-existent instrument ID', async () => {
      const response = await request(app)
        .get('/api/instruments/999999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/instrument not found/i);
    });

    test('should return 400 for invalid instrument ID', async () => {
      const response = await request(app)
        .get('/api/instruments/invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/invalid instrument id/i);
    });

    test('should return 400 for negative instrument ID', async () => {
      const response = await request(app)
        .get('/api/instruments/-1')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

  });

  describe('GET /api/instruments/:id/market-data', () => {

    test('should get market data for instrument with data (MOLA)', async () => {
      const response = await request(app)
        .get(`/api/instruments/${TEST_INSTRUMENTS.MOLA.id}/market-data`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        total: expect.any(Number),
        instrumentId: TEST_INSTRUMENTS.MOLA.id,
        instrumentType: TEST_INSTRUMENTS.MOLA.type,
        limit: 100,
        message: expect.stringMatching(/retrieved \d+ market data record/i),
        data: expect.any(Array)
      });

      if (response.body.data.length > 0) {
        const marketData = response.body.data[0];
        expect(marketData).toMatchObject({
          instrumentId: TEST_INSTRUMENTS.MOLA.id,
          high: expect.any(Number),
          low: expect.any(Number),
          open: expect.any(Number),
          close: expect.any(Number),
          previousClose: expect.any(Number),
          date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
        });
      }
    });

    test('should return 200 with null data for instrument without market data', async () => {
      const response = await request(app)
        .get(`/api/instruments/${TEST_INSTRUMENTS.ARS_PESOS.id}/market-data`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        total: 0,
        instrumentId: TEST_INSTRUMENTS.ARS_PESOS.id,
        instrumentType: TEST_INSTRUMENTS.ARS_PESOS.type,
        message: expect.stringMatching(/no market data available/i),
        data: []
      });
    });

    test('should filter by instrument type', async () => {
      const response = await request(app)
        .get(`/api/instruments/${TEST_INSTRUMENTS.MOLA.id}/market-data`)
        .query({ type: 'ACCIONES' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.instrumentType).toBe('ACCIONES');
      
      // Should return data since MOLA is ACCIONES
      if (response.body.total > 0) {
        expect(response.body.data).toEqual(expect.any(Array));
      }
    });

    test('should return null data for type mismatch', async () => {
      const response = await request(app)
        .get(`/api/instruments/${TEST_INSTRUMENTS.MOLA.id}/market-data`)
        .query({ type: 'MONEDA' })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        total: 0,
        instrumentType: 'ACCIONES',
        requestedType: 'MONEDA',
        message: expect.stringMatching(/does not match requested type/i),
        data: []
      });
    });

    test('should filter by date range', async () => {
      const response = await request(app)
        .get(`/api/instruments/${TEST_INSTRUMENTS.MOLA.id}/market-data`)
        .query({ 
          startDate: '2023-07-01', 
          endDate: '2023-07-31',
          limit: 10 
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.limit).toBe(10);
      
      if (response.body.dateRange) {
        expect(response.body.dateRange).toMatchObject({
          startDate: '2023-07-01',
          endDate: '2023-07-31'
        });
      }

      // Verify dates are within range if data exists
      if (response.body.data.length > 0) {
        response.body.data.forEach((marketData: any) => {
          const dataDate = new Date(marketData.date);
          expect(dataDate.getTime()).toBeGreaterThanOrEqual(new Date('2023-07-01').getTime());
          expect(dataDate.getTime()).toBeLessThanOrEqual(new Date('2023-07-31T23:59:59').getTime());
        });
      }
    });

    test('should respect limit parameter', async () => {
      const response = await request(app)
        .get(`/api/instruments/${TEST_INSTRUMENTS.MOLA.id}/market-data`)
        .query({ limit: 5 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.limit).toBe(5);
      
      if (response.body.data.length > 0) {
        expect(response.body.data.length).toBeLessThanOrEqual(5);
      }
    });

    test('should return 404 for non-existent instrument', async () => {
      const response = await request(app)
        .get('/api/instruments/999999/market-data')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/instrument not found/i);
    });

    test('should return 400 for invalid date format', async () => {
      const response = await request(app)
        .get(`/api/instruments/${TEST_INSTRUMENTS.MOLA.id}/market-data`)
        .query({ startDate: 'invalid-date' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/invalid.*date format/i);
    });

    test('should return 400 for invalid instrument ID', async () => {
      const response = await request(app)
        .get('/api/instruments/invalid/market-data')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should handle large limit gracefully', async () => {
      const response = await request(app)
        .get(`/api/instruments/${TEST_INSTRUMENTS.MOLA.id}/market-data`)
        .query({ limit: 1500 })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should be capped at 1000 based on implementation
      expect(response.body.limit).toBeLessThanOrEqual(1000);
    });

  });

  describe('Market Data Ordering', () => {

    test('should return market data in descending date order (most recent first)', async () => {
      const response = await request(app)
        .get(`/api/instruments/${TEST_INSTRUMENTS.MOLA.id}/market-data`)
        .query({ limit: 10 })
        .expect(200);

      if (response.body.data.length > 1) {
        for (let i = 0; i < response.body.data.length - 1; i++) {
          const currentDate = new Date(response.body.data[i].date);
          const nextDate = new Date(response.body.data[i + 1].date);
          
          // Current date should be >= next date (descending order)
          expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
        }
      }
    });

  });

});
