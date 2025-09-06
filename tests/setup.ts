/**
 * Test Setup Configuration
 * 
 * Global setup for all tests including database connection,
 * environment variables, and common test utilities.
 */

import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Mock the Logger to suppress logs during tests
jest.mock('../src/utils/logger', () => ({
  Logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    http: jest.fn(),
    database: jest.fn(),
    order: jest.fn(),
    portfolio: jest.fn(),
    auth: jest.fn(),
    api: jest.fn(),
    request: jest.fn(),
    response: jest.fn(),
  },
}));

// Global test timeout
jest.setTimeout(30000);

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidInstrument(): R;
      toBeValidMarketData(): R;
    }
  }
}

// Custom Jest matchers for our domain objects
expect.extend({
  toBeValidInstrument(received) {
    const pass = received &&
      typeof received.id === 'number' &&
      typeof received.ticker === 'string' &&
      typeof received.name === 'string' &&
      typeof received.type === 'string';

    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a valid instrument`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a valid instrument with id, ticker, name, and type`,
        pass: false,
      };
    }
  },

  toBeValidMarketData(received) {
    const pass = received &&
      typeof received.instrumentId === 'number' &&
      typeof received.high === 'number' &&
      typeof received.low === 'number' &&
      typeof received.open === 'number' &&
      typeof received.close === 'number' &&
      typeof received.previousClose === 'number' &&
      typeof received.date === 'string' &&
      new Date(received.date).getTime() > 0;

    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be valid market data`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be valid market data`,
        pass: false,
      };
    }
  },
});

// Handle uncaught exceptions in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export {};
