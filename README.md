# Cocos Trading API - Challenge Backend

> API REST para sistema de trading que maneja portfolios, búsqueda de activos y órdenes de mercado.

## 🚀 Quick Setup

### Prerequisites
- **Node.js** v22.19.0 LTS
- **PostgreSQL** access (Neon DB provided)
- **Git** para cloning

### Installation

```bash
# Clone repository
git clone https://github.com/kmahl/cocos-trading-api.git
cd cocos-trading-api

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your database credentials

# Start development server
npm run dev
```

### Environment Variables

```bash
# Database Configuration
DB_HOST=your-neon-host.neon.tech
DB_PORT=5432
DB_USERNAME=your-username
DB_PASSWORD=your-password
DB_DATABASE=your-database

# Application Configuration
PORT=3000
NODE_ENV=development

# Logging
LOG_LEVEL=debug
```

## 📋 API Endpoints

### Core Endpoints (Challenge Requirements)

| Endpoint | Method | Description | Status |
|----------|--------|-------------|---------|
| `/api/portfolio/:userId` | GET | Get user portfolio with total value, cash, and positions | ✅ |
| `/api/instruments/search?q={query}` | GET | Search instruments by ticker or name | ✅ |
| `/api/orders` | POST | Create and send order to market (MARKET/LIMIT) | ✅ |

### Additional Endpoints

| Endpoint | Method | Description | Status |
|----------|--------|-------------|---------|
| `/api/health` | GET | Health check endpoint | ✅ |
| `/api/orders/:orderId` | GET | Get specific order details | ✅ |
| `/api/orders/user/:userId` | GET | Get user order history | ✅ |
| `/api/cash/deposit` | POST | Deposit cash to user account | ✅ |
| `/api/cash/withdraw` | POST | Withdraw cash from user account | ✅ |
| `/api/cash/balance/:userId` | GET | Get user available cash balance | ✅ |
| `/api/order-processing/process/:orderId` | POST | Process specific order | ✅ |

## 🧪 Testing

```bash
# Run all tests
npm test

# Run functional tests (Challenge requirement)
npm run test:functional

# Run unit tests
npm run test:unit

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- orders.test.ts
```

### Test Structure
- **Functional Tests**: `/tests/functional/` - End-to-end API testing
- **Unit Tests**: `/tests/unit/` - Individual service/controller testing
- **Integration Tests**: N/A

## 📊 Core Features

### 1. Portfolio Management
- **Total Portfolio Value**: Sum of all positions + available cash
- **Available Cash**: Cash balance minus reserved funds (pending orders)
- **Positions**: List of instruments with quantities, values, and performance
- **Performance Calculation**: (current_value - invested_amount) / invested_amount * 100

### 2. Instrument Search
- **Ticker Search**: Find instruments by ticker symbol (e.g., "DYCA")
- **Name Search**: Find instruments by company name (e.g., "Molinos")
- **Fuzzy Matching**: Supports partial matches and case-insensitive search

### 3. Order Management
- **Order Types**:
  - `MARKET`: Execute immediately at current market price
  - `LIMIT`: Set specific price, stays pending until filled
- **Order Sides**: `BUY`, `SELL`, `CASH_IN`, `CASH_OUT`
- **Order States**: `NEW`, `FILLED`, `REJECTED`, `CANCELLED`
- **Validation**: Automatic validation of funds and share availability

### 4. Cash Operations
- **Deposits**: Add cash to user account via `CASH_IN` orders
- **Withdrawals**: Remove cash from user account via `CASH_OUT` orders
- **Validation**: Withdrawal requests validate sufficient available cash
- **Immediate Processing**: Cash operations execute immediately (MARKET type)

### 5. Business Logic
- **Market Orders**: Execute immediately with `FILLED` status
- **Limit Orders**: Created with `NEW` status, pending execution
- **Validations**:
  - Buy orders: Verify sufficient cash
  - Sell orders: Verify sufficient shares
  - Invalid data: Automatic rejection with `REJECTED` status

## 🏗️ Architecture

### Project Structure
```
src/
├── controllers/          # API route handlers
├── services/            # Business logic layer
├── repositories/        # Data access layer
├── entities/           # TypeORM entities
├── dto/                # Data transfer objects
├── middlewares/        # Express middlewares
├── routes/             # API route definitions
├── utils/              # Utility functions
└── types/              # TypeScript type definitions
```

### Technology Stack
- **Runtime**: Node.js v22.19.0 LTS
- **Framework**: Express.js v5.1.0
- **ORM**: TypeORM v0.3.26 (as required by challenge)
- **Database**: PostgreSQL (Neon)
- **Language**: TypeScript v5.9.2
- **Testing**: Jest v30.1.3 + Supertest v7.1.4
- **Validation**: class-validator
- **Documentation**: Swagger/OpenAPI v3.0
- **Logging**: Winston
- **Code Quality**: ESLint v9.34.0 + Prettier v3.6.2

