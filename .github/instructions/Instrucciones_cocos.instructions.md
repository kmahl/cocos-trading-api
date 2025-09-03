---
applyTo: '**'
---
# Instrucciones del Proyecto - Challenge Backend Cocos

## Análisis del Challenge y Arquitectura Propuesta

### 📋 Resumen del Challenge
**Objetivo**: Crear una API REST para un sistema de trading que maneje:
- Portfolio de usuarios (valor total, pesos disponibles, posiciones)
- Búsqueda de activos (por ticker/nombre)
- Envío de órdenes al mercado (MARKET/LIMIT, BUY/SELL)

### 🎯 Stack Tecnológico Propuesto

#### Core Technologies
- **Runtime**: Node.js v22.19.0 LTS + TypeScript v5.9.2
- **Framework Web**: Express.js v5.1.0
- **ORM**: TypeORM v0.3.26 (como solicitan)
- **Base de Datos**: PostgreSQL (Neon)
- **Testing**: Jest v30.1.3 + Supertest v7.1.4
- **Documentación API**: Swagger/OpenAPI

#### Development Tools & Versions
- **ESLint**: v9.34.0 (nueva configuración ESLint v9 con eslint.config.js)
- **Prettier**: v3.6.2 para formateo de código
- **Husky**: v9.1.7 para pre-commit hooks
- **TypeScript**: v5.9.2 con configuración estricta
- **Node Version**: Definida en .nvmrc (v22.19.0 LTS)

#### Professional Features (Puntos Destacables)

1. **Path Aliases Unificados**
   - **Fuente de verdad única**: `src/config/aliases.ts`
   - **Script automático**: Sincroniza `package.json` y `tsconfig.json`
   - **Comando**: `npm run update-aliases` actualiza todo automáticamente

2. **Observabilidad y Monitoreo**
   - **DataDog Mock**: Crear un wrapper que simule métricas de negocio
   - **NewRelic Mock**: Simular APM para performance monitoring
   - **Logs Estructurados**: Implementar un logger centralizado (Winston)

2. **Desarrollo y Calidad**
   - **ESLint + Prettier**: Configuración estricta para código limpio
   - **Pre-commit Hooks**: Husky + lint-staged
   - **TypeScript**: Tipado estricto en todo el proyecto

3. **HTTP Client Wrapper**
   - **Axios Wrapper**: Con interceptors para logs automáticos
   - **Retry Logic**: Para resiliencia
   - **Request/Response Logging**: Tiempos de respuesta automáticos

### 🏗️ Arquitectura del Sistema

#### Estructura de Carpetas Propuesta
```
src/
├── controllers/          # Controladores de Express
├── services/            # Lógica de negocio
├── data-source/         # Configuración TypeORM DataSource
├── entities/           # Entidades de TypeORM (User, Order, Instrument, MarketData)
├── middlewares/        # Middlewares personalizados
├── dto/                # Data Transfer Objects y validaciones
├── utils/              # Utilidades generales
│   ├── logger.ts       # Logger centralizado
│   ├── httpClient.ts   # Wrapper de Axios
│   ├── datadog.ts      # Mock DataDog
│   └── newrelic.ts     # Mock NewRelic
├── types/              # Tipos TypeScript
├── config/             # Configuraciones
├── queues/             # Bull Queue setup y workers
└── tests/              # Tests
```

#### Endpoints a Implementar
1. **GET /api/portfolio/:userId** - Obtener portfolio del usuario
2. **GET /api/instruments/search?q={query}** - Buscar activos
3. **POST /api/orders** - Enviar orden al mercado
4. **GET /api/orders/:userId** - Historial de órdenes (nice to have)
5. **PUT /api/orders/:orderId/cancel** - Cancelar orden (nice to have)

### 🔄 Sistema de Procesamiento de Órdenes

#### Tu Propuesta de Cola es EXCELENTE porque:
- **Resiliencia**: Las órdenes no se pierden si hay fallos
- **Escalabilidad**: Permite procesar múltiples órdenes concurrentemente
- **Auditabilidad**: Trazabilidad completa del proceso
- **Separación de responsabilidades**: API recibe, cola procesa

#### Implementación Sugerida
- **Bull Queue** (Redis-based) para manejo de colas
- **Workers** separados para procesar órdenes
- **Dead Letter Queue** para órdenes fallidas
- **Métricas** de cola en DataDog mock

### 📊 Consideraciones de Negocio

#### Entidades TypeORM (Basadas en Schema Existente)
```typescript
// User entity - tabla users
// Instrument entity - tabla instruments  
// Order entity - tabla orders
// MarketData entity - tabla marketdata
```

#### Tablas Existentes en Neon DB:
- **users**: id, email, accountnumber
- **instruments**: id, ticker, name, type  
- **orders**: id, instrumentid, userid, side, size, price, type, status, datetime
- **marketdata**: id, instrumentid, high, low, open, close, previousclose, date

#### Decisión: Trabajar con Schema Actual
- ✅ **Funcionalidad completa**: Soporta todos los requerimientos
- ✅ **Sin modificaciones a BD**: Enfoque en lógica de aplicación
- ✅ **Queries eficientes**: Optimizar en código, no en estructura
- ✅ **Mejoras documentadas**: Para futuras iteraciones (carpeta research/)

#### Estados de Órdenes
```
NEW → FILLED (éxito)
NEW → REJECTED (validación fallida)
NEW → CANCELLED (cancelación manual)
```

#### Validaciones Críticas
- **Compra**: Usuario tiene pesos suficientes
- **Venta**: Usuario tiene acciones suficientes
- **Precio**: LIMIT orders requieren precio, MARKET no

