/**
 * Swagger Configuration for Cocos Trading API
 *
 * Provides interactive API documentation with:
 * - All endpoints documented
 * - Request/Response examples
 * - Schema definitions
 * - Try-it-out functionality
 */

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Cocos Trading API',
      version: '1.0.0',
      description: `
        API REST para sistema de trading - Challenge Backend Cocos
        
        ## Features
        - Portfolio management with real-time valuations
        - Instrument search by ticker and name
        - Order management (MARKET/LIMIT orders)
        - Real-time order processing
        - Market data integration
        
        ## Business Logic
        - **MARKET Orders**: Execute immediately at current market price
        - **LIMIT Orders**: Set specific price, stay pending until filled
        - **Order Validation**: Automatic validation of funds and shares
        - **Portfolio Calculation**: Real-time position and performance tracking
        
        ## Order States
        - \`NEW\`: Limit order pending execution
        - \`FILLED\`: Order successfully executed
        - \`REJECTED\`: Order rejected due to validation errors
        - \`CANCELLED\`: Order cancelled by user
      `,
      contact: {
        name: 'Challenge Backend Team',
        email: 'backend@cocos.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Development server',
      },
      {
        url: 'https://api.cocos-trading.com/api',
        description: 'Production server',
      },
    ],
    components: {
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'User unique identifier',
              example: 1,
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'user@example.com',
            },
            accountNumber: {
              type: 'string',
              description: 'Account number for trading',
              example: 'ACC001234',
            },
          },
        },
        Instrument: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Instrument unique identifier',
              example: 1,
            },
            ticker: {
              type: 'string',
              description: 'Instrument ticker symbol',
              example: 'DYCA',
            },
            name: {
              type: 'string',
              description: 'Instrument full name',
              example: 'Distribuidora YPF Costa Argentina S.A.',
            },
            type: {
              type: 'string',
              description: 'Instrument type',
              enum: ['ACCIONES', 'MONEDA'],
              example: 'ACCIONES',
            },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Order unique identifier',
              example: 123,
            },
            instrumentId: {
              type: 'integer',
              description: 'Instrument being traded',
              example: 1,
            },
            userId: {
              type: 'integer',
              description: 'User placing the order',
              example: 1,
            },
            side: {
              type: 'string',
              enum: ['BUY', 'SELL', 'CASH_IN', 'CASH_OUT'],
              description: 'Order side',
              example: 'BUY',
            },
            size: {
              type: 'number',
              description: 'Quantity of shares or cash amount',
              example: 100,
            },
            price: {
              type: 'number',
              description: 'Price per share (only for LIMIT orders)',
              example: 50.25,
              nullable: true,
            },
            type: {
              type: 'string',
              enum: ['MARKET', 'LIMIT'],
              description: 'Order type',
              example: 'MARKET',
            },
            status: {
              type: 'string',
              enum: ['NEW', 'FILLED', 'REJECTED', 'CANCELLED'],
              description: 'Order status',
              example: 'FILLED',
            },
            datetime: {
              type: 'string',
              format: 'date-time',
              description: 'Order creation timestamp',
              example: '2024-01-15T10:30:00Z',
            },
          },
        },
        CreateOrderRequest: {
          type: 'object',
          required: ['instrumentId', 'userId', 'side', 'type'],
          properties: {
            instrumentId: {
              type: 'integer',
              description: 'ID of the instrument to trade',
              example: 1,
            },
            userId: {
              type: 'integer',
              description: 'ID of the user placing the order',
              example: 1,
            },
            side: {
              type: 'string',
              enum: ['BUY', 'SELL', 'CASH_IN', 'CASH_OUT'],
              description: 'Order side',
              example: 'BUY',
            },
            size: {
              type: 'number',
              description:
                'Exact number of shares (use size OR amount, not both)',
              example: 100,
              minimum: 0.01,
            },
            amount: {
              type: 'number',
              description:
                'Total amount in pesos (use size OR amount, not both)',
              example: 5000,
              minimum: 0.01,
            },
            price: {
              type: 'number',
              description:
                'Price per share (required for LIMIT orders, forbidden for MARKET)',
              example: 50.25,
              minimum: 0.01,
            },
            type: {
              type: 'string',
              enum: ['MARKET', 'LIMIT'],
              description: 'Order type',
              example: 'MARKET',
            },
          },
        },
        Portfolio: {
          type: 'object',
          properties: {
            totalValue: {
              type: 'number',
              description: 'Total portfolio value in pesos',
              example: 125000.5,
            },
            availableCash: {
              type: 'number',
              description:
                'Available cash for trading (excluding reserved funds)',
              example: 25000.0,
            },
            reservedCash: {
              type: 'number',
              description: 'Cash reserved for pending orders',
              example: 5000.0,
            },
            positions: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Position',
              },
            },
          },
        },
        Position: {
          type: 'object',
          properties: {
            instrument: {
              $ref: '#/components/schemas/Instrument',
            },
            quantity: {
              type: 'number',
              description: 'Number of shares owned',
              example: 100,
            },
            averagePrice: {
              type: 'number',
              description: 'Average purchase price per share',
              example: 45.5,
            },
            currentPrice: {
              type: 'number',
              description: 'Current market price per share',
              example: 52.75,
            },
            marketValue: {
              type: 'number',
              description: 'Current market value of position',
              example: 5275.0,
            },
            totalCost: {
              type: 'number',
              description: 'Total amount invested',
              example: 4550.0,
            },
            unrealizedPnL: {
              type: 'number',
              description: 'Unrealized profit/loss',
              example: 725.0,
            },
            performance: {
              type: 'number',
              description: 'Performance percentage',
              example: 15.93,
            },
          },
        },
        MarketData: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Market data record ID',
              example: 1,
            },
            instrumentId: {
              type: 'integer',
              description: 'Associated instrument ID',
              example: 1,
            },
            high: {
              type: 'number',
              description: 'Highest price of the day',
              example: 55.0,
            },
            low: {
              type: 'number',
              description: 'Lowest price of the day',
              example: 50.0,
            },
            open: {
              type: 'number',
              description: 'Opening price',
              example: 52.0,
            },
            close: {
              type: 'number',
              description: 'Closing price (current price)',
              example: 53.25,
            },
            previousClose: {
              type: 'number',
              description: 'Previous day closing price',
              example: 51.8,
            },
            date: {
              type: 'string',
              format: 'date-time',
              description: 'Market data timestamp',
              example: '2024-01-15T16:00:00Z',
            },
          },
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether the request was successful',
              example: true,
            },
            data: {
              type: 'object',
              description: 'Response data (varies by endpoint)',
            },
            message: {
              type: 'string',
              description: 'Human-readable message',
              example: 'Operation completed successfully',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Response timestamp',
              example: '2024-01-15T10:30:00Z',
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              description: 'Error type',
              example: 'Validation Error',
            },
            message: {
              type: 'string',
              description: 'Error message',
              example: 'Invalid request data',
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    example: 'instrumentId',
                  },
                  constraints: {
                    type: 'object',
                    example: {
                      isPositive: 'instrumentId must be a positive number',
                    },
                  },
                },
              },
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
          },
        },
      },
      responses: {
        BadRequest: {
          description: 'Bad Request',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        InternalServerError: {
          description: 'Internal Server Error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Health',
        description: 'Health check and monitoring endpoints',
      },
      {
        name: 'Portfolio',
        description: 'Portfolio management and position tracking',
      },
      {
        name: 'Instruments',
        description: 'Financial instruments search and information',
      },
      {
        name: 'Orders',
        description: 'Order creation, management and history',
      },
      {
        name: 'Order Processing',
        description: 'Order processing and queue management',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts', './src/entities/*.ts'],
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express): void => {
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(specs, {
      explorer: true,
      customSiteTitle: 'Cocos Trading API Documentation',
      customfavIcon: '/favicon.ico',
      customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 50px 0 }
      .swagger-ui .info .title { color: #1f2937 }
    `,
      swaggerOptions: {
        docExpansion: 'list',
        filter: true,
        showRequestHeaders: true,
        showCommonExtensions: true,
        tryItOutEnabled: true,
      },
    })
  );

  // Raw JSON endpoint
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
};

export default specs;