## 📋 Database Schema

### Core Tables
- **users**: User accounts and information
- **instruments**: Financial instruments (stocks, currencies)
- **orders**: Trading orders and transactions
- **marketdata**: Current and historical market prices

### Key Relationships
- Users have multiple Orders
- Orders reference Instruments
- MarketData provides pricing for Instruments

## 🔧 Development

### Available Scripts

```bash
npm run dev           # Start development server with hot reload
npm run build         # Build for production
npm run start         # Start production server
npm run lint          # Run ESLint
npm run lint:fix      # Fix ESLint issues
npm run test          # Run all tests
npm run test:watch    # Run tests in watch mode
```

### Code Quality
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **TypeScript**: Strict type checking
- **Husky**: Pre-commit hooks

## 📋 API Usage Examples

### Get Portfolio
```bash
GET /api/portfolio/1
Response: {
  "success": true,
  "data": {
    "totalValue": 125000.50,
    "availableCash": 25000.00,
    "positions": [
      {
        "instrument": "DYCA",
        "quantity": 100,
        "marketValue": 50000.00,
        "performance": 15.5
      }
    ]
  }
}
```

### Search Instruments
```bash
GET /api/instruments/search?q=DYCA
Response: {
  "success": true,
  "data": [
    {
      "id": 1,
      "ticker": "DYCA",
      "name": "Distribuidora YPF Costa Argentina S.A.",
      "type": "STOCK"
    }
  ]
}
```

### Create Order
```bash
POST /api/orders
Body: {
  "instrumentId": 1,
  "userId": 1,
  "side": "BUY",
  "size": 10,
  "type": "MARKET"
}
Response: {
  "success": true,
  "data": {
    "id": 123,
    "status": "FILLED",
    "price": 50.25
  }
}
```

### Cash Operations
```bash
# Deposit cash
POST /api/cash/deposit
Body: {
  "userId": 1,
  "amount": 50000
}

# Withdraw cash
POST /api/cash/withdraw
Body: {
  "userId": 1,
  "amount": 25000
}

# Check balance
GET /api/cash/balance/1
Response: {
  "success": true,
  "data": {
    "userId": 1,
    "availableCash": 75000.50
  }
}
```

## 🛠️ Challenge Requirements Compliance

### ✅ Required Features
- [x] **Portfolio Endpoint**: Returns total value, available cash, and positions
- [x] **Search Endpoint**: Supports ticker and name search
- [x] **Order Endpoint**: Handles MARKET and LIMIT orders
- [x] **TypeORM**: Used as specified in requirements
- [x] **Order States**: NEW, FILLED, REJECTED, CANCELLED
- [x] **Validations**: Funds and shares validation
- [x] **Functional Test**: Complete test for order creation

### ✅ Business Logic
- [x] Market orders execute immediately (FILLED)
- [x] Limit orders stay pending (NEW)
- [x] Buy orders validate cash availability
- [x] Sell orders validate share availability
- [x] Cash transfers via CASH_IN/CASH_OUT
- [x] Position calculations using order history

### ✅ Technical Requirements
- [x] Node.js backend
- [x] Express.js framework
- [x] TypeORM for data access
- [x] Functional testing implemented
- [x] No authentication required (as specified)

## 📞 API Documentation

- **Interactive API Docs**: Available at `http://localhost:3000/api/docs` (Swagger UI)
- **OpenAPI Spec**: Available at `http://localhost:3000/api/docs.json`
- **Postman Collection**: `Cocos_Trading_API.postman_collection.json` (root directory)
- **Health Check**: `GET /api/health` - Service status
- **Error Handling**: Consistent error responses with proper HTTP codes
- **Validation**: Request/response validation with detailed error messages

## 🚀 Production Considerations

### Performance
- Optimized database queries
- Connection pooling
- Response caching for market data

### Security
- Input validation and sanitization
- SQL injection protection via TypeORM
- Rate limiting implementation ready

### Monitoring
- Structured logging with Winston
- Health check endpoints
- Error tracking and reporting

---

## 📝 Development Notes

Este proyecto cumple con todos los requerimientos del challenge backend de Cocos:
- API REST completa para sistema de trading
- Manejo de portfolios con cálculos correctos
- Búsqueda de activos por ticker y nombre
- Sistema de órdenes MARKET y LIMIT
- Validaciones completas de negocio
- Test funcional como se solicita

### 📚 Documentación Técnica

Para decisiones de implementación y análisis técnico detallado, ver:
- **Decisiones de Diseño**: `/docs/DESIGN_DECISIONS.md` - Decisiones tomadas y justificaciones técnicas