#### Cálculos Importantes
- **Portfolio Value**: Suma de posiciones + cash disponible
- **Position Value**: quantity * current_price
- **Performance**: ((current_value - invested_amount) / invested_amount) * 100

### 🛠️ Herramientas de Desarrollo

#### Mocks Profesionales
1. **DataDog Mock**
   ```typescript
   // Métricas de negocio a trackear:
   - orders_submitted_total
   - orders_filled_total
   - orders_rejected_total
   - portfolio_value_changes
   - api_response_times
   ```

2. **NewRelic Mock**
   ```typescript
   // APM simulado:
   - Transaction tracing
   - Error tracking
   - Performance metrics
   ```

#### Pre-commit Configuration
- **ESLint**: Validación de código
- **Prettier**: Formateo automático
- **TypeScript**: Verificación de tipos
- **Tests**: Ejecutar tests afectados

### 🧪 Estrategia de Testing

#### Test Funcional Requerido
- **Envío de Órdenes**: Casos de éxito y error
- **Validaciones**: Fondos insuficientes, datos inválidos
- **Estados**: Transiciones correctas de estado

#### Tests Adicionales (Para destacar)
- **Integration Tests**: API endpoints completos
- **Unit Tests**: Servicios y utils
- **Performance Tests**: Carga de órdenes

### 📋 Plan de Implementación

#### Fase 0: Inicialización del Proyecto
1. **npm init** - Configurar package.json inicial
2. **Estructura de carpetas** base del proyecto
3. **Git init** - Inicializar repositorio local
4. **GitHub repo** - Crear repositorio remoto y conectar
5. **.gitignore** - Configurar archivos a excluir (node_modules, .env, research/)

#### Fase 1: Setup Base y Herramientas
1. **Dependencias core** - TypeScript, Express, TypeORM
2. **Configuración TypeScript** - tsconfig.json estricto
3. **Setup TypeORM** - DataSource y conexión a Neon
4. **Herramientas de calidad** - ESLint + Prettier + Husky
5. **Scripts básicos** - build, dev, lint, test

#### Fase 2: Entidades y Core Features
1. **Entidades TypeORM** - User, Order, Instrument, MarketData
2. **Logger centralizado** - Winston con estructura JSON
3. **Endpoints básicos** - Health check y estructura base
4. **Validaciones DTO** - class-validator para requests
5. **Error handling** - Global error handler

#### Fase 3: Endpoints Principales y Cola
1. **Endpoints de trading** - Portfolio, Instruments search, Orders
2. **Lógica de negocio** - Cálculos de portfolio y validaciones
3. **Bull Queue setup** - Redis y workers para órdenes
4. **Tests funcionales** - Como mínimo test de envío de órdenes

#### Fase 4: Professional Features
1. **Mocks de DataDog/NewRelic** - Observabilidad empresarial
2. **HTTP Client wrapper** - Axios con interceptors y métricas
3. **Métricas avanzadas** - Business metrics y performance
4. **Tests comprehensivos** - Unit, integration y performance tests

#### Fase 5: Documentation & Final Touches
1. **README detallado** con setup instructions
2. **Postman collection** export
3. **Performance testing** con Artillery/k6
4. **Code coverage** reports

### 🚀 Puntos Diferenciadores

#### Lo que te hará destacar:
- **Sistema de colas** para órdenes (muy pro)
- **Observabilidad completa** con mocks realistas
- **Docker setup** para demo sin fricción
- **Swagger UI interactivo** con ejemplos en vivo
- **Rate limiting** y security features
- **Configuración enterprise** con múltiples ambientes
- **Código production-ready** con herramientas profesionales
- **Tests comprehensivos** más allá del mínimo requerido
- **Health checks** y métricas de sistema

### 🤔 Decisiones de Diseño a Documentar

1. **¿Por qué Bull Queue?** - Resiliencia y escalabilidad para órdenes
2. **¿Por qué Docker?** - Setup consistente y demo sin fricción
3. **¿Por qué mocks en lugar de servicios reales?** - Demo profesional sin costos
4. **¿Estructura de logs?** - JSON estructurado para análisis y agregación
5. **¿Manejo de errores?** - Global error handler + custom exceptions
6. **¿Validaciones?** - DTO classes con class-validator
7. **¿Rate limiting?** - Protección contra abuso y comportamiento production-like
8. **¿Health checks?** - Monitoring y observabilidad del sistema

### � **Containerización y Deployment**
- **Docker + Docker Compose**: Setup zero-friction para development
- **Multi-stage builds**: Optimización para producción
- **Redis container**: Para Bull Queue
- **PostgreSQL local**: Para desarrollo offline (opcional)

### 📋 **Documentación Interactiva**
- **Swagger UI**: Auto-generada desde decorators
- **Postman Collection**: Export automático desde Swagger
- **API Examples**: Casos de uso completos con responses

### 🛡️ **Production Features**
- **Rate Limiting**: Express-rate-limit para prevenir abuso
- **Health Checks**: Endpoints para monitoring (/health, /metrics)
- **Configuración por Ambiente**: Variables ENV para dev/test/prod
- **Graceful Shutdown**: Manejo correcto de señales SIGTERM

---

## 🎯 Próximos Pasos

1. **Validar** esta arquitectura contigo
2. **Afinar** detalles específicos
3. **Comenzar** con el setup base
4. **Iterar** feature por feature

¿Qué te parece esta propuesta? ¿Algún ajuste o adición que quieras hacer antes de empezar a codear?
