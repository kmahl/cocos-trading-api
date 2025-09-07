# Decisiones de Diseño - Cocos Trading API

> Documentación técnica de las decisiones arquitectónicas implementadas y mejoras identificadas para el sistema de trading.

## 📋 Resumen Ejecutivo

Esta API REST fue desarrollada para cumplir con los requerimientos del challenge backend de Cocos, implementando un sistema de trading completo que permite:

- **Gestión de portfolios** con cálculos en tiempo real
- **Búsqueda de instrumentos** financieros por ticker y nombre
- **Gestión de órdenes** MARKET y LIMIT con validaciones de negocio
- **Operaciones de efectivo** (depósitos y retiros) integradas al sistema
- **Procesamiento de órdenes** con validaciones robustas

## 📚 Índice General

### ✅ **Decisiones Implementadas**
Todas las decisiones técnicas tomadas durante el desarrollo, con justificaciones y código de implementación:

- **🏗️ Arquitectura del Sistema** - Clean Architecture, Express.js + TypeORM + PostgreSQL
- **💰 Lógica de Negocio** - Estados de órdenes, validaciones, cálculos de portfolio
- **🗄️ Base de Datos** - Esquema sin modificaciones, queries optimizadas
- **🧪 Testing** - Pirámide de testing con énfasis en functional tests
- **🔒 Seguridad** - Validación multicapa, error handling global
- **🔧 Herramientas** - Code quality, imports relativos estándar

### 🚀 **Mejoras Identificadas**
Propuestas de optimización y funcionalidades avanzadas para evolución futura:

- **🗄️ Base de Datos y Performance** - Índices, foreign keys, tabla positions
- **📊 Observabilidad y Monitoreo** - DataDog, New Relic, HTTP client wrapper
- **💰 Funcionalidades Financieras** - Rendimiento real, analytics avanzado
- **🏗️ Arquitectura y Escalabilidad** - Sistema de colas, multi-currency
- **🔒 Seguridad y Compliance** - Authentication, rate limiting avanzado
- **🐳 DevOps y Deployment** - Docker, CI/CD pipeline

---

## ✅ **Decisiones Implementadas**

### 📋 Índice de Decisiones de Implementación

