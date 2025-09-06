# Decisiones de Diseño - Cocos Trading API

> Documentación técnica de las decisiones arquitectónicas y de implementación tomadas para el desarrollo del sistema de trading.

## 📋 Resumen Ejecutivo

Esta API REST fue desarrollada para cumplir con los requerimientos del challenge backend de Cocos, implementando un sistema de trading completo que permite:

- **Gestión de portfolios** con cálculos en tiempo real
- **Búsqueda de instrumentos** financieros por ticker y nombre
- **Gestión de órdenes** MARKET y LIMIT con validaciones de negocio
- **Operaciones de efectivo** (depósitos y retiros) integradas al sistema
- **Procesamiento asíncrono** de órdenes para escalabilidad

## 🏗️ Arquitectura del Sistema

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

### 3. Transacciones

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

## 🧪 Estrategia de Testing

### 1. Test Funcional (Requerimiento del Challenge)

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

### 2. Estructura de Testing

**Decisión**: Pirámide de testing con énfasis en functional tests

```
/tests/
├── functional/     # End-to-end API tests
├── unit/          # Service layer tests  
└── integration/   # Database integration tests
```

**Justificación**:
- **Coverage**: Diferentes niveles de granularidad
- **Speed**: Tests unitarios rápidos para desarrollo
- **Reliability**: Tests funcionales para confidence en releases

## 🔒 Seguridad y Validación

### 1. Input Validation

**Decisión**: Validación en múltiples capas

1. **DTO Validation**: class-validator en boundary
2. **Business Validation**: Reglas de negocio en services
3. **Database Constraints**: Validación final en BD

**Justificación**:
- **Defense in Depth**: Múltiples barreras contra input malicioso
- **User Experience**: Errores claros y específicos
- **Security**: Prevención de injection attacks

### 2. Error Handling

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

## 📊 Performance y Escalabilidad

### 1. Optimizaciones Implementadas

**Decisión**: Optimizaciones enfocadas en queries críticos

- **Portfolio Calculation**: Single query con joins optimizados
- **Search**: Índices en columnas ticker y name
- **Pagination**: Límites en todos los endpoints de listado

**Justificación**:
- **User Experience**: Respuestas rápidas en operaciones frecuentes
- **Resource Efficiency**: Uso eficiente de conexiones de BD
- **Scalability**: Preparado para volúmenes mayores

### 2. Connection Pooling

**Decisión**: TypeORM connection pooling con configuración optimizada

```typescript
{
  maxQueryExecutionTime: 5000,
  extra: {
    max: 20,              // Pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  }
}
```

**Justificación**:
- **Performance**: Reutilización de conexiones
- **Reliability**: Timeouts previenen hanging connections
- **Resource Management**: Límites controlados de recursos

## 🔧 Herramientas de Desarrollo

### 1. Code Quality

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