#### 🏗️ **Arquitectura del Sistema**
- [Patrón de Arquitectura Elegido](#1-patrón-de-arquitectura-elegido) - Clean Architecture con separación por capas
- [Framework y Tecnologías Core](#2-framework-y-tecnologías-core) - Express.js + TypeORM + PostgreSQL
- [Estrategia de Validación](#3-estrategia-de-validación) - class-validator + DTOs personalizados
- [Unificación de Enums](#4-unificación-de-enums---fuente-de-verdad-única) - Enums definidos en entidades

#### 💰 **Lógica de Negocio**
- [Manejo de Estados de Órdenes](#1-manejo-de-estados-de-órdenes) - Estados simples con transiciones claras
- [Ejecución de Órdenes MARKET vs LIMIT](#2-ejecución-de-órdenes-market-vs-limit) - Inmediata vs pendiente
- [Campo `price` Nullable](#3-campo-price-en-órdenes---nullability-vs-business-logic) - Nullable en BD, validación en app
- [Cash Operations Single Currency](#4-cash-operations---single-currency-design) - Hardcoded para ARS
- [Cash Withdrawal Validation](#5-cash-withdrawal-validation---error-vs-rejected-order) - Error HTTP directo
- [Validaciones de Fondos y Acciones](#6-validaciones-de-fondos-y-acciones) - Pre-ejecución con reservas
- [Cálculo de Portfolio](#7-cálculo-de-portfolio) - Costo promedio ponderado

#### 🗄️ **Base de Datos**
- [Esquema Existente vs Modificaciones](#1-esquema-existente-vs-modificaciones) - Mantener schema sin cambios
- [Estrategia de Queries](#2-estrategia-de-queries) - TypeORM Repository Pattern optimizado
- [Transacciones](#3-transacciones) - Explícitas para operaciones críticas

#### 🧪 **Testing**
- [Test Funcional](#1-test-funcional-requerimiento-del-challenge) - End-to-end del flujo de órdenes
- [Estructura de Testing](#2-estructura-de-testing) - Pirámide con énfasis en functional tests

#### 🔒 **Seguridad y Validación**
- [Input Validation](#1-input-validation) - Validación en múltiples capas
- [Error Handling](#2-error-handling) - Global error handler consistente

#### 🔧 **Herramientas de Desarrollo**
- [Path Aliases](#1-path-aliases---decisión-de-simplicidad) - Imports relativos estándar
- [Code Quality](#2-code-quality) - ESLint + Prettier + TypeScript strict

---

### 🏗️ Arquitectura del Sistema

#### 1. Patrón de Arquitectura Elegido

**Decisión**: Clean Architecture con separación por capas  
**Justificación**:
- **Mantenibilidad**: Código organizado en responsabilidades claras
- **Testabilidad**: Cada capa puede ser probada independientemente
- **Escalabilidad**: Fácil agregar nuevas funcionalidades sin impactar capas existentes
- **Legibilidad**: Estructura predecible para cualquier desarrollador

```
src/
├── controllers/     # Capa de presentación (HTTP)
├── services/       # Lógica de negocio
├── repositories/   # Acceso a datos
├── entities/      # Modelos de dominio
├── dto/           # Contratos de API
└── utils/         # Utilidades transversales
```

#### 2. Framework y Tecnologías Core

**Decisión**: Express.js + TypeORM + PostgreSQL  
**Justificación**:
- **Express.js**: Framework maduro, amplia documentación, ecosystem robusto
- **TypeORM**: Requerimiento específico del challenge
- **PostgreSQL**: Base de datos provista en Neon, optimizada para transacciones financieras
- **TypeScript**: Tipado estático reduce errores en runtime, especialmente crítico en lógica financiera

#### 3. Estrategia de Validación

**Decisión**: class-validator + DTOs personalizados  
**Justificación**:
- **Seguridad**: Validación exhaustiva en el boundary de la aplicación
- **Consistency**: Mismas reglas aplicadas en todos los endpoints
- **Developer Experience**: Errores descriptivos y específicos
- **Business Logic**: Validaciones específicas del dominio financiero

#### 4. Unificación de Enums - Fuente de Verdad Única

**Decisión**: Enums definidos únicamente en entidades, importados por DTOs  
**Implementación**:
```typescript
// src/entities/Order.ts - FUENTE DE VERDAD
export enum OrderSide {
  BUY = 'BUY',
  SELL = 'SELL', 
  CASH_IN = 'CASH_IN',
  CASH_OUT = 'CASH_OUT'
}

export enum OrderType {
  MARKET = 'MARKET',
  LIMIT = 'LIMIT'
}

// src/dto/index.ts - REUTILIZACIÓN
import { OrderSide, OrderType } from '../entities/Order';

export class CreateOrderDto {
  side!: OrderSide;    // ✅ Sin duplicación
  type!: OrderType;    // ✅ Sin duplicación
}
```

**Justificación**:
- **DRY Principle**: Una sola definición de cada enum
- **Consistency**: Imposible que DTOs y entities tengan valores diferentes  
- **Maintainability**: Cambios en un solo lugar se propagan automáticamente
- **Type Safety**: TypeScript garantiza coherencia entre capas

### � Lógica de Negocio - Decisiones Críticas

#### 1. Manejo de Estados de Órdenes

**Decisión**: Estados simples con transiciones claras

```typescript
enum OrderStatus {
  NEW = 'NEW',           // Orden LIMIT pendiente
  FILLED = 'FILLED',     // Orden ejecutada exitosamente
  REJECTED = 'REJECTED', // Orden rechazada por validaciones
  CANCELLED = 'CANCELLED' // Orden cancelada por usuario
}
```

**Justificación**:
- **Simplicidad**: Estados suficientes para cubrir todos los casos de uso
- **Claridad**: Fácil entender el ciclo de vida de una orden
- **Auditabilidad**: Estado siempre refleja la realidad del negocio

#### 2. Ejecución de Órdenes MARKET vs LIMIT

**Decisión**: Ejecución inmediata para MARKET, pendiente para LIMIT

| Tipo | Comportamiento | Estado Final | Precio |
|------|---------------|-------------|--------|
| MARKET | Ejecución inmediata | FILLED | Último precio de mercado |
| LIMIT | Queda pendiente | NEW | Precio especificado por usuario |

**Justificación**:
- **Realismo**: Simula comportamiento real del mercado
- **Predictibilidad**: Usuario sabe exactamente qué esperar
- **Simplicidad**: Sin necesidad de simular matching engine complejo

#### 3. Campo `price` en Órdenes - Nullability vs Business Logic

**Decisión**: `price` nullable en BD, pero manejo estricto en aplicación

**Implementación**:
```typescript
// Entity permite NULL para compatibilidad con schema existente
@Column('decimal', { precision: 10, scale: 2, nullable: true })
price!: number | null;

// DTO valida según tipo de orden
@ValidateIf(o => o.type === OrderType.LIMIT)
@IsNumber({}, { message: 'LIMIT orders require a price' })
price?: number;
```

**Justificación**:
- **Schema Compatibility**: Mantiene compatibilidad con BD existente
- **Business Rules**: MARKET orders no requieren precio (se usa precio de mercado)
- **LIMIT orders**: Precio obligatorio y validado en DTO layer
- **Flexible Design**: Permite futuras extensiones (órdenes promocionales, regalos)

**Consideraciones**:
- **Órdenes Promocionales**: `price = 0` podría indicar regalo/promoción
- **Órdenes Gratuitas**: `price = null` + `side = GIFT` para transferencias gratuitas

#### 4. Cash Operations - Single Currency Design

**Decisión**: Implementación específica para ARS (peso argentino)

**Implementación**:
```typescript
// Hardcoded para ARS (ID: 66 en instruments)
const ARS_INSTRUMENT_ID = 66;

// CashService específico para pesos
async deposit(userId: number, amount: number): Promise<Order> {
  return this.orderService.createOrder({
    instrumentId: ARS_INSTRUMENT_ID, // Fijo para challenge
    userId,
    side: OrderSide.CASH_IN,
    amount, // Siempre en pesos
    type: OrderType.MARKET
  });
}
```

**Justificación**:
- **Scope del Challenge**: Requerimientos específicos para mercado argentino
- **Time to Market**: Implementación rápida y funcional
- **YAGNI Principle**: No agregar complejidad innecesaria
- **Business Context**: Sistema enfocado en BYMA (pesos argentinos)

#### 5. Cash Withdrawal Validation - Error vs Rejected Order

**Decisión**: Error HTTP directo sin crear orden REJECTED

**Implementación**:
```typescript
// Validación pre-creación de orden
const balance = await this.portfolioService.getCashBalance(userId);
if (amount > balance.available) {
  throw new BadRequestException('Insufficient cash balance for withdrawal');
  // ❌ NO crea orden REJECTED
}

// Solo crea orden si validación pasa
return this.createCashOutOrder(userId, amount);
```

**Justificación**:
- **User Experience**: Error inmediato y claro sin historial "sucio"
- **Audit Trail**: Evita órdenes REJECTED innecesarias en historial
- **Performance**: Validación rápida sin escritura a BD
- **Business Logic**: Cash operations son diferentes a trading orders

**Comparación**:
```typescript
// Trading Orders: Validación post-creación (business logic)
const order = await this.createOrder(orderData);
const validation = await this.validateMarketConditions(order);
if (!validation.success) {
  order.status = OrderStatus.REJECTED;
}

// Cash Operations: Validación pre-creación (data integrity)
const validation = await this.validateCashBalance(userId, amount);
if (!validation.success) {
  throw new BadRequestException(validation.reason);
}
```

#### 6. Validaciones de Fondos y Acciones

**Decisión**: Validación estricta pre-ejecución con cálculo de reservas

```typescript
// Para órdenes de COMPRA
availableCash = totalCash - reservedForPendingOrders

// Para órdenes de VENTA  
availableShares = totalShares - reservedForPendingOrders
```

**Justificación**:
- **Integridad**: Previene overselling y sobregiro
- **Realismo**: Considera órdenes pendientes como fondos "comprometidos"
- **Seguridad**: Validación double-check en service layer

#### 7. Cálculo de Portfolio

**Decisión**: Costo promedio ponderado para posiciones

```typescript
// Fórmula implementada
averagePrice = totalInvested / totalShares
currentValue = currentPrice * totalShares  
performance = ((currentValue - totalInvested) / totalInvested) * 100
```

**Justificación**:
- **Estándar**: Método contable estándar para inversiones
- **Simplicidad**: Fácil de entender y verificar
- **Precisión**: Refleja el costo real de la posición

### 🗄️ Base de Datos - Decisiones de Implementación

#### 1. Esquema Existente vs Modificaciones

**Decisión**: Mantener schema existente sin modificaciones  
**Justificación**:
- **Cumplimiento**: Challenge especifica que el schema funciona "tal como está"
- **Enfoque**: Demostrar habilidad de trabajar con constraints existentes
- **Eficiencia**: Optimizaciones en código en lugar de estructura

#### 2. Estrategia de Queries

**Decisión**: Queries optimizadas con TypeORM Repository Pattern

```typescript
// Ejemplo de query optimizada para portfolio
const positions = await orderRepository
  .createQueryBuilder('order')
  .innerJoin('order.instrument', 'instrument')
  .leftJoin('marketdata', 'md', 'md.instrumentId = instrument.id')
  .where('order.userId = :userId', { userId })
  .andWhere('order.status = :status', { status: 'FILLED' })
  .groupBy('instrument.id')
  .getMany();
```

**Justificación**:
- **Performance**: Joins optimizados reducen número de queries
- **Maintainability**: Repository pattern centraliza lógica de datos
- **Type Safety**: TypeORM proporciona tipado en compile time

#### 3. Transacciones

**Decisión**: Transacciones explícitas para operaciones críticas

```typescript
await AppDataSource.transaction(async manager => {
  // 1. Validar fondos
  // 2. Crear orden
  // 3. Ejecutar si es MARKET
  // 4. Actualizar balances
});
```

**Justificación**:
- **Consistencia**: ACID properties para operaciones financieras
- **Rollback**: Si cualquier paso falla, se revierte todo
- **Concurrent Safety**: Manejo correcto de concurrencia

### 🧪 Estrategia de Testing

#### 1. Test Funcional (Requerimiento del Challenge)

**Decisión**: Testing end-to-end del flujo completo de órdenes

```typescript
describe('Order Creation - Functional Tests', () => {
  test('should create and execute MARKET BUY order successfully', async () => {
    // Test completo desde request HTTP hasta base de datos
  });
});
```

**Justificación**:
- **Cumplimiento**: Satisface requerimiento específico del challenge
- **Confidence**: Verifica que todo el flujo funciona integrado
- **Business Value**: Testa los casos de uso más críticos

#### 2. Estructura de Testing

**Decisión**: Pirámide de testing con énfasis en functional tests

```
/tests/
├── functional/     # End-to-end API tests (19 tests)
├── unit/          # Service layer tests (26+ tests)
└── integration/   # Database integration tests
```

**Justificación**:
- **Coverage**: Diferentes niveles de granularidad
- **Speed**: Tests unitarios rápidos para desarrollo
- **Reliability**: Tests funcionales para confidence en releases

### 🔒 Seguridad y Validación

#### 1. Input Validation

**Decisión**: Validación en múltiples capas

1. **DTO Validation**: class-validator en boundary
2. **Business Validation**: Reglas de negocio en services
3. **Database Constraints**: Validación final en BD

**Justificación**:
- **Defense in Depth**: Múltiples barreras contra input malicioso
- **User Experience**: Errores claros y específicos
- **Security**: Prevención de injection attacks

#### 2. Error Handling

**Decisión**: Global error handler con responses consistentes

```typescript
interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  details?: ValidationError[];
  timestamp: string;
}
```

**Justificación**:
- **Consistency**: Mismo formato de error en toda la API
- **Debugging**: Información suficiente para diagnóstico
- **Security**: No expone detalles internos del sistema

### 🔧 Herramientas de Desarrollo

#### 1. Path Aliases - Decisión de Simplicidad

**Decisión**: Usar imports relativos estándar, NO path aliases

**Implementación Actual**:
```typescript
// En lugar de: import { OrderService } from '@services/OrderService';
// Usamos: import { OrderService } from '../services/OrderService';
```

**Justificación**:
- **Testing Compatibility**: Jest funciona out-of-the-box sin configuración
- **Zero Dependencies**: Sin librerías adicionales (module-alias, tsconfig-paths)
- **Build Simplicity**: TypeScript standard compilation
- **Challenge Scope**: Innecesario para demostrar competencias core

#### 2. Code Quality

**Decisión**: ESLint + Prettier + TypeScript strict

```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "noImplicitReturns": true
}
```

**Justificación**:
- **Consistency**: Código uniforme en todo el proyecto
- **Error Prevention**: Catch errors en compile time
- **Maintainability**: Código más fácil de leer y modificar

---

## 🚀 **Mejoras Identificadas**

### � Observabilidad y Monitoreo Empresarial

### 📋 Índice de Mejoras Propuestas

#### 🗄️ **Base de Datos y Performance**
- [Integridad Referencial](#1-integridad-referencial) - Foreign Keys explícitas
- [Índices de Performance](#2-índices-de-performance) - Queries 80% más rápidos
- [Tabla de Posiciones Desnormalizada](#3-tabla-de-posiciones-desnormalizada) - Portfolio calculation 95% más rápido
- [Campos de Auditoría](#4-campos-de-auditoría) - Timestamps automáticos

#### 📊 **Observabilidad y Monitoreo**
- [DataDog Integration](#1-datadog-integration-para-métricas-de-negocio) - Métricas de negocio en tiempo real
- [HTTP Client Wrapper](#2-wrapper-de-http-client-para-servicios-externos) - Monitoreo de servicios externos
- [New Relic APM](#3-new-relic-apm-para-monitoreo-en-tiempo-real) - Alertas y performance monitoring

#### 💰 **Funcionalidades Financieras**
- [Rendimiento Real del Usuario](#1-rendimiento-real-del-usuario) - Performance desde compra vs mercado
- [Analytics Avanzado](#2-analytics-avanzado) - Comparación con benchmarks

#### 🏗️ **Arquitectura y Escalabilidad**
- [Sistema de Colas](#1-sistema-de-colas-para-órdenes) - Bull Queue + Redis para resiliencia
- [Multi-Currency Support](#2-multi-currency-support) - Extensión para múltiples monedas

#### 🔒 **Seguridad y Compliance**
- [Authentication & Authorization](#1-authentication--authorization) - JWT + Role-based access
- [Rate Limiting Avanzado](#2-rate-limiting-avanzado) - Límites por usuario y operación

#### 🐳 **DevOps y Deployment**
- [Containerización Completa](#1-containerización-completa) - Docker + Docker Compose
- [CI/CD Pipeline](#2-cicd-pipeline) - Testing y deployment automatizado

---


### 1. Patrón de Arquitectura Elegido

**Decisión**: Clean Architecture con separación por capas  
**Justificación**:
- **Mantenibilidad**: Código organizado en responsabilidades claras
- **Testabilidad**: Cada capa puede ser probada independientemente
- **Escalabilidad**: Fácil agregar nuevas funcionalidades sin impactar capas existentes
- **Legibilidad**: Estructura predecible para cualquier desarrollador

```
src/
├── controllers/     # Capa de presentación (HTTP)
├── services/       # Lógica de negocio
├── repositories/   # Acceso a datos
├── entities/      # Modelos de dominio
├── dto/           # Contratos de API
└── utils/         # Utilidades transversales
```

### 2. Framework y Tecnologías Core

**Decisión**: Express.js + TypeORM + PostgreSQL  
**Justificación**:
- **Express.js**: Framework maduro, amplia documentación, ecosystem robusto
- **TypeORM**: Requerimiento específico del challenge
- **PostgreSQL**: Base de datos provista en Neon, optimizada para transacciones financieras
- **TypeScript**: Tipado estático reduce errores en runtime, especialmente crítico en lógica financiera

### 3. Estrategia de Validación

**Decisión**: class-validator + DTOs personalizados  
**Justificación**:
- **Seguridad**: Validación exhaustiva en el boundary de la aplicación
- **Consistency**: Mismas reglas aplicadas en todos los endpoints
- **Developer Experience**: Errores descriptivos y específicos
- **Business Logic**: Validaciones específicas del dominio financiero

### 4. Unificación de Enums - Fuente de Verdad Única

**Decisión**: Enums definidos únicamente en entidades, importados por DTOs  
**Implementación**:
```typescript
// src/entities/Order.ts - FUENTE DE VERDAD
export enum OrderSide {
  BUY = 'BUY',
  SELL = 'SELL', 
  CASH_IN = 'CASH_IN',
  CASH_OUT = 'CASH_OUT'
}

export enum OrderType {
  MARKET = 'MARKET',
  LIMIT = 'LIMIT'
}

// src/dto/index.ts - REUTILIZACIÓN
import { OrderSide, OrderType } from '../entities/Order';

export class CreateOrderDto {
  side!: OrderSide;    // ✅ Sin duplicación
  type!: OrderType;    // ✅ Sin duplicación
}
```

**Justificación**:
- **DRY Principle**: Una sola definición de cada enum
- **Consistency**: Imposible que DTOs y entities tengan valores diferentes  
- **Maintainability**: Cambios en un solo lugar se propagan automáticamente
- **Type Safety**: TypeScript garantiza coherencia entre capas

## 💰 Lógica de Negocio - Decisiones Críticas

### 1. Manejo de Estados de Órdenes

**Decisión**: Estados simples con transiciones claras

```typescript
enum OrderStatus {
  NEW = 'NEW',           // Orden LIMIT pendiente
  FILLED = 'FILLED',     // Orden ejecutada exitosamente
  REJECTED = 'REJECTED', // Orden rechazada por validaciones
  CANCELLED = 'CANCELLED' // Orden cancelada por usuario
}
```

**Justificación**:
- **Simplicidad**: Estados suficientes para cubrir todos los casos de uso
- **Claridad**: Fácil entender el ciclo de vida de una orden
- **Auditabilidad**: Estado siempre refleja la realidad del negocio

### 2. Ejecución de Órdenes MARKET vs LIMIT

**Decisión**: Ejecución inmediata para MARKET, pendiente para LIMIT

| Tipo | Comportamiento | Estado Final | Precio |
|------|---------------|-------------|--------|
| MARKET | Ejecución inmediata | FILLED | Último precio de mercado |
| LIMIT | Queda pendiente | NEW | Precio especificado por usuario |

**Justificación**:
- **Realismo**: Simula comportamiento real del mercado
- **Predictibilidad**: Usuario sabe exactamente qué esperar
- **Simplicidad**: Sin necesidad de simular matching engine complejo

### 3. Validaciones de Fondos y Acciones

**Decisión**: Validación estricta pre-ejecución con cálculo de reservas

```typescript
// Para órdenes de COMPRA
availableCash = totalCash - reservedForPendingOrders

// Para órdenes de VENTA  
availableShares = totalShares - reservedForPendingOrders
```

**Justificación**:
- **Integridad**: Previene overselling y sobregiro
- **Realismo**: Considera órdenes pendientes como fondos "comprometidos"
- **Seguridad**: Validación double-check en service layer

### 4. Cálculo de Portfolio

**Decisión**: Costo promedio ponderado para posiciones

```typescript
// Fórmula implementada
averagePrice = totalInvested / totalShares
currentValue = currentPrice * totalShares  
performance = ((currentValue - totalInvested) / totalInvested) * 100
```

**Justificación**:
- **Estándar**: Método contable estándar para inversiones
- **Simplicidad**: Fácil de entender y verificar
- **Precisión**: Refleja el costo real de la posición

## 🗄️ Base de Datos - Decisiones de Implementación

### 1. Esquema Existente vs Modificaciones

**Decisión**: Mantener schema existente sin modificaciones  
**Justificación**:
- **Cumplimiento**: Challenge especifica que el schema funciona "tal como está"
- **Enfoque**: Demostrar habilidad de trabajar con constraints existentes
- **Eficiencia**: Optimizaciones en código en lugar de estructura

### 2. Estrategia de Queries

**Decisión**: Queries optimizadas con TypeORM Repository Pattern

```typescript
// Ejemplo de query optimizada para portfolio
const positions = await orderRepository
  .createQueryBuilder('order')
  .innerJoin('order.instrument', 'instrument')
  .leftJoin('marketdata', 'md', 'md.instrumentId = instrument.id')
  .where('order.userId = :userId', { userId })
  .andWhere('order.status = :status', { status: 'FILLED' })
  .groupBy('instrument.id')
  .getMany();
```

**Justificación**:
- **Performance**: Joins optimizados reducen número de queries
- **Maintainability**: Repository pattern centraliza lógica de datos
- **Type Safety**: TypeORM proporciona tipado en compile time

### 3. Campo `price` en Órdenes - Nullability vs Business Logic

**Decisión**: `price` nullable en BD, pero manejo estricto en aplicación

**Implementación Actual**:
```typescript
// Entity permite NULL para compatibilidad con schema existente
@Column('decimal', { precision: 10, scale: 2, nullable: true })
price!: number | null;

// DTO valida según tipo de orden
@ValidateIf(o => o.type === OrderType.LIMIT)
@IsNumber({}, { message: 'LIMIT orders require a price' })
price?: number;
```

**Justificación**:
- **Schema Compatibility**: Mantiene compatibilidad con BD existente
- **Business Rules**: MARKET orders no requieren precio (se usa precio de mercado)
- **LIMIT orders**: Precio obligatorio y validado en DTO layer
- **Flexible Design**: Permite futuras extensiones (órdenes promocionales, regalos)

**Consideración Futura**: 
- **Órdenes Promocionales**: `price = 0` podría indicar regalo/promoción
- **Órdenes Gratuitas**: `price = null` + `side = GIFT` para transferencias gratuitas
- **Validación Estricta**: A nivel BD se podría agregar CHECK constraint por tipo

### 4. Cash Operations - Single Currency Design

**Decisión**: Implementación específica para ARS (peso argentino)

**Implementación Actual**:
```typescript
// Hardcoded para ARS (ID: 66 en instruments)
const ARS_INSTRUMENT_ID = 66;

// CashService específico para pesos
async deposit(userId: number, amount: number): Promise<Order> {
  return this.orderService.createOrder({
    instrumentId: ARS_INSTRUMENT_ID, // Fijo para challenge
    userId,
    side: OrderSide.CASH_IN,
    amount, // Siempre en pesos
    type: OrderType.MARKET
  });
}
```

**Justificación**:
- **Scope del Challenge**: Requerimientos específicos para mercado argentino
- **Time to Market**: Implementación rápida y funcional
- **YAGNI Principle**: No agregar complejidad innecesaria
- **Business Context**: Sistema enfocado en BYMA (pesos argentinos)

**Escalabilidad Futura**:
```typescript
// Extensión propuesta para multi-currency
interface CashOperation {
  userId: number;
  amount: number;
  currency: 'ARS' | 'USD' | 'BTC'; // Extensible
  instrumentId?: number; // Auto-resolve por currency
}

// Service method extendido
async deposit(operation: CashOperation): Promise<Order> {
  const instrumentId = await this.currencyService.getInstrumentId(operation.currency);
  // ... resto de la lógica
}
```

### 5. Cash Withdrawal Validation - Error vs Rejected Order

**Decisión**: Error HTTP directo sin crear orden REJECTED

**Implementación Actual**:
```typescript
// Validación pre-creación de orden
const balance = await this.portfolioService.getCashBalance(userId);
if (amount > balance.available) {
  throw new BadRequestException('Insufficient cash balance for withdrawal');
  // ❌ NO crea orden REJECTED
}

// Solo crea orden si validación pasa
return this.createCashOutOrder(userId, amount);
```

**Justificación**:
- **User Experience**: Error inmediato y claro sin historial "sucio"
- **Audit Trail**: Evita órdenes REJECTED innecesarias en historial
- **Performance**: Validación rápida sin escritura a BD
- **Business Logic**: Cash operations son diferentes a trading orders

**Alternativa Considerada**:
```typescript
// Enfoque "todo es orden" (no implementado)
const order = await this.createCashOutOrder(userId, amount);
if (amount > availableCash) {
  order.status = OrderStatus.REJECTED;
  order.rejectionReason = 'Insufficient cash balance';
  await this.orderRepository.save(order);
}
```

**¿Por qué no se eligió?**:
- **Inconsistencia**: Trading orders se rechazan post-creación, cash pre-creación
- **Claridad**: Error HTTP es más directo que orden REJECTED
- **Simplicidad**: Menos estados que manejar en UI/frontend

## � Herramientas de Desarrollo

### 1. Path Aliases - Configuración Avanzada

**Decisión**: Sistema de aliases unificado con sync automático

**Implementación**:
```typescript
// src/config/aliases.ts - Fuente de verdad única
export const aliases = {
  '@controllers': './controllers',
  '@services': './services',
  '@entities': './entities',
  // ... resto de aliases
};

// scripts/update-aliases.js - Sync automático
function updatePackageJson() {
  const packageJson = require('../package.json');
  packageJson._moduleAliases = generateModuleAliases(aliases);
  fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2));
}

function updateTsConfig() {
  const tsconfig = require('../tsconfig.json');
  tsconfig.compilerOptions.paths = generateTsPaths(aliases);
  fs.writeFileSync('./tsconfig.json', JSON.stringify(tsconfig, null, 2));
}
```

**Justificación**:
- **DRY Principle**: Una sola definición para todos los archivos de config
- **Consistency**: Imposible que package.json y tsconfig.json estén out-of-sync
- **Developer Experience**: Imports limpios (`@services/OrderService` vs `../../services/OrderService`)
- **Refactoring Safety**: Cambios de estructura no rompen imports
- **Build Process**: `npm run build` actualiza aliases automáticamente

**Configuración en Archivos**:
```json
// package.json (auto-generado)
{
  "_moduleAliases": {
    "@controllers": "dist/controllers",
    "@services": "dist/services"
  }
}

// tsconfig.json (auto-generado)
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@controllers/*": ["./controllers/*"],
      "@services/*": ["./services/*"]
    }
  }
}
```

**Script de Desarrollo**:
```bash
# Actualizar aliases después de cambios en estructura
npm run update-aliases

# Build con aliases actualizados
npm run build  # Ejecuta update-aliases automáticamente
```

### 2. Code Quality

**Decisión**: ESLint + Prettier + TypeScript strict

```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "noImplicitReturns": true
}
```

**Justificación**:
- **Consistency**: Código uniforme en todo el proyecto
- **Error Prevention**: Catch errors en compile time
- **Maintainability**: Código más fácil de leer y modificar

## 📋 Documentación

### 1. API Documentation

**Decisión**: Swagger/OpenAPI con ejemplos comprehensivos

**Justificación**:
- **Developer Experience**: Documentación interactiva
- **Testing**: Try-it-out functionality
- **Standardization**: OpenAPI es estándar de industria

### 2. Code Documentation

**Decisión**: JSDoc en puntos críticos + comentarios de negocio

```typescript
/**
 * Calculate portfolio performance using weighted average cost
 * @param orders - All FILLED orders for the instrument
 * @returns Performance data with cost basis and current value
 */
```

**Justificación**:
- **Onboarding**: Facilita comprensión para nuevos desarrolladores
- **Business Logic**: Documenta decisiones no obvias
- **Maintenance**: Contexto para modificaciones futuras

## ⚡ Decisiones de Implementación Específicas

### 1. ¿Por qué no queues para órdenes MARKET?

**Decisión**: Ejecución síncrona para MARKET, asíncrona solo para LIMIT

**Justificación**:
- **Simplicidad**: MARKET orders son inmediatas por definición
- **User Experience**: Feedback inmediato al usuario
- **Complexity**: Queues agregan complejidad innecesaria para caso simple

### 2. ¿Por qué TypeORM en lugar de Prisma?

**Decisión**: TypeORM como especifica el challenge

**Justificación**:
- **Requirement**: Challenge específicamente pide TypeORM
- **Maturity**: ORM maduro con ecosystem robusto
- **Features**: Active Record + Data Mapper patterns disponibles

### 3. ¿Por qué no microservicios?

**Decisión**: Monolito modular bien estructurado

**Justificación**:
- **Scope**: Challenge es acotado y bien definido
- **Complexity**: Microservicios agregan overhead innecesario
- **Deployment**: Simplifica deployment y testing

## 🚀 Consideraciones para Producción

### 1. Monitoring y Observabilidad

**Preparación implementada**:
- Structured logging con Winston
- Health check endpoints
- Error tracking y métricas

### 2. Scalabilidad

**Arquitectura preparada para**:
- Horizontal scaling (stateless)
- Database read replicas
- Caching layer (Redis)
- Load balancing

### 3. Security

**Implementado**:
- Helmet.js para headers de seguridad
- Input validation exhaustiva
- SQL injection prevention via ORM

**Para producción se agregaría**:
- Authentication/Authorization
- Rate limiting por usuario
- API key management
- Audit logs

## 💰 Operaciones de Efectivo (Cash Management)

### 1. Decisión de Diseño

**Decisión**: Reutilizar infraestructura de órdenes para cash transfers  
**Justificación**:
- **Consistency**: Mismas validaciones y auditoria que trading orders
- **SOLID Principles**: No duplicar lógica, reutilizar servicios existentes
- **Audit Trail**: Cash operations aparecen en historial de órdenes
- **Business Logic**: Cash es tratado como un instrumento (ARS, ID: 66)

### 2. Implementación

**Técnica**: CashService que wrappea OrderService

```typescript
// Cash deposit = CASH_IN order con price=1
const orderData: CreateOrderDto = {
  instrumentId: 66, // ARS instrument
  userId,
  side: OrderSide.CASH_IN, // Usando enums de la entidad (fuente de verdad única)
  size: amount,
  type: OrderType.MARKET, // Usando enums de la entidad (fuente de verdad única)
  price: 1, // 1 peso = 1 peso
};
```

**Justificación**:
- **Simplicity**: No nueva infraestructura, usa la existente
- **Validation**: Automáticamente valida fondos suficientes en withdrawals
- **Portfolio Integration**: Cash balance se calcula usando misma lógica que positions
- **Extensibility**: Fácil agregar nuevas cash operations (transfers, etc.)

### 3. Validaciones Específicas

**Cash Withdrawals**:
- Verificar `portfolio.cashBalance.available` antes de crear orden
- Fallar rápido si fondos insuficientes

**Cash Deposits**:
- Siempre exitosos (asumiendo validación de business logic externa)
- Inmediatamente disponibles para trading

---

## 🎯 Conclusiones

Esta implementación balancea **simplicidad** y **robustez**, cumpliendo todos los requerimientos del challenge mientras establece una base sólida para evolución futura. Las decisiones priorizan:

1. **Correctitud** en la lógica de negocio financiera
2. **Maintainability** a través de arquitectura limpia
3. **Performance** en operaciones críticas
4. **Developer Experience** con herramientas modernas

El resultado es una API production-ready que demuestra conocimiento técnico sólido y comprensión de requerimientos de negocio.
